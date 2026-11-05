const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, trim: true, maxlength: 30, default: '' },
    fullName: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, match: /^[6-9]\d{9}$/ },
    addressLine: { type: String, required: true, trim: true, maxlength: 250 },
    pincode: { type: String, required: true, match: /^[1-9]\d{5}$/ },
    district: { type: String, required: true, trim: true, maxlength: 60 },
    state: { type: String, required: true, trim: true, maxlength: 60 },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Address', addressSchema);
