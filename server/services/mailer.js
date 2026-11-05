const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('../utils/logger');
const { ApiError } = require('../utils/apiError');

let transporter;
const captured = []; // only filled when NODE_ENV=test; used by automated tests, never exposed over HTTP

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  }
  return transporter;
};

const isEmailAvailable = () => config.isTest || config.smtpConfigured;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const layout = (title, body) => `<!doctype html><html><body style="margin:0;background:#f6f3ea;font-family:Arial,Helvetica,sans-serif;color:#1c2b21">
<div style="max-width:520px;margin:24px auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e6e0cf">
<div style="background:#1f5e3b;color:#fff;padding:18px 24px;font-size:18px;font-weight:bold">Bimari Mitao Herbs</div>
<div style="padding:24px"><h2 style="margin:0 0 12px;font-size:20px">${escapeHtml(title)}</h2>${body}</div>
<div style="padding:14px 24px;background:#faf8f1;font-size:12px;color:#6b7a70">Santipur, P.O. Lalmekuri, P.S. Jonai, Dhemaji, Assam - 787060</div></div></body></html>`;

/**
 * Sends an email. Throws ApiError(503) if SMTP is not configured so callers
 * that depend on email (OTP, password reset) can tell the user honestly.
 * Callers where email is a courtesy (order confirmation) catch and continue.
 */
async function sendMail({ to, subject, html, text }) {
  if (config.isTest) {
    captured.push({ to, subject, html, text });
    return;
  }
  if (!config.smtpConfigured) {
    throw new ApiError(503, 'Email service is not configured on the server yet', 'EMAIL_NOT_CONFIGURED');
  }
  try {
    await getTransporter().sendMail({ from: config.smtp.from, to, subject, html, text });
  } catch (err) {
    logger.error(`Email delivery failed (${subject})`, { reason: err.code || err.message });
    throw new ApiError(502, 'We could not send the email. Please try again.', 'EMAIL_SEND_FAILED');
  }
}

const sendOtpEmail = (to, name, otp) =>
  sendMail({
    to,
    subject: 'Your Bimari Mitao Herbs verification code',
    text: `Hi ${name}, your verification code is ${otp}. It expires in 5 minutes. If you did not request it, ignore this email.`,
    html: layout(
      'Verify your email',
      `<p>Hi ${escapeHtml(name)}, use this code to verify your email address:</p>
<p style="font-size:34px;letter-spacing:8px;font-weight:bold;color:#1f5e3b;margin:16px 0">${otp}</p>
<p style="color:#6b7a70">The code expires in 5 minutes. If you did not create an account, you can ignore this email.</p>`
    ),
  });

const sendResetEmail = (to, name, link) =>
  sendMail({
    to,
    subject: 'Reset your Bimari Mitao Herbs password',
    text: `Hi ${name}, reset your password using this link (valid for 30 minutes): ${link}`,
    html: layout(
      'Reset your password',
      `<p>Hi ${escapeHtml(name)}, we received a request to reset your password.</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#1f5e3b;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none">Choose a new password</a></p>
<p style="color:#6b7a70">This link works once and expires in 30 minutes. If you did not ask for this, ignore this email.</p>`
    ),
  });

const sendOrderEmail = (to, order, headline) =>
  sendMail({
    to,
    subject: `${headline} - ${order.orderId}`,
    text: `${headline}. Order ${order.orderId}, total Rs. ${order.total}.`,
    html: layout(
      headline,
      `<p>Order <b>${escapeHtml(order.orderId)}</b></p>
<table style="width:100%;border-collapse:collapse;font-size:14px">${order.items
        .map((i) => `<tr><td style="padding:6px 0">${escapeHtml(i.name)} x ${i.quantity}</td><td style="text-align:right">Rs. ${i.lineTotal}</td></tr>`)
        .join('')}
<tr><td style="padding:6px 0;color:#6b7a70">Delivery</td><td style="text-align:right">Rs. ${order.deliveryCharge}</td></tr>
<tr><td style="padding:8px 0;border-top:1px solid #e6e0cf"><b>Total</b></td><td style="text-align:right;border-top:1px solid #e6e0cf"><b>Rs. ${order.total}</b></td></tr></table>
<p style="margin-top:14px">Payment: ${escapeHtml(order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online (Razorpay)')} - ${escapeHtml(order.paymentStatus)}</p>
<p style="color:#6b7a70">Deliver to: ${escapeHtml(order.shippingAddress.fullName)}, ${escapeHtml(order.shippingAddress.addressLine)}, ${escapeHtml(order.shippingAddress.district)}, ${escapeHtml(order.shippingAddress.state)} - ${escapeHtml(order.shippingAddress.pincode)}</p>`
    ),
  });

module.exports = { sendMail, sendOtpEmail, sendResetEmail, sendOrderEmail, isEmailAvailable, getCapturedMail: () => (config.isTest ? captured : []) };
