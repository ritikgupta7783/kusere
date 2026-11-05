const logger = require('../utils/logger');
const config = require('../config/env');

const notFound = (req, res) =>
  res.status(404).json({ success: false, code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  if (err.name === 'CastError') return res.status(400).json({ success: false, code: 'BAD_ID', message: 'Invalid identifier' });
  if (err.code === 11000) return res.status(409).json({ success: false, code: 'DUPLICATE', message: 'That record already exists' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ success: false, code: 'BAD_JSON', message: 'Malformed request body' });

  const status = err.status || 500;
  if (status >= 500) logger.error(`${req.method} ${req.originalUrl} -> ${err.message}`, config.isProd ? undefined : { stack: err.stack });
  res.status(status).json({
    success: false,
    code: err.code || (status >= 500 ? 'SERVER_ERROR' : 'ERROR'),
    message: status >= 500 && config.isProd ? 'Something went wrong. Please try again.' : err.message,
    ...(err.details ? { fields: err.details } : {}),
  });
};

module.exports = { notFound, errorHandler };
