const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');
const { ApiError, asyncHandler } = require('../utils/apiError');
const { AUTH_COOKIE } = require('../utils/authCookies');

/** Loads req.user from the HTTP-only cookie. The role always comes from MongoDB, never from the token. */
const authenticate = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) throw new ApiError(401, 'Please sign in to continue', 'UNAUTHENTICATED');
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new ApiError(401, 'Your session has expired. Please sign in again.', 'UNAUTHENTICATED');
  }
  const user = await User.findById(payload.sub);
  if (!user || user.tokenVersion !== payload.tv) {
    throw new ApiError(401, 'Your session is no longer valid. Please sign in again.', 'UNAUTHENTICATED');
  }
  if (!user.isActive) throw new ApiError(403, 'This account has been deactivated', 'ACCOUNT_DEACTIVATED');
  req.user = user;
  next();
});

/** Like authenticate, but anonymous visitors simply continue without req.user. */
const optionalAuth = (req, res, next) => {
  if (!req.cookies?.[AUTH_COOKIE]) return next();
  return authenticate(req, res, (err) => next(err && err.status >= 500 ? err : undefined));
};

const requireAdmin =(req, _res, next) =>
  req.user?.role === 'ADMIN' ? next() : next(new ApiError(403, 'Admin access required', 'FORBIDDEN'));

const requireVerifiedEmail = (req, _res, next) =>
  req.user?.isEmailVerified ? next() : next(new ApiError(403, 'Please verify your email first', 'EMAIL_NOT_VERIFIED'));

module.exports = { authenticate, optionalAuth, requireAdmin, requireVerifiedEmail };
