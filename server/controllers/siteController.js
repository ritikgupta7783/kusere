const WebsiteContent = require('../models/WebsiteContent');
const StoreSettings = require('../models/StoreSettings');
const ContactMessage = require('../models/ContactMessage');
const config = require('../config/env');
const { asyncHandler } = require('../utils/apiError');
const { isAllowedImage } = require('../config/imageCatalog');
const { ApiError } = require('../utils/apiError');

const publicSettings = (s) => ({
  storeName: s.storeName,
  phone: s.phone,
  email: s.email,
  address: s.address,
  deliveryCharge: s.deliveryCharge,
  freeDeliveryAbove: s.freeDeliveryAbove,
  codEnabled: s.codEnabled,
  onlinePaymentsAvailable: config.razorpayConfigured,
});

const getContent = asyncHandler(async (_req, res) => {
  const [content, settings] = await Promise.all([WebsiteContent.getSingleton(), StoreSettings.getSingleton()]);
  res.json({ success: true, content, settings: publicSettings(settings) });
});

const updateContent = asyncHandler(async (req, res) => {
  if (!isAllowedImage(req.body.heroImage) || !isAllowedImage(req.body.promoImage)) {
    throw new ApiError(400, 'Choose images from the image library', 'IMAGE_NOT_ALLOWED');
  }
  const content = await WebsiteContent.findOneAndUpdate({ key: 'main' }, { $set: req.body }, { new: true, upsert: true });
  res.json({ success: true, content });
});

const getSettings = asyncHandler(async (_req, res) => {
  res.json({ success: true, settings: await StoreSettings.getSingleton() });
});

const updateSettings = asyncHandler(async (req, res) => {
  const set = { ...req.body, freeDeliveryAbove: req.body.freeDeliveryAbove ?? null };
  const settings = await StoreSettings.findOneAndUpdate({ key: 'main' }, { $set: set }, { new: true, upsert: true });
  res.json({ success: true, settings });
});

const submitContact = asyncHandler(async (req, res) => {
  await ContactMessage.create(req.body);
  res.status(201).json({ success: true, message: 'Thank you! Your message has been received.' });
});

module.exports = { getContent, updateContent, getSettings, updateSettings, submitContact };
