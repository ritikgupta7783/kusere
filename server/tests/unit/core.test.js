process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/unused';
process.env.JWT_SECRET = 'x'.repeat(48);
process.env.RAZORPAY_KEY_ID = 'rzp_test_unit';
process.env.RAZORPAY_KEY_SECRET = 'unit_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_unit';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const http = require('http');

const { generateOtp, hashOtp, maskEmail, safeEqual } = require('../../utils/security');
const { calculateTotals, toPaise } = require('../../utils/pricing');
const { checkTransition } = require('../../utils/orderStatus');
const { schemas } = require('../../utils/validators');
const { verifyPaymentSignature, verifyWebhookSignature } = require('../../services/razorpayService');
const { isAllowedImage } = require('../../config/imageCatalog');
const { generateOrderId } = require('../../services/orderService');

test('OTP is always six digits and hashing is deterministic, salted by email', () => {
  for (let i = 0; i < 500; i += 1) assert.match(generateOtp(), /^\d{6}$/);
  assert.equal(hashOtp('a@b.com', '123456'), hashOtp('A@B.com', '123456'));
  assert.notEqual(hashOtp('a@b.com', '123456'), hashOtp('c@d.com', '123456'));
  assert.notEqual(hashOtp('a@b.com', '123456'), '123456');
});

test('email masking hides most of the local part', () => {
  assert.equal(maskEmail('ritik@example.com'), 'ri***@example.com');
  assert.ok(!maskEmail('ab@x.com').includes('b@'));
});

test('safeEqual handles different lengths without throwing', () => {
  assert.equal(safeEqual('abc', 'abcd'), false);
  assert.equal(safeEqual('abc', 'abc'), true);
});

test('totals are computed in paise to avoid float drift', () => {
  const t = calculateTotals([{ unitPrice: 99, quantity: 3 }, { unitPrice: 0.1, quantity: 3 }], 49.5);
  assert.equal(t.subtotal, 297.3);
  assert.equal(t.total, 346.8);
  assert.equal(toPaise(99), 9900);
});

test('order status transitions are forward-only and block unpaid online confirmation', () => {
  const cod = { status: 'Pending', paymentMethod: 'COD', paymentStatus: 'COD Pending' };
  assert.equal(checkTransition(cod, 'Confirmed'), null);
  assert.ok(checkTransition(cod, 'Delivered'));
  assert.ok(checkTransition({ ...cod, status: 'Delivered' }, 'Cancelled'));
  const online = { status: 'Pending', paymentMethod: 'RAZORPAY', paymentStatus: 'Pending' };
  assert.ok(checkTransition(online, 'Confirmed'));
  assert.equal(checkTransition(online, 'Cancelled'), null);
});

test('registration validation: strong password, match, phone normalisation, no role field survives', () => {
  const base = { name: 'Asha Devi', email: ' ASHA@Example.com ', phone: '+91 98765-43210', password: 'Strong1pass', confirmPassword: 'Strong1pass' };
  const ok = schemas.register.parse({ ...base, role: 'ADMIN' });
  assert.equal(ok.email, 'asha@example.com');
  assert.equal(ok.phone, '9876543210');
  assert.equal('role' in ok, false);
  assert.throws(() => schemas.register.parse({ ...base, password: 'weak', confirmPassword: 'weak' }));
  assert.throws(() => schemas.register.parse({ ...base, confirmPassword: 'Different1' }));
  assert.throws(() => schemas.register.parse({ ...base, phone: '12345' }));
});

test('razorpay checkout signature verification', () => {
  const sig = crypto.createHmac('sha256', 'unit_secret').update('order_1|pay_1').digest('hex');
  assert.equal(verifyPaymentSignature({ orderId: 'order_1', paymentId: 'pay_1', signature: sig }), true);
  assert.equal(verifyPaymentSignature({ orderId: 'order_1', paymentId: 'pay_2', signature: sig }), false);
  assert.equal(verifyPaymentSignature({ orderId: 'order_1', paymentId: 'pay_1', signature: 'bad' }), false);
});

test('razorpay webhook signature verification uses the raw body', () => {
  const body = Buffer.from('{"event":"payment.captured"}');
  const sig = crypto.createHmac('sha256', 'whsec_unit').update(body).digest('hex');
  assert.equal(verifyWebhookSignature(body, sig), true);
  assert.equal(verifyWebhookSignature(Buffer.from('{"event":"payment.captured" }'), sig), false);
});

test('only catalogue images are allowed; external URLs are rejected', () => {
  assert.equal(isAllowedImage('/assets/cavi-care-front.jpg'), true);
  assert.equal(isAllowedImage('https://evil.example/x.jpg'), false);
  assert.equal(isAllowedImage('/assets/../../etc/passwd'), false);
});

test('order ids have the expected shape and are unique', () => {
  const ids = new Set(Array.from({ length: 2000 }, generateOrderId));
  assert.equal(ids.size, 2000);
  assert.match([...ids][0], /^BMH-\d{8}-[A-Z2-9]{6}$/);
});

// ---- HTTP-level checks that never reach the database ----
const { createApp } = require('../../app');
let server;
let base;
test.before(async () => {
  server = http.createServer(createApp());
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

test('state-changing request without CSRF token is rejected', async () => {
  const res = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(res.status, 403);
  assert.equal((await res.json()).code, 'CSRF_FAILED');
});

test('csrf endpoint sets a readable cookie and the matching header passes the CSRF gate', async () => {
  const r = await fetch(`${base}/api/csrf-token`);
  const { csrfToken } = await r.json();
  assert.ok(r.headers.get('set-cookie').includes('bmh_csrf='));
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken, cookie: `bmh_csrf=${csrfToken}` },
    body: JSON.stringify({ email: 'not-an-email', password: 'x' }),
  });
  assert.equal(res.status, 400); // got past CSRF, stopped by validation
});

test('protected routes require a session', async () => {
  for (const p of ['/api/auth/me', '/api/orders/my-orders', '/api/admin/dashboard', '/api/account/addresses']) {
    const res = await fetch(base + p);
    assert.equal(res.status, 401, p);
  }
});

test('webhook rejects a bad signature before touching the database', async () => {
  const res = await fetch(`${base}/api/payments/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-razorpay-signature': 'nope' },
    body: '{"event":"payment.captured"}',
  });
  assert.equal(res.status, 400);
});

test('security headers are present', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('content-security-policy').includes('checkout.razorpay.com'));
  assert.equal(res.headers.get('x-powered-by'), null);
});
