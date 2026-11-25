const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config/env');
const routes = require('./routes');
const csrfProtection = require('./middleware/csrf');
const { apiLimiter } = require('./middleware/rateLimiters');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const payments = require('./controllers/paymentController');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.isProd) app.set('trust proxy', 1); // correct client IPs behind a reverse proxy

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'script-src': ["'self'", 'https://checkout.razorpay.com'],
          'frame-src': ["'self'", 'https://api.razorpay.com', 'https://checkout.razorpay.com'],
          'connect-src': ["'self'", 'https://lumberjack.razorpay.com', 'https://api.razorpay.com'],
          'img-src': ["'self'", 'data:', 'https://res.cloudinary.com'],
          'upgrade-insecure-requests': config.isProd ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(cors({ origin: config.clientUrl, credentials: true }));

  // Razorpay webhook needs the raw body for signature verification, so it is registered
  // before express.json() and outside CSRF (it is authenticated by its HMAC signature instead).
  app.post('/api/payments/webhook', express.raw({ type: 'application/json', limit: '200kb' }), payments.webhook);

  app.use(express.json({ limit: '50kb' }));
  app.use(cookieParser());
  app.use('/api', apiLimiter, csrfProtection, routes);
  app.use('/api', notFound);

  // Optional: serve the built React app from this server (single-host deployment).
  const dist = path.join(__dirname, '..', 'client', 'dist');
  if (config.serveClient && fs.existsSync(dist)) {
    app.use(express.static(dist, { maxAge: '7d', index: false }));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
