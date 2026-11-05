const crypto = require('crypto');
const Razorpay = require('razorpay');
const config = require('../config/env');
const { ApiError } = require('../utils/apiError');
const { safeEqual } = require('../utils/security');

let client;
const getClient = () => {
  if (!config.razorpayConfigured) {
    throw new ApiError(503, 'Online payments are not configured yet. Please choose Cash on Delivery.', 'RAZORPAY_NOT_CONFIGURED');
  }
  if (!client) client = new Razorpay({ key_id: config.razorpay.keyId, key_secret: config.razorpay.keySecret });
  return client;
};

const hmac = (secret, payload) => crypto.createHmac('sha256', secret).update(payload).digest('hex');

/** Checkout callback signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
const verifyPaymentSignature = ({ orderId, paymentId, signature }, secret = config.razorpay.keySecret) =>
  Boolean(secret && signature) && safeEqual(hmac(secret, `${orderId}|${paymentId}`), signature);

/** Webhook signature: HMAC_SHA256(raw body, webhook secret). rawBody must be the untouched Buffer/string. */
const verifyWebhookSignature = (rawBody, signature, secret = config.razorpay.webhookSecret) =>
  Boolean(secret && signature) && safeEqual(hmac(secret, rawBody), signature);

const createRazorpayOrder = async ({ amountPaise, receipt, notes }) => {
  try {
    return await getClient().orders.create({ amount: amountPaise, currency: 'INR', receipt, notes });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(502, 'Could not start the online payment. Please try again.', 'RAZORPAY_ERROR');
  }
};

const refundPayment = async (paymentId, amountPaise, notes) => {
  try {
    return await getClient().payments.refund(paymentId, { amount: amountPaise, notes });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(502, err?.error?.description || 'Razorpay could not process the refund', 'RAZORPAY_REFUND_FAILED');
  }
};

module.exports = { verifyPaymentSignature, verifyWebhookSignature, createRazorpayOrder, refundPayment };
