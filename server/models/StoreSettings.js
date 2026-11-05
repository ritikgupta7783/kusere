const mongoose = require('mongoose');

// Defaults come from the supplied product label / brief. Delivery charge defaults to 0
// because no delivery pricing was provided - the owner sets it in Admin > Settings.
const storeSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    storeName: { type: String, default: 'Bimari Mitao Herbs' },
    phone: { type: String, default: '+91 6002928927' },
    email: { type: String, default: 'bimarimitaoherbs@gmail.com' },
    address: {
      type: String,
      default: 'Santipur, P.O. Lalmekuri, P.S. Jonai, District Dhemaji, Assam - 787060',
    },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    freeDeliveryAbove: { type: Number, default: null, min: 0 },
    codEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

storeSettingsSchema.statics.getSingleton = async function getSingleton() {
  return this.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { new: true, upsert: true });
};

module.exports = mongoose.model('StoreSettings', storeSettingsSchema);
