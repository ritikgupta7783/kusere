const bcrypt = require('bcryptjs');
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const config = require('../config/env');
const { ApiError, asyncHandler } = require('../utils/apiError');
const { setAuthCookie, clearAuthCookie, issueCsrfCookie } = require('../utils/authCookies');
const { generateToken, sha256, maskEmail } = require('../utils/security');
const { issueOtp, consumeOtp } = require('../services/otpService');
const { sendResetEmail, isEmailAvailable } = require('../services/mailer');

const BCRYPT_ROUNDS = 12;
const RESET_TTL_MS = 30 * 60 * 1000;
// Used to equalise response time when the email does not exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const csrfToken = (_req, res) => res.json({ success: true, csrfToken: issueCsrfCookie(res) });

/** Registration always creates a CUSTOMER. The role is never read from the request body. */
const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!isEmailAvailable()) {
    throw new ApiError(503, 'Email verification is not set up on the server yet, so accounts cannot be created.', 'EMAIL_NOT_CONFIGURED');
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  let user = await User.findOne({ email });
  if (user && user.isEmailVerified) {
    throw new ApiError(409, 'An account with this email already exists. Please sign in.', 'EMAIL_EXISTS');
  }
  if (user) {
    // Unverified earlier attempt: let the person correct their details and get a fresh code.
    Object.assign(user, { name, phone, passwordHash, role: 'CUSTOMER' });
    await user.save();
  } else {
    user = await User.create({ name, email, phone, passwordHash, role: 'CUSTOMER' });
  }

  const sent = await issueOtp(user);
  res.status(201).json({ success: true, message: 'Verification code sent', email: maskEmail(email), ...sent });
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  if (!user || user.isEmailVerified) {
    throw new ApiError(400, 'This code is not valid. Request a new one.', 'OTP_INVALID');
  }
  await consumeOtp(user, otp);
  user.isEmailVerified = true;
  user.emailVerifiedAt = new Date();
  user.lastLoginAt = new Date();
  await user.save();
  setAuthCookie(res, user);
  issueCsrfCookie(res);
  res.json({ success: true, message: 'Email verified', user: user.toPublic() });
});

const resendOtp = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  let extra = {};
  if (user && !user.isEmailVerified && user.isActive) extra = await issueOtp(user);
  // Same response whether or not the account exists.
  res.json({ success: true, message: 'If that email is waiting for verification, a new code has been sent.', email: maskEmail(req.body.email), resendAfter: 60, ...extra });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  if (!user.isActive) throw new ApiError(403, 'This account has been deactivated. Please contact support.', 'ACCOUNT_DEACTIVATED');
  if (!user.isEmailVerified) {
    throw new ApiError(403, 'Please verify your email to continue', 'EMAIL_NOT_VERIFIED', { email: maskEmail(user.email) });
  }
  user.lastLoginAt = new Date();
  await user.save();
  setAuthCookie(res, user);
  issueCsrfCookie(res);
  res.json({ success: true, user: user.toPublic(), redirectTo: user.role === 'ADMIN' ? '/admin/dashboard' : '/' });
});

const logout = (_req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Signed out' });
};

const me = (req, res) => res.json({ success: true, user: req.user.toPublic() });

const forgotPassword = asyncHandler(async (req, res) => {
  const generic = { success: true, message: 'If an account exists for that email, a reset link has been sent.' };
  const user = await User.findOne({ email: req.body.email });
  if (user && user.isActive && user.isEmailVerified) {
    if (!isEmailAvailable()) throw new ApiError(503, 'Email service is not configured on the server yet', 'EMAIL_NOT_CONFIGURED');
    const token = generateToken();
    await PasswordReset.deleteMany({ user: user._id });
    await PasswordReset.create({ user: user._id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) });
    await sendResetEmail(user.email, user.name, `${config.clientUrl}/reset-password?token=${token}`);
  }
  res.json(generic);
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const record = await PasswordReset.findOne({ tokenHash: sha256(token) });
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    throw new ApiError(400, 'This reset link is invalid or has expired. Request a new one.', 'RESET_INVALID');
  }
  // Claim the token atomically so it cannot be used twice.
  const claimed = await PasswordReset.findOneAndUpdate({ _id: record._id, usedAt: { $exists: false } }, { usedAt: new Date() });
  if (!claimed) throw new ApiError(400, 'This reset link has already been used', 'RESET_INVALID');

  const user = await User.findById(record.user);
  if (!user) throw new ApiError(400, 'This reset link is invalid', 'RESET_INVALID');
  user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  user.tokenVersion += 1; // signs the user out everywhere
  await user.save();
  await PasswordReset.deleteMany({ user: user._id });
  clearAuthCookie(res);
  res.json({ success: true, message: 'Password updated. Please sign in with your new password.' });
});

module.exports = { csrfToken, register, verifyOtp, resendOtp, login, logout, me, forgotPassword, resetPassword, BCRYPT_ROUNDS };
