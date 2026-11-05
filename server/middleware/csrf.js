const { ApiError } = require('../utils/apiError');
const { CSRF_COOKIE } = require('../utils/authCookies');
const { safeEqual } = require('../utils/security');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit-cookie CSRF protection for cookie-based auth.
 * Every state-changing request must send the X-CSRF-Token header matching the bmh_csrf cookie.
 * A cross-site attacker can make the browser send the cookie but cannot read it to set the header.
 */
module.exports = function csrfProtection(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const cookie = req.cookies?.[CSRF_COOKIE];
  const header = req.get('x-csrf-token');
  if (!cookie || !header || !safeEqual(cookie, header)) {
    return next(new ApiError(403, 'Security check failed. Refresh the page and try again.', 'CSRF_FAILED'));
  }
  next();
};
