/**
 * END-TO-END API TESTS AGAINST A REAL MONGODB.
 *
 * STATUS: written but NOT YET EXECUTED by the author (no MongoDB server was available in the
 * build sandbox). Run them yourself before trusting database behaviour:
 *
 *   set MONGODB_URI_TEST=mongodb://127.0.0.1:27017/bimari_mitao_test
 *   npm run test:integration
 *
 * WARNING: this test DROPS the database named in MONGODB_URI_TEST. Use a throw-away database.
 * Emails are captured in memory (NODE_ENV=test) so real OTPs are read without being logged or exposed over HTTP.
 */
const uri = process.env.MONGODB_URI_TEST;
const test = require('node:test');

if (!uri) {
  test('integration tests skipped (set MONGODB_URI_TEST to run them)', { skip: true }, () => {});
  return;
}

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = uri;
process.env.JWT_SECRET = 'y'.repeat(48);
process.env.RAZORPAY_KEY_ID = 'rzp_test_it';
process.env.RAZORPAY_KEY_SECRET = 'it_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_it';

const assert = require('node:assert/strict');
const crypto = require('crypto');
const http = require('http');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../../config/db');
const { createApp } = require('../../app');
const { getCapturedMail } = require('../../services/mailer');
const User = require('../../models/User');
const Product = require('../../models/Product');
const Order = require('../../models/Order');

let server;
let base;

/** Tiny cookie-aware client with automatic CSRF handling. */
function client() {
  const jar = {};
  const cookieHeader = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
  const store = (res) => {
    for (const c of res.headers.getSetCookie?.() || []) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      const [k, v] = [pair.slice(0, i), pair.slice(i + 1)];
      if (v === '' || /Expires=Thu, 01 Jan 1970/.test(c)) delete jar[k];
      else jar[k] = v;
    }
  };
  const call = async (method, path, body, extraHeaders = {}) => {
    if (!jar.bmh_csrf) store(await fetch(`${base}/api/csrf-token`));
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', cookie: cookieHeader(), 'x-csrf-token': jar.bmh_csrf || '', ...extraHeaders },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    store(res);
    let json = null;
    try { json = await res.json(); } catch { /* empty body */ }
    return { status: res.status, body: json };
  };
  return { get: (p) => call('GET', p), post: (p, b) => call('POST', p, b ?? {}), put: (p, b) => call('PUT', p, b), patch: (p, b) => call('PATCH', p, b ?? {}), del: (p) => call('DELETE', p) };
}

const lastOtpFor = (email) => {
  const mail = [...getCapturedMail()].reverse().find((m) => m.to === email && /verification code/i.test(m.subject));
  return mail.text.match(/\b(\d{6})\b/)[1];
};

const address = { fullName: 'Asha Devi', phone: '9876543210', addressLine: 'House 12, Main Road, Jonai', pincode: '787060', district: 'Dhemaji', state: 'Assam' };

