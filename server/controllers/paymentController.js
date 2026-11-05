const Order = require('../models/Order');
const config = require('../config/env');
const logger = require('../utils/logger');
const { ApiError, asyncHandler } = require('../utils/apiError');
const { toPaise } = require('../utils/pricing');
const rz = require('../services/razorpayService');
const { markPaid } = require('../services/orderService');

/** Creates (or reuses) the Razorpay order for one of the caller's own unpaid online orders. */
const createPaymentOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderId: req.body.orderId, user: req.user._id });
  if (!order) throw new ApiError(404, 'Order not found', 'NOT_FOUND');
  if (order.paymentMethod !== 'RAZORPAY') throw new ApiError(400, 'This order is not an online-payment order', 'NOT_ONLINE');
  if (order.paymentStatus === 'Paid') throw new ApiError(409, 'This order is already paid', 'ALREADY_PAID');
  if (order.status === 'Cancelled') throw new ApiError(409, 'This order was cancelled', 'ORDER_CANCELLED');

  let razorpayOrderId = order.payment.razorpayOrderId;
  if (!razorpayOrderId) {
    // Amount comes from the stored order (computed from MongoDB prices), never from the request.
    const rzOrder = await rz.createRazorpayOrder({
      amountPaise: toPaise(order.total),
      receipt: order.orderId,
      notes: { orderId: order.orderId },
    });
    const saved = await Order.findOneAndUpdate(
      { _id: order._id, 'payment.razorpayOrderId': { $exists: false } },
      { $set: { 'payment.razorpayOrderId': rzOrder.id } },
      { new: true }
    );
    razorpayOrderId = saved ? rzOrder.id : (await Order.findById(order._id)).payment.razorpayOrderId;
  }

  res.json({
    success: true,
    keyId: config.razorpay.keyId, // public key id only
    razorpayOrderId,
    amount: toPaise(order.total),
    currency: 'INR',
    orderId: order.orderId,
    prefill: { name: order.shippingAddress.fullName, email: order.shippingAddress.email, contact: order.shippingAddress.phone },
  });
});

/** Browser callback: trusted only after the HMAC signature is verified on the server. */
const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, razorpay_order_id: rzOrderId, razorpay_payment_id: rzPaymentId, razorpay_signature: signature } = req.body;
  const order = await Order.findOne({ orderId, user: req.user._id });
  if (!order) throw new ApiError(404, 'Order not found', 'NOT_FOUND');
  if (!order.payment.razorpayOrderId || order.payment.razorpayOrderId !== rzOrderId) {
    throw new ApiError(400, 'Payment does not match this order', 'PAYMENT_MISMATCH');
  }
  if (!rz.verifyPaymentSignature({ orderId: rzOrderId, paymentId: rzPaymentId, signature })) {
    throw new ApiError(400, 'Payment verification failed', 'SIGNATURE_INVALID');
  }
  const { order: updated, changed } = await markPaid({ _id: order._id }, { paymentId: rzPaymentId });
  res.json({ success: true, alreadyProcessed: !changed, order: updated });
});

/** Razorpay webhook. Mounted with express.raw so the signature is checked against the exact bytes sent. */
const webhook = asyncHandler(async (req, res) => {
  const signature = req.get('x-razorpay-signature');
  const raw = req.body; // Buffer
  if (!config.razorpay.webhookSecret) {
    logger.warn('Razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is not configured');
    return res.status(503).json({ success: false, message: 'Webhook not configured' });
  }
  if (!Buffer.isBuffer(raw) || !rz.verifyWebhookSignature(raw, signature)) {
    return res.status(400).json({ success: false, message: 'Invalid signature' });
  }
  const event = JSON.parse(raw.toString('utf8'));
  const eventId = req.get('x-razorpay-event-id');
  const payment = event.payload?.payment?.entity;
  const rzOrderId = payment?.order_id || event.payload?.order?.entity?.id;
  if (!rzOrderId) return res.json({ success: true, ignored: true });

  const order = await Order.findOne({ 'payment.razorpayOrderId': rzOrderId });
  if (!order) return res.json({ success: true, ignored: true });
  if (eventId && order.payment.processedEventIds.includes(eventId)) return res.json({ success: true, duplicate: true });

  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    // Defence in depth: the captured amount must match what we charged.
    if (payment && payment.amount !== toPaise(order.total)) {
      logger.error(`Webhook amount mismatch for ${order.orderId}`);
      return res.json({ success: true, ignored: 'amount_mismatch' });
    }
    await markPaid({ _id: order._id }, { paymentId: payment?.id, eventId });
  } else if (event.event === 'payment.failed') {
    await Order.updateOne(
      { _id: order._id, paymentStatus: 'Pending' },
      { $set: { paymentStatus: 'Failed', 'payment.failureReason': payment?.error_description || 'Payment failed' }, $addToSet: { 'payment.processedEventIds': eventId } }
    );
  }
  res.json({ success: true });
});

module.exports = { createPaymentOrder, verifyPayment, webhook };
