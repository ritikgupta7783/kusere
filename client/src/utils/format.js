const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const formatPrice = (n) => inr.format(Number(n) || 0);

export const formatDate = (d, withTime = false) =>
  new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });

export const paymentMethodLabel = (m) => (m === 'COD' ? 'Cash on Delivery' : 'Online (Razorpay)');

/** Same delivery rule as the server, for DISPLAY only. The server recalculates everything. */
export const deliveryFor = (settings, subtotal) =>
  settings && settings.freeDeliveryAbove != null && subtotal >= settings.freeDeliveryAbove ? 0 : settings?.deliveryCharge || 0;

export const ORDER_STEPS = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];
export const TRANSITIONS = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'],
  Delivered: [],
  Cancelled: [],
};

export const newKey = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`).replace(/-/g, '');
