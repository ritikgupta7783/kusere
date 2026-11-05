const Order = require('../models/Order');
const { ApiError, asyncHandler } = require('../utils/apiError');
const orderService = require('../services/orderService');

const create = asyncHandler(async (req, res) => {
  const { order, duplicate } = await orderService.createOrder({ user: req.user, body: req.body });
  res.status(duplicate ? 200 : 201).json({ success: true, duplicate, order });
});

const myOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, orders });
});

const getOne = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.id });
  const isOwner = order && String(order.user) === String(req.user._id);
  // Same 404 for "missing" and "someone else's" so ids cannot be probed.
  if (!order || (!isOwner && req.user.role !== 'ADMIN')) throw new ApiError(404, 'Order not found', 'NOT_FOUND');
  res.json({ success: true, order });
});

module.exports = { create, myOrders, getOne };
