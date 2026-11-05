const mongoose = require('mongoose');
const { ORDER_STATUSES, PAYMENT_STATUSES } = require('../utils/orderStatus');

const itemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    image: String,
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [itemSchema], validate: (v) => v.length > 0 },
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true },
      addressLine: { type: String, required: true },
      pincode: { type: String, required: true },
      district: { type: String, required: true },
      state: { type: String, required: true },
    },
    deliveryInstructions: { type: String, default: '' },
    subtotal: { type: Number, required: true },
    deliveryCharge: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['RAZORPAY', 'COD'], required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'Pending' },
    payment: {
      razorpayOrderId: { type: String, index: true, sparse: true },
      razorpayPaymentId: String,
      paidAt: Date,
      failureReason: String,
      refundId: String,
      refundedAt: Date,
      codCollectedAt: Date,
      processedEventIds: { type: [String], default: [] },
    },
    statusHistory: [
      { _id: false, status: String, paymentStatus: String, at: { type: Date, default: Date.now }, by: String, note: String },
    ],
    idempotencyKey: { type: String },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentMethod: 1, paymentStatus: 1 });
// One order per (user, idempotencyKey): protects against double submits.
orderSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
orderSchema.index({ 'shippingAddress.fullName': 'text', 'shippingAddress.email': 'text', orderId: 'text' });

module.exports = mongoose.model('Order', orderSchema);
