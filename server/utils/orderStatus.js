const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed', 'COD Pending', 'Refunded'];

// Forward-only workflow. Delivered and Cancelled are final.
const TRANSITIONS = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'],
  Delivered: [],
  Cancelled: [],
};

/**
 * Returns null when the move is allowed, otherwise a human-readable reason.
 * Online orders cannot be confirmed before the payment is verified.
 */
function checkTransition(order, next) {
  if (!ORDER_STATUSES.includes(next)) return 'Unknown order status';
  if (!TRANSITIONS[order.status].includes(next)) {
    return `Cannot change an order from ${order.status} to ${next}`;
  }
  if (order.paymentMethod === 'RAZORPAY' && order.paymentStatus !== 'Paid' && next !== 'Cancelled') {
    return 'This online order has not been paid yet';
  }
  return null;
}

module.exports = { ORDER_STATUSES, PAYMENT_STATUSES, TRANSITIONS, checkTransition };
