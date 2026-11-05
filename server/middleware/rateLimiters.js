const rateLimit = require('express-rate-limit');
const config = require('../config/env');

const make = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit: config.isTest ? 10000 : limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ success: false, code: 'RATE_LIMITED', message }),
  });

module.exports = {
  apiLimiter: make(15 * 60 * 1000, 600, 'Too many requests. Please try again shortly.'),
  authLimiter: make(15 * 60 * 1000, 20, 'Too many attempts. Please try again in a few minutes.'),
  otpLimiter: make(15 * 60 * 1000, 15, 'Too many verification requests. Please try again later.'),
  contactLimiter: make(60 * 60 * 1000, 10, 'Too many messages sent. Please try again later.'),
  paymentLimiter: make(15 * 60 * 1000, 60, 'Too many payment requests. Please try again shortly.'),
};
