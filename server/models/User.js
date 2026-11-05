const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    phone: { type: String, trim: true, match: /^[6-9]\d{9}$/ },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['CUSTOMER', 'ADMIN'], default: 'CUSTOMER', index: true },
    isEmailVerified: { type: Boolean, default: false },
    emailVerifiedAt: Date,
    isActive: { type: Boolean, default: true },
    // Bumped on password change/reset; JWTs carrying an older value are rejected.
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

userSchema.index({ name: 'text', email: 'text' });
userSchema.index({ createdAt: -1 });

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    isEmailVerified: this.isEmailVerified,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
