'use strict';

/**
 * controllers/auth.controller.js
 * Auth domain request handling.
 */

const authService = require('../services/auth.service');
const emailService = require('../services/email.service');
const UserModel = require('../models/user.model');
const EmailVerificationTokenModel = require('../models/emailVerificationToken.model');
const PasswordResetTokenModel = require('../models/passwordResetToken.model');
const db = require('../services/db.service');
const { generateToken } = require('../utils/generateCode');
const { hoursFromNow, daysFromNow } = require('../utils/dateUtils');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { full_name, email, password } = req.body;

  if (!full_name || !email || !password) {
    throw new ApiError(400, 'Full name, email, and password are required');
  }

  // Check if user exists
  const existingUser = await UserModel.findByEmail(email);
  if (existingUser) {
    throw new ApiError(409, 'Email is already registered');
  }

  const passwordHash = await authService.hashPassword(password);

  const result = await db.withTransaction(async (client) => {
    // 1. Create user
    const { rows: userRows } = await client.query(
      `INSERT INTO users (full_name, email, password_hash, status, is_email_verified)
       VALUES ($1, $2, $3, 'pending_verification', FALSE)
       RETURNING id, full_name, email, status`,
      [full_name, email, passwordHash]
    );
    const user = userRows[0];

    // 2. Create verification token
    const tokenStr = generateToken();
    await client.query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokenStr, daysFromNow(1)]
    );

    return { user, tokenStr };
  });

  // 3. Send email asynchronously
  emailService.sendVerificationEmail(result.user.email, result.tokenStr).catch(err => {
    console.error('[email] Failed to send verification email:', err);
  });

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please check your email to verify your account.',
    user: result.user,
  });
});

/**
 * GET /auth/verify-email
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) throw new ApiError(400, 'Token is required');

  const tokenRecord = await EmailVerificationTokenModel.findByToken(token);
  if (!tokenRecord) throw new ApiError(400, 'Invalid or expired token');
  if (tokenRecord.verified_at) throw new ApiError(400, 'Token has already been used');
  if (new Date(tokenRecord.expires_at) < new Date()) throw new ApiError(400, 'Token has expired');

  await db.withTransaction(async (client) => {
    await client.query(
      `UPDATE email_verification_tokens SET verified_at = NOW() WHERE id = $1`,
      [tokenRecord.id]
    );
    await client.query(
      `UPDATE users SET is_email_verified = TRUE, status = 'active', updated_at = NOW() WHERE id = $1`,
      [tokenRecord.user_id]
    );
  });

  res.status(200).json({
    success: true,
    message: 'Email verified successfully',
  });
});

/**
 * POST /auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await UserModel.findByEmail(email);
  if (!user || !user.password_hash) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isMatch = await authService.comparePassword(password, user.password_hash);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.status !== 'active') {
    throw new ApiError(403, `Account is ${user.status.replace('_', ' ')}`);
  }

  // Update last_sign_in_at
  await UserModel.updateById(user.id, { last_sign_in_at: new Date().toISOString() });

  const tokens = authService.generateTokenPair(user.id);

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        profile_image_url: user.profile_image_url,
      },
      ...tokens,
    },
  });
});

/**
 * POST /auth/refresh
 */
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new ApiError(400, 'Refresh token is required');

  try {
    const decoded = authService.verifyRefreshToken(refreshToken);
    const user = await UserModel.findById(decoded.sub);
    if (!user || user.status !== 'active') {
      throw new ApiError(401, 'User not active or not found');
    }

    const tokens = authService.generateTokenPair(user.id);

    res.status(200).json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
});

/**
 * POST /auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  // Stateless JWT flow: client deletes token on their side.
  // We just return success.
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * POST /auth/forgot-password
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Email is required');

  const user = await UserModel.findByEmail(email);
  if (!user) {
    // Return success to prevent email enumeration
    return res.status(200).json({
      success: true,
      message: 'If the email exists, a password reset link has been sent.',
    });
  }

  const tokenStr = generateToken();
  await PasswordResetTokenModel.create({
    user_id: user.id,
    token: tokenStr,
    expires_at: hoursFromNow(1),
  });

  emailService.sendPasswordResetEmail(user.email, tokenStr).catch(err => {
    console.error('[email] Failed to send reset email:', err);
  });

  res.status(200).json({
    success: true,
    message: 'If the email exists, a password reset link has been sent.',
  });
});

/**
 * POST /auth/reset-password
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password) {
    throw new ApiError(400, 'Token and new_password are required');
  }

  const tokenRecord = await PasswordResetTokenModel.findByToken(token);
  if (!tokenRecord) throw new ApiError(400, 'Invalid or expired token');
  if (tokenRecord.used_at) throw new ApiError(400, 'Token has already been used');
  if (new Date(tokenRecord.expires_at) < new Date()) throw new ApiError(400, 'Token has expired');

  const passwordHash = await authService.hashPassword(new_password);

  await db.withTransaction(async (client) => {
    await client.query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
      [tokenRecord.id]
    );
    await client.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [passwordHash, tokenRecord.user_id]
    );
  });

  res.status(200).json({
    success: true,
    message: 'Password has been reset successfully',
  });
});

module.exports = {
  register,
  verifyEmail,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
};
