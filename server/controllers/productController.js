const Product = require('../models/Product');
const { ApiError, asyncHandler } = require('../utils/apiError');
const { isAllowedImage, IMAGE_CATALOG } = require('../config/imageCatalog');

const isObjectId = (v) => /^[a-f\d]{24}$/i.test(v);
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function assertImages(body) {
  if (!isAllowedImage(body.image)) throw new ApiError(400, 'Choose an image from the available library', 'IMAGE_NOT_ALLOWED');
  if (body.gallery?.some((g) => !isAllowedImage(g))) throw new ApiError(400, 'Gallery images must come from the image library', 'IMAGE_NOT_ALLOWED');
  if (body.price > body.mrp) throw new ApiError(400, 'Selling price cannot be higher than MRP', 'PRICE_INVALID');
}

// Public: only active products. Admin may pass ?all=true.
const list = asyncHandler(async (req, res) => {
  const filter = req.user?.role === 'ADMIN' && req.query.all === 'true' ? {} : { isActive: true };
  const products = await Product.find(filter).sort({ isFeatured: -1, createdAt: 1 });
  res.json({ success: true, products });
});

const getOne = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findOne(isObjectId(id) ? { _id: id } : { slug: id.toLowerCase() });
  const isAdmin = req.user?.role === 'ADMIN';
  if (!product || (!product.isActive && !isAdmin)) throw new ApiError(404, 'Product not found', 'NOT_FOUND');
  res.json({ success: true, product });
});

const create = asyncHandler(async (req, res) => {
  assertImages(req.body);
  const slug = req.body.slug || slugify(req.body.name);
  const product = await Product.create({ ...req.body, slug });
  res.status(201).json({ success: true, product });
});

const update = asyncHandler(async (req, res) => {
  assertImages(req.body);
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found', 'NOT_FOUND');
  Object.assign(product, { ...req.body, slug: req.body.slug || product.slug });
  await product.save();
  res.json({ success: true, product });
});

// Soft delete: orders keep referencing the product, so it is deactivated rather than removed.
const remove = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!product) throw new ApiError(404, 'Product not found', 'NOT_FOUND');
  res.json({ success: true, message: 'Product deactivated', product });
});

const imageLibrary = (_req, res) => res.json({ success: true, images: IMAGE_CATALOG });

module.exports = { list, getOne, create, update, remove, imageLibrary };
