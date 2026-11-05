const config = require('./config/env');
const { connectDB } = require('./config/db');
const { createApp } = require('./app');
const logger = require('./utils/logger');
const { sweepStale } = require('./services/orderService');

async function main() {
  config.assertValid();
  await connectDB();
  logger.info('MongoDB connected');

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info(`API listening on http://localhost:${config.port} (${config.nodeEnv})`);
    if (!config.smtpConfigured) logger.warn('SMTP is not configured: registration OTP and password-reset emails cannot be sent');
    if (!config.razorpayConfigured) logger.warn('Razorpay keys are not set: online payment is disabled, Cash on Delivery still works');
    if (config.razorpayConfigured && !config.razorpay.webhookSecret) logger.warn('RAZORPAY_WEBHOOK_SECRET is not set: webhooks are disabled');
  });

  const sweep = () => sweepStale().catch((e) => logger.warn(`Cleanup failed: ${e.message}`));
  sweep();
  const timer = setInterval(sweep, 60 * 60 * 1000);
  timer.unref();

  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error(err.message);
  if (/ECONNREFUSED|ServerSelection|querySrv|ENOTFOUND/i.test(err.message + (err.name || ''))) {
    logger.error('Could not reach MongoDB. Check MONGODB_URI and that MongoDB is running (see README > MongoDB).');
  }
  process.exit(1);
});
