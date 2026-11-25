const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { ApiError, asyncHandler } = require('../utils/apiError');

const viewItem = (product, quantity) => ({
  productId: String(product._id),
  slug: product.slug,
  name: product.name,
  image: product.image,
  price: product.price,
  mrp: product.mrp,
  inStock: product.inStock,
  quantity,
});

const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate(
    'items.product',
    'name slug image price mrp isActive inStock'
  );
  if (!cart) return res.json({ success: true, exists: false, items: [] });

  const available = cart.items.filter((item) => item.product && item.product.isActive);
  if (available.length !== cart.items.length) {
    cart.items = available.map((item) => ({ product: item.product._id, quantity: item.quantity }));
    await cart.save();
  }
  res.json({
    success: true,
    exists: true,
    items: available.map((item) => viewItem(item.product, item.quantity)),
  });
});

const saveCart = asyncHandler(async (req, res) => {
  const { items } = req.body;
  const productIds = items.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds }, isActive: true })
    .select('name slug image price mrp inStock');
  const byId = new Map(products.map((product) => [String(product._id), product]));

  if (productIds.some((id) => !byId.has(id))) {
    throw new ApiError(409, 'A product in your cart is no longer available', 'PRODUCT_UNAVAILABLE');
  }

  const savedItems = items.map((item) => ({ product: item.productId, quantity: item.quantity }));
  const cart = await Cart.findOneAndUpdate(
    { user: req.user._id },
    { $set: { items: savedItems } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  res.json({
    success: true,
    exists: true,
    items: items.map((item) => viewItem(byId.get(item.productId), item.quantity)),
  });
});

module.exports = { getCart, saveCart };
