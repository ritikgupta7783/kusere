const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    email: { type: String, required: true, lowercase: true },
    otpHash: { type: String, required: true }, // HMAC hash, never the OTP itself
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    lastSentAt: { type: Date, required: true },
    sendCount: { type: Number, default: 1 },
    sendWindowStart: { type: Date, required: true },
  },
  { timestamps: true }
);

// MongoDB removes the document one hour after the OTP expires.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('OTPVerification', otpSchema);
