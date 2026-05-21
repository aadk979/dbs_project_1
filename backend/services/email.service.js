'use strict';

/**
 * services/email.service.js
 * Nodemailer wrapper functions for transactional emails.
 * Transporter is created once on module load.
 *
 * In development, set SMTP_* to Ethereal (https://ethereal.email/) to capture
 * emails without actually sending them. In production, configure a real SMTP provider.
 */

const nodemailer = require('nodemailer');
const env = require('../configs/env');

// ---- Transporter (created once, reused) ----
const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
});

// Verify SMTP connection at startup (non-fatal — just warns)
transporter.verify((err) => {
  if (err) {
    console.warn('[email] SMTP connection verification failed:', err.message);
    console.warn('[email] Emails will not be sent until SMTP is configured correctly.');
  } else {
    console.log('[email] SMTP transporter ready');
  }
});

// ---- Base send helper ----
const sendMail = (options) =>
  transporter.sendMail({ from: env.smtp.from, ...options });

// ============================================================
// Public send functions
// ============================================================

/**
 * Send an email verification link to a newly registered user.
 * @param {string} to    - Recipient email address
 * @param {string} token - Raw verification token (not hashed)
 */
const sendVerificationEmail = async (to, token) => {
  const link = `${env.frontendUrl}/verify-email?token=${token}`;
  await sendMail({
    to,
    subject: 'Verify your email — Attendance System',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #111111;">Confirm your email address</h2>
        <p style="color: #374151;">Click the button below to activate your account. This link expires in 24 hours.</p>
        <a href="${link}"
           style="display:inline-block;background:#111111;color:#fff;padding:12px 24px;
                  border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">
          Verify Email
        </a>
        <p style="color: #6b7280; font-size: 13px;">Or copy this link: ${link}</p>
        <p style="color: #6b7280; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>`,
  });
};

/**
 * Send a password reset link.
 * @param {string} to    - Recipient email address
 * @param {string} token - Raw reset token
 */
const sendPasswordResetEmail = async (to, token) => {
  const link = `${env.frontendUrl}/reset-password?token=${token}`;
  await sendMail({
    to,
    subject: 'Reset your password — Attendance System',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #111111;">Reset your password</h2>
        <p style="color: #374151;">We received a request to reset your password. Click below — this link expires in 1 hour.</p>
        <a href="${link}"
           style="display:inline-block;background:#111111;color:#fff;padding:12px 24px;
                  border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">
          Reset Password
        </a>
        <p style="color: #6b7280; font-size: 13px;">Or copy this link: ${link}</p>
        <p style="color: #6b7280; font-size: 12px;">If you didn't request this, your account is safe — ignore this email.</p>
      </div>`,
  });
};

/**
 * Send an organization invitation email.
 * @param {string} to      - Recipient email address
 * @param {string} token   - Raw invite token
 * @param {string} orgName - Organization display name
 */
const sendOrganizationInviteEmail = async (to, token, orgName) => {
  const link = `${env.frontendUrl}/invites/accept?token=${token}`;
  await sendMail({
    to,
    subject: `You're invited to join ${orgName} — Attendance System`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #111111;">You've been invited to ${orgName}</h2>
        <p style="color: #374151;">Click the button below to accept the invitation and join the organization.</p>
        <a href="${link}"
           style="display:inline-block;background:#111111;color:#fff;padding:12px 24px;
                  border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">
          Accept Invitation
        </a>
        <p style="color: #6b7280; font-size: 13px;">Or copy this link: ${link}</p>
        <p style="color: #6b7280; font-size: 12px;">This invitation expires in 7 days.</p>
      </div>`,
  });
};

/**
 * Send an event invitation email.
 * @param {string} to         - Recipient email address
 * @param {string} token      - Raw invite token
 * @param {string} eventTitle - Event display title
 */
const sendEventInviteEmail = async (to, token, eventTitle) => {
  const link = `${env.frontendUrl}/invites/accept?token=${token}`;
  await sendMail({
    to,
    subject: `You're invited to "${eventTitle}" — Attendance System`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #111111;">You're invited to "${eventTitle}"</h2>
        <p style="color: #374151;">You've been added to the allowlist for this event. Click below to confirm.</p>
        <a href="${link}"
           style="display:inline-block;background:#111111;color:#fff;padding:12px 24px;
                  border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">
          View Event
        </a>
        <p style="color: #6b7280; font-size: 13px;">Or copy this link: ${link}</p>
        <p style="color: #6b7280; font-size: 12px;">This invitation expires in 7 days.</p>
      </div>`,
  });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrganizationInviteEmail,
  sendEventInviteEmail,
};
