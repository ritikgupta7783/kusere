const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');
const StoreSettings = require('../models/StoreSettings');
const { ApiError } = require('../utils/apiError');
const { calculateTotals } = require('../utils/pricing');
const logger = require('../utils/logger');
const { sendOrderEmail } = require('./mailer');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateOrderId() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Array.from(crypto.randomBytes(6), (b) => ALPHABET[b % ALPHABET.length]).join('');
  return `BMH-${date}-${rand}`;
}

const deliveryFor = (settings, subtotal) =>
  settings.freeDeliveryAbove != null && subtotal >= settings.freeDeliveryAbove ? 0 : settings.deliveryCharge;

/** Builds priced lines from MongoDB. Rejects missing, inactive or out-of-stock products. */
async function priceItems(items) {
  const merged = new Map();
  for (const it of items) merged.set(it.productId, (merged.get(it.productId) || 0) + it.quantity);
  const products = await Product.find({ _id: { $in: [...merged.keys()] } });
  const byId = new Map(products.map((p) => [String(p._id), p]));

  return [...merged.entries()].map(([id, quantity]) => {
    const p = byId.get(id);
    if (!p || !p.isActive) throw new ApiError(409, 'A product in your cart is no longer available', 'PRODUCT_UNAVAILABLE');
    if (!p.inStock) throw new ApiError(409, `${p.name} is currently out of stock`, 'OUT_OF_STOCK');
    if (quantity > 20) throw new ApiError(400, 'Maximum 20 units per product per order', 'QTY_LIMIT');
    return { product: p._id, name: p.name, image: p.image, unitPrice: p.price, quantity, lineTotal: Math.round(p.price * quantity * 100) / 100 };
  });
}

async function createOrder({ user, body }) {
  if (body.idempotencyKey) {
    const dup = await Order.findOne({ user: user._id, idempotencyKey: body.idempotencyKey });
    if (dup) return { order: dup, duplicate: true };
  }

  const settings = await StoreSettings.getSingleton();
  if (body.paymentMethod === 'COD' && !settings.codEnabled) {
    throw new ApiError(400, 'Cash on Delivery is not available right now', 'COD_DISABLED');
  }

  const lines = await priceItems(body.items);
  const base = calculateTotals(lines, 0);
  const totals = calculateTotals(lines, deliveryFor(settings, base.subtotal));

  const doc = {
    user: user._id,
    items: lines,
    shippingAddress: { ...body.shippingAddress, email: user.email }, // verified account email, not client input
    deliveryInstructions: body.deliveryInstructions,
    ...totals,
    paymentMethod: body.paymentMethod,
    paymentStatus: body.paymentMethod === 'COD' ? 'COD Pending' : 'Pending',
    status: 'Pending',
    idempotencyKey: body.idempotencyKey,
    statusHistory: [{ status: 'Pending', paymentStatus: body.paymentMethod === 'COD' ? 'COD Pending' : 'Pending', by: 'customer', note: 'Order placed' }],
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const order = await Order.create({ ...doc, orderId: generateOrderId() });
      if (order.paymentMethod === 'COD') sendConfirmation(order, 'Order received');
      return { order, duplicate: false };
    } catch (err) {
      if (err.code === 11000 && err.keyPattern?.idempotencyKey) {
        return { order: await Order.findOne({ user: user._id, idempotencyKey: body.idempotencyKey }), duplicate: true };
      }
      if (err.code === 11000 && err.keyPattern?.orderId) continue; // astronomically rare id clash
      throw err;
    }
  }
  throw new ApiError(500, 'Could not generate an order id');
}

/** Emails are a courtesy: failures are logged, never block the order. */
function sendConfirmation(order, headline) {
  sendOrderEmail(order.shippingAddress.email, order, headline).catch((e) =>
    logger.warn(`Order email skipped for ${order.orderId}: ${e.code || e.message}`)
  );
}

/**
 * Atomically moves an online order to Paid. Safe to call from both the browser
 * callback and the webhook: only the first caller changes anything.
 */
async function markPaid(filter, { paymentId, eventId }) {
  const update = {
    $set: { paymentStatus: 'Paid', 'payment.razorpayPaymentId': paymentId, 'payment.paidAt': new Date() },
    $unset: { 'payment.failureReason': '' },
  };
  if (eventId) update.$addToSet = { 'payment.processedEventIds': eventId };

  const order = await Order.findOneAndUpdate(
    { ...filter, paymentMethod: 'RAZORPAY', paymentStatus: { $in: ['Pending', 'Failed'] } },
    update,
    { new: true }
  );
  if (!order) return { order: await Order.findOne(filter), changed: false };

  if (order.status === 'Pending') {
    order.status = 'Confirmed';
    order.statusHistory.push({ status: 'Confirmed', paymentStatus: 'Paid', by: 'system', note: 'Payment verified' });
  } else {
    // Paid after the order was already cancelled (e.g. abandoned-order sweep). Admin must refund.
    order.statusHistory.push({ status: order.status, paymentStatus: 'Paid', by: 'system', note: 'Payment received on a non-pending order - refund may be required' });
  }
  await order.save();
  if (order.status === 'Confirmed') sendConfirmation(order, 'Payment received - order confirmed');
  return { order, changed: true };
}

/** Cancels unpaid online orders that were abandoned for over 24 hours, and purges stale unverified accounts. */
async function sweepStale() {
  const User = require('../models/User');
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const res = await Order.updateMany(
    { paymentMethod: 'RAZORPAY', paymentStatus: { $in: ['Pending', 'Failed'] }, status: 'Pending', createdAt: { $lt: cutoff } },
    { $set: { status: 'Cancelled', paymentStatus: 'Failed' }, $push: { statusHistory: { status: 'Cancelled', paymentStatus: 'Failed', by: 'system', note: 'Payment not completed within 24 hours' } } }
  );
  const users = await User.deleteMany({ role: 'CUSTOMER', isEmailVerified: false, createdAt: { $lt: cutoff } });
  return { cancelledOrders: res.modifiedCount, removedUnverified: users.deletedCount };
}

module.exports = { createOrder, markPaid, sendConfirmation, sweepStale, generateOrderId, deliveryFor };
