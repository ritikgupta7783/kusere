const OTPVerification = require('../models/OTPVerification');
const { ApiError } = require('../utils/apiError');
const { generateOtp, hashOtp, safeEqual } = require('../utils/security');
const { sendOtpEmail } = require('./mailer');

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_SENDS_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;
const HOUR = 60 * 60 * 1000;

/** Creates (or replaces) the user's OTP and emails it. Enforces the 60s cooldown and 5/hour cap. */
async function issueOtp(user) {
  const now = Date.now();
  const existing = await OTPVerification.findOne({ user: user._id });

  let sendCount = 1;
  let sendWindowStart = new Date(now);
  if (existing) {
    const wait = RESEND_COOLDOWN_MS - (now - existing.lastSentAt.getTime());
    if (wait > 0) {
      throw new ApiError(429, `Please wait ${Math.ceil(wait / 1000)} seconds before requesting another code`, 'OTP_COOLDOWN', { retryAfter: Math.ceil(wait / 1000) });
    }
    if (now - existing.sendWindowStart.getTime() < HOUR) {
      if (existing.sendCount >= MAX_SENDS_PER_HOUR) {
        throw new ApiError(429, 'Too many codes requested. Please try again in an hour.', 'OTP_LIMIT');
      }
      sendCount = existing.sendCount + 1;
      sendWindowStart = existing.sendWindowStart;
    }
  }

  const otp = generateOtp();
  // Email first: if delivery fails the previous state is untouched and nothing was consumed.
  await sendOtpEmail(user.email, user.name, otp);
  await OTPVerification.findOneAndUpdate(
    { user: user._id },
    {
      user: user._id,
      email: user.email,
      otpHash: hashOtp(user.email, otp),
      expiresAt: new Date(now + OTP_TTL_MS),
      attempts: 0,
      lastSentAt: new Date(now),
      sendCount,
      sendWindowStart,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return { expiresIn: OTP_TTL_MS / 1000, resendAfter: RESEND_COOLDOWN_MS / 1000 };
}

/** Verifies and consumes an OTP. A correct code is deleted so it can never be reused. */
async function consumeOtp(user, code) {
  const record = await OTPVerification.findOne({ user: user._id });
  if (!record || record.expiresAt.getTime() < Date.now()) {
    throw new ApiError(400, 'This code has expired. Request a new one.', 'OTP_EXPIRED');
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    throw new ApiError(429, 'Too many incorrect attempts. Request a new code.', 'OTP_ATTEMPTS');
  }
  const ok = safeEqual(record.otpHash, hashOtp(user.email, code));
  if (!ok) {
    await OTPVerification.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
    const left = MAX_ATTEMPTS - record.attempts - 1;
    throw new ApiError(400, left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Incorrect code. Request a new one.', 'OTP_INVALID');
  }
  // Atomic delete guards against two simultaneous requests using the same code.
  const deleted = await OTPVerification.findOneAndDelete({ _id: record._id });
  if (!deleted) throw new ApiError(400, 'This code has already been used', 'OTP_USED');
}

module.exports = { issueOtp, consumeOtp, OTP_TTL_MS, RESEND_COOLDOWN_MS, MAX_ATTEMPTS };
