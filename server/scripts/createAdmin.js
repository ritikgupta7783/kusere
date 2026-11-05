/**
 * Creates the initial ADMIN account from ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD in server/.env.
 * Safe to run more than once: it never creates a duplicate and never overwrites an existing account.
 * Run:  npm run create-admin   (from the server folder)
 */
const bcrypt = require('bcryptjs');
const config = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');

async function run() {
  const { name, email, password } = config.admin;
  if (!name || !email || !password) {
    throw new Error('Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in server/.env first');
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('ADMIN_EMAIL is not a valid email address');
  if (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    throw new Error('ADMIN_PASSWORD must be at least 10 characters with upper-case, lower-case and a number');
  }

  await connectDB();
  const normalised = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalised });
  if (existing) {
    console.log(
      existing.role === 'ADMIN'
        ? `Admin ${normalised} already exists. Nothing changed.`
        : `A CUSTOMER account already uses ${normalised}. Choose a different ADMIN_EMAIL; nothing changed.`
    );
    return;
  }
  const adminCount = await User.countDocuments({ role: 'ADMIN' });
  await User.create({
    name: name.trim(),
    email: normalised,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'ADMIN',
    isEmailVerified: true,
    emailVerifiedAt: new Date(),
  });
  console.log(`Admin created: ${normalised}${adminCount ? ` (there are now ${adminCount + 1} admins)` : ''}`);
  console.log('Sign in at /login. Remove ADMIN_PASSWORD from .env afterwards if you wish.');
}

run()
  .catch((e) => {
    console.error('createAdmin failed:', e.message);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
