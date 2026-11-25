const express = require('express');
const { schemas, validate } = require('../utils/validators');
const { authenticate, optionalAuth, requireAdmin, requireVerifiedEmail } = require('../middleware/auth');
const { authLimiter, otpLimiter, contactLimiter, paymentLimiter } = require('../middleware/rateLimiters');

const auth = require('../controllers/authController');
const account = require('../controllers/accountController');
const products = require('../controllers/productController');
const orders = require('../controllers/orderController');
const payments = require('../controllers/paymentController');
const site = require('../controllers/siteController');
const admin = require('../controllers/adminController');
const cart = require('../controllers/cartController');
const multer = require('multer');
const uploadController = require('../controllers/uploadController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype));
  },
});

const router = express.Router();

router.get('/health', (_req, res) => res.json({ success: true, status: 'ok' }));
router.get('/csrf-token', auth.csrfToken);

// ---- Authentication ----
router.post('/auth/register', authLimiter, validate(schemas.register), auth.register);
router.post('/auth/verify-otp', otpLimiter, validate(schemas.verifyOtp), auth.verifyOtp);
router.post('/auth/resend-otp', otpLimiter, validate(schemas.emailOnly), auth.resendOtp);
router.post('/auth/login', authLimiter, validate(schemas.login), auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', authenticate, auth.me);
router.post('/auth/forgot-password', authLimiter, validate(schemas.emailOnly), auth.forgotPassword);
router.post('/auth/reset-password', authLimiter, validate(schemas.resetPassword), auth.resetPassword);

// ---- Customer account ----
router.put('/account/profile', authenticate, validate(schemas.updateProfile), account.updateProfile);
router.put('/account/password', authenticate, authLimiter, validate(schemas.changePassword), account.changePassword);
router.get('/account/addresses', authenticate, account.listAddresses);
router.post('/account/addresses', authenticate, validate(schemas.address), account.createAddress);
router.put('/account/addresses/:id', authenticate, validate(schemas.address), account.updateAddress);
router.delete('/account/addresses/:id', authenticate, account.deleteAddress);

// ---- Customer cart ----
router.get('/cart', authenticate, cart.getCart);
router.put('/cart', authenticate, validate(schemas.cart), cart.saveCart);

// ---- Products ----
router.get('/products', optionalAuth, products.list);
router.get('/products/:id', optionalAuth, products.getOne);
router.post('/products', authenticate, requireAdmin, validate(schemas.product), products.create);
router.put('/products/:id', authenticate, requireAdmin, validate(schemas.product), products.update);
router.delete('/products/:id', authenticate, requireAdmin, products.remove);

// ---- Orders (customer) ----
router.post('/orders', authenticate, requireVerifiedEmail, validate(schemas.createOrder), orders.create);
router.get('/orders/my-orders', authenticate, orders.myOrders);
router.get('/orders/:id', authenticate, orders.getOne);

// ---- Payments (the webhook is mounted separately in app.js, before JSON parsing) ----
router.post('/payments/create-order', authenticate, requireVerifiedEmail, paymentLimiter, validate(schemas.paymentOrder), payments.createPaymentOrder);
router.post('/payments/verify', authenticate, requireVerifiedEmail, paymentLimiter, validate(schemas.paymentVerify), payments.verifyPayment);

// ---- Public site content & contact ----
router.get('/content', site.getContent);
router.post('/contact', contactLimiter, validate(schemas.contact), site.submitContact);

// ---- Admin ----
const adminRouter = express.Router();
adminRouter.use(authenticate, requireAdmin);
adminRouter.get('/dashboard', admin.dashboard);
adminRouter.get('/images', products.imageLibrary);
adminRouter.post('/uploads/image', upload.single('image'), uploadController.uploadImage);
adminRouter.get('/orders', admin.listOrders);
adminRouter.get('/orders/:id', admin.getOrder);
adminRouter.patch('/orders/:id/status', validate(schemas.orderStatus), admin.updateOrderStatus);
adminRouter.patch('/orders/:id/cod-collected', admin.confirmCodCollected);
adminRouter.post('/orders/:id/refund', admin.refundOrder);
adminRouter.get('/customers', admin.listCustomers);
adminRouter.get('/customers/:id', admin.getCustomer);
adminRouter.patch('/customers/:id/active', admin.setCustomerActive);
adminRouter.get('/contact', admin.listMessages);
adminRouter.patch('/contact/:id/resolve', admin.resolveMessage);
adminRouter.put('/content', validate(schemas.content), site.updateContent);
adminRouter.get('/settings', site.getSettings);
adminRouter.put('/settings', validate(schemas.settings), site.updateSettings);
router.use('/admin', adminRouter);

module.exports = router;
