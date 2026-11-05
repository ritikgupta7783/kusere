const mongoose = require('mongoose');

const resetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true }, // SHA-256 of the emailed token
    expiresAt: { type: Date, required: true },
    usedAt: Date,
  },
  { timestamps: true }
);

resetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('PasswordReset', resetSchema);
