'use strict';

/**
 * services/auth.service.js
 * Authentication business logic:
 *  - JWT token pair generation and verification
 *  - Password hashing and comparison
 *  - OAuth find-or-create user flow
 *
 * All multi-table operations run inside transactions via db.service.withTransaction().
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../configs/env');
const db = require('./db.service');
const UserModel = require('../models/user.model');
const OAuthAccountModel = require('../models/oauthAccount.model');

// ============================================================
// JWT helpers
// ============================================================

/**
 * Sign a new access token (short-lived).
 * @param {string} userId
 * @returns {string} Signed JWT
 */
const signAccessToken = (userId) =>
  jwt.sign({ sub: userId, type: 'access' }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  });

/**
 * Sign a new refresh token (long-lived).
 * @param {string} userId
 * @returns {string} Signed JWT
 */
const signRefreshToken = (userId) =>
  jwt.sign({ sub: userId, type: 'refresh' }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });

/**
 * Generate an access + refresh token pair for a user.
 * @param {string} userId
 * @returns {{ accessToken: string, refreshToken: string }}
 */
const generateTokenPair = (userId) => ({
  accessToken: signAccessToken(userId),
  refreshToken: signRefreshToken(userId),
});

/**
 * Verify and decode an access token.
 * Throws JsonWebTokenError or TokenExpiredError on failure.
 * @param {string} token
 * @returns {{ sub: string, type: 'access', iat: number, exp: number }}
 */
const verifyAccessToken = (token) => {
  const decoded = jwt.verify(token, env.jwt.accessSecret);
  if (decoded.type !== 'access') throw new Error('Invalid token type');
  return decoded;
};

/**
 * Verify and decode a refresh token.
 * Throws JsonWebTokenError or TokenExpiredError on failure.
 * @param {string} token
 * @returns {{ sub: string, type: 'refresh', iat: number, exp: number }}
 */
const verifyRefreshToken = (token) => {
  const decoded = jwt.verify(token, env.jwt.refreshSecret);
  if (decoded.type !== 'refresh') throw new Error('Invalid token type');
  return decoded;
};

// ============================================================
// Password helpers
// ============================================================

/**
 * Hash a plain-text password using bcrypt.
 * @param {string} plain
 * @returns {Promise<string>}
 */
const hashPassword = (plain) => bcrypt.hash(plain, env.bcrypt.saltRounds);

/**
 * Compare a plain-text password with a stored hash.
 * @param {string} plain
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

// ============================================================
// OAuth find-or-create
// ============================================================

/**
 * Find or create a user from an OAuth profile.
 * Runs in a transaction:
 *  1. Look up the OAuth account by provider + providerAccountId
 *  2a. If found → return the linked user
 *  2b. If not found → check if user exists by email
 *      - If email user exists → link new OAuth account to them
 *      - Otherwise → create new user + new OAuth account
 *
 * @param {{
 *   provider: string,
 *   providerAccountId: string,
 *   email: string,
 *   fullName: string,
 *   profileImageUrl: string,
 *   accessToken: string,
 *   refreshToken: string
 * }} profile
 * @returns {Promise<{ id: string, full_name: string, email: string }>}
 */
const findOrCreateOAuthUser = async (profile) => {
  const {
    provider,
    providerAccountId,
    email,
    fullName,
    profileImageUrl,
    accessToken,
    refreshToken,
  } = profile;

  return db.withTransaction(async (client) => {
    // Step 1: check for existing OAuth account
    const existingOAuth = await OAuthAccountModel.findByProvider(provider, providerAccountId);

    if (existingOAuth) {
      // Already linked — just return the user
      const user = await UserModel.findById(existingOAuth.user_id);
      return user;
    }

    // Step 2: check for existing user by email
    let user = email ? await UserModel.findByEmail(email) : null;

    if (!user) {
      // Create new user (OAuth users skip email verification)
      const { rows: newUserRows } = await client.query(
        `INSERT INTO users (full_name, email, profile_image_url, status, is_email_verified)
         VALUES ($1, $2, $3, 'active', TRUE)
         RETURNING id, full_name, email, profile_image_url, status, is_email_verified`,
        [fullName, email, profileImageUrl || null]
      );
      user = newUserRows[0];
    }

    // Create the OAuth account linkage
    await client.query(
      `INSERT INTO oauth_accounts (user_id, provider, provider_account_id, access_token, refresh_token)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (provider, provider_account_id) DO NOTHING`,
      [user.id, provider, providerAccountId, accessToken || null, refreshToken || null]
    );

    return user;
  });
};

module.exports = {
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  hashPassword,
  comparePassword,
  findOrCreateOAuthUser,
};
