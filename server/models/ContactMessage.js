const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    isResolved: { type: Boolean, default: false, index: true },
    resolvedAt: Date,
  },
  { timestamps: true }
);

contactSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ContactMessage', contactSchema);
