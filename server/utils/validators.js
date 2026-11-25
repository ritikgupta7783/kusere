const { z } = require('zod');
const { ApiError } = require('./apiError');

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(120);
const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, ''))
  .refine((v) => /^[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit Indian mobile number');
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-z]/, 'Password needs a lowercase letter')
  .regex(/[A-Z]/, 'Password needs an uppercase letter')
  .regex(/\d/, 'Password needs a number');
const name = z.string().trim().min(2, 'Enter your full name').max(80);
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const pincode = z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code');
const text = (max, min = 0) => z.string().trim().min(min).max(max);

const schemas = {
  register: z
    .object({ name, email, phone, password, confirmPassword: z.string() })
    .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' }),
  verifyOtp: z.object({ email, otp: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code') }),
  emailOnly: z.object({ email }),
  login: z.object({ email, password: z.string().min(1).max(72) }),
  resetPassword: z.object({ token: z.string().length(64), password }),
  updateProfile: z.object({ name, phone }),
  changePassword: z.object({ currentPassword: z.string().min(1).max(72), newPassword: password }),
  address: z.object({
    label: text(30).optional().default(''),
    fullName: name,
    phone,
    addressLine: text(250, 8),
    pincode,
    district: text(60, 2),
    state: text(60, 2),
    isDefault: z.boolean().optional().default(false),
  }),
  contact: z.object({ name, email, phone, message: text(2000, 5) }),
  createOrder: z.object({
    items: z.array(z.object({ productId: objectId, quantity: z.number().int().min(1).max(20) })).min(1).max(20),
    shippingAddress: z.object({
      fullName: name,
      phone,
      addressLine: text(250, 8),
      pincode,
      district: text(60, 2),
      state: text(60, 2),
    }),
    deliveryInstructions: text(300).optional().default(''),
    paymentMethod: z.enum(['RAZORPAY', 'COD']),
    idempotencyKey: z.string().min(8).max(80).optional(),
  }),
  cart: z.object({
    items: z.array(z.object({
      productId: objectId.transform((id) => id.toLowerCase()),
      quantity: z.number().int().min(1).max(20),
    })).max(20),
  }).superRefine(({ items }, ctx) => {
    const ids = new Set();
    items.forEach((item, index) => {
      if (ids.has(item.productId)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['items', index, 'productId'], message: 'A product may only appear once in the cart' });
      }
      ids.add(item.productId);
    });
  }),
  paymentOrder: z.object({ orderId: z.string().min(6).max(40) }),
  paymentVerify: z.object({
    orderId: z.string().min(6).max(40),
    razorpay_order_id: z.string().min(5).max(60),
    razorpay_payment_id: z.string().min(5).max(60),
    razorpay_signature: z.string().min(10).max(200),
  }),
  orderStatus: z.object({ status: z.string(), note: text(300).optional() }),
  product: z.object({
    name: text(120, 2),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/).max(80).optional(),
    category: text(80).optional().default('Ayurvedic Proprietary Medicine'),
    shortDescription: text(300).optional().default(''),
    description: text(3000, 5),
    mrp: z.number().min(0).max(1000000),
    price: z.number().min(0).max(1000000),
    netWeight: text(30).optional().default(''),
    targetAge: text(40).optional().default(''),
    ingredientsNote: text(100).optional().default(''),
    ingredients: z.array(z.object({ name: text(80, 1), percentage: z.number().min(0).max(100), description: text(300).optional().default('') })).max(30).default([]),
    benefits: z.array(text(200, 1)).max(20).default([]),
    usage: z.array(text(300, 1)).max(15).default([]),
    specifications: z.array(z.object({ label: text(60, 1), value: text(300, 1) })).max(20).default([]),
    image: z.string(),
    gallery: z.array(z.string()).max(8).default([]),
    inStock: z.boolean().default(true),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
  }),
  settings: z.object({
    storeName: text(80, 2),
    phone: text(30, 5),
    email,
    address: text(300, 5),
    deliveryCharge: z.number().min(0).max(5000),
    freeDeliveryAbove: z.number().min(0).max(1000000).nullable().optional(),
    codEnabled: z.boolean(),
  }),
  content: z.object({
    heroHeading: text(160, 2),
    heroDescription: text(500, 2),
    heroImage: z.string(),
    promoBanner: text(200),
    promoImage: z.string(),
    aboutIntro: text(1500, 2),
    mission: text(800, 2),
    vision: text(800, 2),
    philosophy: text(1500, 2),
    footerTagline: text(240),
    footerNote: text(400),
    contactIntro: text(400),
  }),
};

/** Express middleware: validate and replace req[source] with the parsed (trimmed/normalised) value. */
const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const fields = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      if (!fields[key]) fields[key] = issue.message;
    }
    return next(new ApiError(400, Object.values(fields)[0] || 'Invalid input', 'VALIDATION_ERROR', fields));
  }
  req[source] = result.data;
  next();
};

module.exports = { schemas, validate, objectId };
