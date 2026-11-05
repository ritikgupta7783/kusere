const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const ContactMessage = require('../models/ContactMessage');
const { ApiError, asyncHandler } = require('../utils/apiError');
const { toPaise } = require('../utils/pricing');
const { ORDER_STATUSES, checkTransition } = require('../utils/orderStatus');
const { refundPayment } = require('../services/razorpayService');
const { sendConfirmation } = require('../services/orderService');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pageParams = (q, def = 20) => {
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || def, 1), 100);
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  return { limit, page, skip: (page - 1) * limit };
};
const sumOf = async (match) => {
  const [r] = await Order.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]);
  return { amount: r?.total || 0, count: r?.count || 0 };
};

const dashboard = asyncHandler(async (_req, res) => {
  const [totalOrders, totalProducts, totalCustomers, pendingOrders, deliveredOrders, online, codCollected, codPending, recentOrders] =
    await Promise.all([
      Order.countDocuments(),
      Product.countDocuments(),
      User.countDocuments({ role: 'CUSTOMER' }),
      Order.countDocuments({ status: 'Pending' }),
      Order.countDocuments({ status: 'Delivered' }),
      sumOf({ paymentMethod: 'RAZORPAY', paymentStatus: 'Paid' }), // Refunded/Failed/Pending are excluded
      sumOf({ paymentMethod: 'COD', paymentStatus: 'Paid' }),
      sumOf({ paymentMethod: 'COD', paymentStatus: 'COD Pending', status: { $ne: 'Cancelled' } }),
      Order.find().sort({ createdAt: -1 }).limit(8).select('orderId shippingAddress.fullName total status paymentMethod paymentStatus createdAt'),
    ]);
  res.json({
    success: true,
    stats: {
      totalOrders, totalProducts, totalCustomers, pendingOrders, deliveredOrders,
      paidOnlineRevenue: online.amount, paidOnlineOrders: online.count,
      codCollected: codCollected.amount, codCollectedOrders: codCollected.count,
      codPendingAmount: codPending.amount, codPendingOrders: codPending.count,
    },
    recentOrders,
  });
});

const listOrders = asyncHandler(async (req, res) => {
  const { limit, page, skip } = pageParams(req.query);
  const filter = {};
  if (req.query.status && ORDER_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  const q = String(req.query.q || '').trim().slice(0, 80);
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ orderId: rx }, { 'shippingAddress.fullName': rx }, { 'shippingAddress.email': rx }, { 'shippingAddress.phone': rx }];
  }
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', 'name email phone'),
    Order.countDocuments(filter),
  ]);
  res.json({ success: true, orders, total, page, pages: Math.ceil(total / limit) });
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.id }).populate('user', 'name email phone isEmailVerified');
  if (!order) throw new ApiError(404, 'Order not found', 'NOT_FOUND');
  res.json({ success: true, order });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.id });
  if (!order) throw new ApiError(404, 'Order not found', 'NOT_FOUND');
  const next = req.body.status;
  const problem = checkTransition(order, next);
  if (problem) throw new ApiError(409, problem, 'INVALID_TRANSITION');

  const from = order.status;
  order.status = next;
  order.statusHistory.push({ status: next, paymentStatus: order.paymentStatus, by: `admin:${req.user.email}`, note: req.body.note || `Status changed from ${from}` });
  await order.save();
  if (next === 'Shipped' || next === 'Delivered') sendConfirmation(order, `Your order is ${next.toLowerCase()}`);
  res.json({
    success: true,
    order,
    refundRequired: next === 'Cancelled' && order.paymentMethod === 'RAZORPAY' && order.paymentStatus === 'Paid',
  });
});

/** Admin confirms cash was handed over. Only valid for COD orders still marked COD Pending. */
const confirmCodCollected = asyncHandler(async (req, res) => {
  const order = await Order.findOneAndUpdate(
    { orderId: req.params.id, paymentMethod: 'COD', paymentStatus: 'COD Pending', status: { $ne: 'Cancelled' } },
    {
      $set: { paymentStatus: 'Paid', 'payment.codCollectedAt': new Date() },
      $push: { statusHistory: { status: 'x', paymentStatus: 'Paid', by: `admin:${req.user.email}`, note: 'Cash on delivery collected' } },
    },
    { new: true }
  );
  if (!order) throw new ApiError(409, 'This order is not a COD order awaiting collection', 'INVALID_STATE');
  order.statusHistory[order.statusHistory.length - 1].status = order.status;
  await order.save();
  res.json({ success: true, order });
});