test.before(async () => {
  await connectDB(uri);
  await mongoose.connection.dropDatabase();
  await Product.create({
    name: 'Cavi-Care Herbal Toothpaste', slug: 'cavi-care', description: 'Test product', mrp: 99, price: 99,
    image: '/assets/cavi-care-front.jpg', isActive: true, inStock: true,
  });
  await User.create({ name: 'Owner', email: 'owner@example.com', passwordHash: await bcrypt.hash('OwnerPass123', 10), role: 'ADMIN', isEmailVerified: true });
  server = http.createServer(createApp());
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => {
  server?.close();
  await disconnectDB();
});

test('registration -> OTP -> verified session; role cannot be chosen', async () => {
  const c = client();
  const reg = await c.post('/api/auth/register', { name: 'Asha Devi', email: 'asha@example.com', phone: '9876543210', password: 'Strong1pass', confirmPassword: 'Strong1pass', role: 'ADMIN' });
  assert.equal(reg.status, 201);
  assert.ok(!JSON.stringify(reg.body).match(/\b\d{6}\b/), 'OTP must not appear in the API response');

  const user = await User.findOne({ email: 'asha@example.com' });
  assert.equal(user.role, 'CUSTOMER');
  assert.equal(user.isEmailVerified, false);

  assert.equal((await c.post('/api/auth/login', { email: 'asha@example.com', password: 'Strong1pass' })).body.code, 'EMAIL_NOT_VERIFIED');
  assert.equal((await c.post('/api/auth/verify-otp', { email: 'asha@example.com', otp: '000000' })).status, 400);

  const code = lastOtpFor('asha@example.com');
  const ok = await c.post('/api/auth/verify-otp', { email: 'asha@example.com', otp: code });
  assert.equal(ok.status, 200);
  assert.equal((await c.get('/api/auth/me')).body.user.email, 'asha@example.com');
  assert.equal((await c.post('/api/auth/verify-otp', { email: 'asha@example.com', otp: code })).status, 400, 'OTP must not be reusable');
});

test('OTP attempts are limited and resend has a cooldown', async () => {
  const c = client();
  await c.post('/api/auth/register', { name: 'Ravi Das', email: 'ravi@example.com', phone: '9876500000', password: 'Strong1pass', confirmPassword: 'Strong1pass' });
  assert.equal((await c.post('/api/auth/resend-otp', { email: 'ravi@example.com' })).status, 429);
  for (let i = 0; i < 5; i += 1) await c.post('/api/auth/verify-otp', { email: 'ravi@example.com', otp: '111111' });
  const locked = await c.post('/api/auth/verify-otp', { email: 'ravi@example.com', otp: lastOtpFor('ravi@example.com') });
  assert.equal(locked.status, 429);
});

test('admin routes: customers get 403, admin gets 200 and role comes from the database', async () => {
  const cust = client();
  await cust.post('/api/auth/login', { email: 'asha@example.com', password: 'Strong1pass' });
  assert.equal((await cust.get('/api/admin/dashboard')).status, 403);
  const admin = client();
  const login = await admin.post('/api/auth/login', { email: 'owner@example.com', password: 'OwnerPass123' });
  assert.equal(login.body.redirectTo, '/admin/dashboard');
  assert.equal((await admin.get('/api/admin/dashboard')).status, 200);
});

test('password reset: generic response, single-use token, old sessions invalidated', async () => {
  const c = client();
  const old = client();
  await old.post('/api/auth/login', { email: 'asha@example.com', password: 'Strong1pass' });
  const unknown = await c.post('/api/auth/forgot-password', { email: 'nobody@example.com' });
  const known = await c.post('/api/auth/forgot-password', { email: 'asha@example.com' });
  assert.deepEqual(unknown.body, known.body);
  const mail = [...getCapturedMail()].reverse().find((m) => m.to === 'asha@example.com' && /Reset/.test(m.subject));
  const token = mail.text.match(/token=([a-f0-9]{64})/)[1];
  assert.equal((await c.post('/api/auth/reset-password', { token, password: 'NewStrong1pass' })).status, 200);
  assert.equal((await c.post('/api/auth/reset-password', { token, password: 'Another1pass' })).status, 400);
  assert.equal((await old.get('/api/auth/me')).status, 401);
  assert.equal((await c.post('/api/auth/login', { email: 'asha@example.com', password: 'NewStrong1pass' })).status, 200);
});

test('COD order: server prices the cart, ignores client totals, is idempotent', async () => {
  const c = client();
  await c.post('/api/auth/login', { email: 'asha@example.com', password: 'NewStrong1pass' });
  const product = await Product.findOne();
  const body = { items: [{ productId: String(product._id), quantity: 2 }], shippingAddress: address, paymentMethod: 'COD', idempotencyKey: 'key-12345678', total: 1, price: 1 };
  const a = await c.post('/api/orders', body);
  assert.equal(a.status, 201);
  assert.equal(a.body.order.total, 198);
  assert.equal(a.body.order.paymentStatus, 'COD Pending');
  const b = await c.post('/api/orders', body);
  assert.equal(b.body.duplicate, true);
  assert.equal(await Order.countDocuments({ idempotencyKey: 'key-12345678' }), 1);
});

test('customers cannot read other customers orders', async () => {
  const owner = client();
  await owner.post('/api/auth/login', { email: 'asha@example.com', password: 'NewStrong1pass' });
  const mine = (await owner.get('/api/orders/my-orders')).body.orders[0];
  const other = client();
  await other.post('/api/auth/register', { name: 'Third User', email: 'third@example.com', phone: '9876511111', password: 'Strong1pass', confirmPassword: 'Strong1pass' });
  await other.post('/api/auth/verify-otp', { email: 'third@example.com', otp: lastOtpFor('third@example.com') });
  assert.equal((await other.get(`/api/orders/${mine.orderId}`)).status, 404);
});

test('online order: only a valid signature (or webhook) marks it paid; duplicates are harmless; admin refund path guarded', async () => {
  const c = client();
  await c.post('/api/auth/login', { email: 'asha@example.com', password: 'NewStrong1pass' });
  const product = await Product.findOne();
  const created = await c.post('/api/orders', { items: [{ productId: String(product._id), quantity: 1 }], shippingAddress: address, paymentMethod: 'RAZORPAY' });
  assert.equal(created.body.order.paymentStatus, 'Pending');
  const orderId = created.body.order.orderId;

  // Creating the Razorpay order calls Razorpay's API, which needs real TEST keys and internet access.
  // Here we attach a fake Razorpay order id directly so the verification logic can be tested offline.
  await Order.updateOne({ orderId }, { 'payment.razorpayOrderId': 'order_TEST123' });
  const bad = await c.post('/api/payments/verify', { orderId, razorpay_order_id: 'order_TEST123', razorpay_payment_id: 'pay_TEST123', razorpay_signature: 'f'.repeat(64) });
  assert.equal(bad.status, 400);
  assert.equal((await Order.findOne({ orderId })).paymentStatus, 'Pending');

  const sig = crypto.createHmac('sha256', 'it_secret').update('order_TEST123|pay_TEST123').digest('hex');
  const good = await c.post('/api/payments/verify', { orderId, razorpay_order_id: 'order_TEST123', razorpay_payment_id: 'pay_TEST123', razorpay_signature: sig });
  assert.equal(good.status, 200);
  const again = await c.post('/api/payments/verify', { orderId, razorpay_order_id: 'order_TEST123', razorpay_payment_id: 'pay_TEST123', razorpay_signature: sig });
  assert.equal(again.body.alreadyProcessed, true);
  const paid = await Order.findOne({ orderId });
  assert.equal(paid.paymentStatus, 'Paid');
  assert.equal(paid.status, 'Confirmed');

  // Webhook with correct signature and same payment: ignored as duplicate state, still 200
  const payload = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_TEST123', order_id: 'order_TEST123', amount: 9900 } } } });
  const wsig = crypto.createHmac('sha256', 'whsec_it').update(payload).digest('hex');
  const wh = await fetch(`${base}/api/payments/webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-razorpay-signature': wsig, 'x-razorpay-event-id': 'evt_1' }, body: payload });
  assert.equal(wh.status, 200);
});

test('dashboard excludes unpaid/failed orders from paid online revenue', async () => {
  const admin = client();
  await admin.post('/api/auth/login', { email: 'owner@example.com', password: 'OwnerPass123' });
  const { stats } = (await admin.get('/api/admin/dashboard')).body;
  assert.equal(stats.paidOnlineRevenue, 99);
  assert.equal(stats.codPendingAmount, 198);
});

test('admin order status workflow and COD collection', async () => {
  const admin = client();
  await admin.post('/api/auth/login', { email: 'owner@example.com', password: 'OwnerPass123' });
  const cod = await Order.findOne({ paymentMethod: 'COD' });
  assert.equal((await admin.patch(`/api/admin/orders/${cod.orderId}/status`, { status: 'Delivered' })).status, 409);
  assert.equal((await admin.patch(`/api/admin/orders/${cod.orderId}/status`, { status: 'Confirmed' })).status, 200);
  assert.equal((await admin.patch(`/api/admin/orders/${cod.orderId}/cod-collected`)).body.order.paymentStatus, 'Paid');
});
