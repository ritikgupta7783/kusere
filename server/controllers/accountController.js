const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Address = require('../models/Address');
const { ApiError, asyncHandler } = require('../utils/apiError');
const { setAuthCookie } = require('../utils/authCookies');
const { BCRYPT_ROUNDS } = require('./authController');

const updateProfile = asyncHandler(async (req, res) => {
  req.user.name = req.body.name;
  req.user.phone = req.body.phone;
  await req.user.save();
  res.json({ success: true, user: req.user.toPublic() });
});

const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) {
    throw new ApiError(400, 'Current password is incorrect', 'WRONG_PASSWORD');
  }
  user.passwordHash = await bcrypt.hash(req.body.newPassword, BCRYPT_ROUNDS);
  user.tokenVersion += 1; // other devices are signed out
  await user.save();
  setAuthCookie(res, user); // keep this device signed in
  res.json({ success: true, message: 'Password changed' });
});

const listAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
  res.json({ success: true, addresses });
});

const clearOtherDefaults = (userId, exceptId) =>
  Address.updateMany({ user: userId, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }, { isDefault: false });

const createAddress = asyncHandler(async (req, res) => {
  const count = await Address.countDocuments({ user: req.user._id });
  if (count >= 10) throw new ApiError(400, 'You can save up to 10 addresses', 'ADDRESS_LIMIT');
  const isDefault = req.body.isDefault || count === 0;
  const address = await Address.create({ ...req.body, isDefault, user: req.user._id });
  if (isDefault) await clearOtherDefaults(req.user._id, address._id);
  res.status(201).json({ success: true, address });
});

const updateAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user._id }); // ownership check
  if (!address) throw new ApiError(404, 'Address not found', 'NOT_FOUND');
  Object.assign(address, req.body);
  await address.save();
  if (address.isDefault) await clearOtherDefaults(req.user._id, address._id);
  res.json({ success: true, address });
});

const deleteAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!address) throw new ApiError(404, 'Address not found', 'NOT_FOUND');
  if (address.isDefault) {
    const next = await Address.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    if (next) await Address.updateOne({ _id: next._id }, { isDefault: true });
  }
  res.json({ success: true });
});

module.exports = { updateProfile, changePassword, listAddresses, createAddress, updateAddress, deleteAddress };