/** Refund eligibility: online, verified paid, with a Razorpay payment id, and not yet shipped/delivered. */
const refundOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.id });
  if (!order) throw new ApiError(404, 'Order not found', 'NOT_FOUND');
  const eligible =
    order.paymentMethod === 'RAZORPAY' && order.paymentStatus === 'Paid' && order.payment.razorpayPaymentId &&
    ['Confirmed', 'Processing', 'Cancelled', 'Pending'].includes(order.status);
  if (!eligible) throw new ApiError(409, 'This order is not eligible for a refund', 'NOT_REFUNDABLE');

  const refund = await refundPayment(order.payment.razorpayPaymentId, toPaise(order.total), { orderId: order.orderId });
  // Guard against a second concurrent click: only one request flips Paid -> Refunded.
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: 'Paid' },
    {
      $set: { paymentStatus: 'Refunded', 'payment.refundId': refund.id, 'payment.refundedAt': new Date() },
      $push: { statusHistory: { status: order.status, paymentStatus: 'Refunded', by: `admin:${req.user.email}`, note: 'Refund initiated' } },
    },
    { new: true }
  );
  res.json({ success: true, order: updated || order });
});

const listCustomers = asyncHandler(async (req, res) => {
  const { limit, page, skip } = pageParams(req.query);
  const filter = { role: 'CUSTOMER' };
  const q = String(req.query.q || '').trim().slice(0, 80);
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  const [customers, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit), // passwordHash is select:false
    User.countDocuments(filter),
  ]);
  res.json({ success: true, customers, total, page, pages: Math.ceil(total / limit) });
});

const getCustomer = asyncHandler(async (req, res) => {
  const customer = await User.findOne({ _id: req.params.id, role: 'CUSTOMER' });
  if (!customer) throw new ApiError(404, 'Customer not found', 'NOT_FOUND');
  const orders = await Order.find({ user: customer._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, customer, orders });
});

const setCustomerActive = asyncHandler(async (req, res) => {
  if (typeof req.body.isActive !== 'boolean') throw new ApiError(400, 'isActive must be true or false', 'VALIDATION_ERROR');
  const customer = await User.findOne({ _id: req.params.id, role: 'CUSTOMER' }); // admins cannot be deactivated here
  if (!customer) throw new ApiError(404, 'Customer not found', 'NOT_FOUND');
  customer.isActive = req.body.isActive;
  if (!customer.isActive) customer.tokenVersion += 1; // ends active sessions immediately
  await customer.save();
  res.json({ success: true, customer });
});

const listMessages = asyncHandler(async (req, res) => {
  const { limit, page, skip } = pageParams(req.query);
  const filter = {};
  if (req.query.resolved === 'true') filter.isResolved = true;
  if (req.query.resolved === 'false') filter.isResolved = false;
  const q = String(req.query.q || '').trim().slice(0, 80);
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { message: rx }];
  }
  const [messages, total] = await Promise.all([
    ContactMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ContactMessage.countDocuments(filter),
  ]);
  res.json({ success: true, messages, total, page, pages: Math.ceil(total / limit) });
});

const resolveMessage = asyncHandler(async (req, res) => {
  const isResolved = req.body?.isResolved !== false;
  const message = await ContactMessage.findByIdAndUpdate(
    req.params.id,
    { isResolved, resolvedAt: isResolved ? new Date() : null },
    { new: true }
  );
  if (!message) throw new ApiError(404, 'Message not found', 'NOT_FOUND');
  res.json({ success: true, message });
});

module.exports = {
  dashboard, listOrders, getOrder, updateOrderStatus, confirmCodCollected, refundOrder,
  listCustomers, getCustomer, setCustomerActive, listMessages, resolveMessage,
};
