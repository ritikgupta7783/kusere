const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: String, trim: true, default: 'Ayurvedic Proprietary Medicine' },
    shortDescription: { type: String, trim: true, maxlength: 300, default: '' },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    mrp: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    netWeight: { type: String, trim: true, default: '' },
    targetAge: { type: String, trim: true, default: '' },
    ingredientsNote: { type: String, trim: true, default: '' }, // e.g. "Each 5g contains"
    ingredients: [
      {
        _id: false,
        name: { type: String, required: true, trim: true },
        percentage: { type: Number, min: 0, max: 100, required: true },
        description: { type: String, trim: true, default: '' },
      },
    ],
    benefits: [{ type: String, trim: true }],
    usage: [{ type: String, trim: true }],
    specifications: [{ _id: false, label: { type: String, trim: true }, value: { type: String, trim: true } }],
    // Bundled local path or Cloudinary HTTPS URL.
    image: { type: String, required: true },
    gallery: [{ type: String }],
    inStock: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.index({ isActive: 1, isFeatured: -1, createdAt: -1 });
productSchema.virtual('available').get(function available() {
  return this.isActive && this.inStock;
});
productSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
