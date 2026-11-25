const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/env');

const AUTH_COOKIE = 'bmh_token';
const CSRF_COOKIE = 'bmh_csrf';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

const signToken = (user) =>
  jwt.sign({ sub: String(user._id), tv: user.tokenVersion || 0 }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

const baseCookie = () => ({
  sameSite: config.isProd ? 'none' : 'lax',
  secure: config.isProd,
  path: '/',
});

const setAuthCookie = (res, user) =>
  res.cookie(AUTH_COOKIE, signToken(user), { ...baseCookie(), httpOnly: true, maxAge: SEVEN_DAYS });

const clearAuthCookie = (res) => res.clearCookie(AUTH_COOKIE, { ...baseCookie(), httpOnly: true });

const issueCsrfCookie = (res) => {
  const token = crypto.randomBytes(24).toString('hex');
  // Readable by JavaScript on purpose (double-submit pattern); it protects nothing by itself.
  res.cookie(CSRF_COOKIE, token, { ...baseCookie(), httpOnly: false, maxAge: SEVEN_DAYS });
  return token;
};

module.exports = { AUTH_COOKIE, CSRF_COOKIE, setAuthCookie, clearAuthCookie, issueCsrfCookie };
