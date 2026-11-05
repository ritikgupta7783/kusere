const crypto = require('crypto');
const config = require('../config/env');

const sha256 = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** Cryptographically secure six-digit OTP. */
const generateOtp = () => String(crypto.randomInt(100000, 1000000));

/**
 * OTPs are short, so a plain hash could be brute-forced from a leaked database.
 * HMAC with a server-side secret and the email binds the hash to this deployment.
 */
const hashOtp = (email, otp, secret = config.jwtSecret) =>
  crypto.createHmac('sha256', secret).update(`${String(email).toLowerCase()}:${otp}`).digest('hex');

const generateToken = () => crypto.randomBytes(32).toString('hex');

const maskEmail = (email) => {
  const [local, domain] = String(email).split('@');
  if (!domain) return '***';
  const visible = local.length <= 2 ? local[0] : local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 3))}@${domain}`;
};

module.exports = { sha256, safeEqual, generateOtp, hashOtp, generateToken, maskEmail };
