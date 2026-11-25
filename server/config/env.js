const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const bool = (v, d = false) => (v === undefined || v === '' ? d : String(v).toLowerCase() === 'true');

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, ''),
  serveClient: bool(process.env.SERVE_CLIENT, false),
  logDir: process.env.LOG_DIR
    ? path.resolve(process.env.LOG_DIR)
    : path.join(__dirname, '..', '..', '.local', 'logs'),
  admin: {
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: bool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'Bimari Mitao Herbs <no-reply@example.com>',
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
};

config.smtpConfigured = Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);
config.razorpayConfigured = Boolean(config.razorpay.keyId && config.razorpay.keySecret);

/** Fail fast on settings the app cannot run safely without. */
config.assertValid = () => {
  const problems = [];
  if (!config.mongoUri) problems.push('MONGODB_URI is not set');
  if (!config.jwtSecret || config.jwtSecret.length < 32) {
    problems.push('JWT_SECRET must be set and at least 32 characters long');
  }
  if (problems.length) {
    throw new Error(
      `Invalid server configuration:\n - ${problems.join('\n - ')}\nCopy server/.env.example to server/.env and fill it in.`
    );
  }
};

module.exports = config;
