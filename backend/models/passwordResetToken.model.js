'use strict';

/**
 * models/passwordResetToken.model.js
 * Raw SQL queries for the password_reset_tokens table.
 */

const db = require('../services/db.service');

/**
 * Create a new password reset token for a user.
 * @param {{ user_id, token, expires_at }} data
 */
const create = async (data) => {
  const { user_id, token, expires_at } = data;
  const { rows } = await db.query(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, token, expires_at, created_at`,
    [user_id, token, expires_at]
  );
  return rows[0];
};

/**
 * Find a token record by the token string.
 */
const findByToken = async (token) => {
  const { rows } = await db.query(
    `SELECT id, user_id, token, expires_at, used_at, created_at
     FROM password_reset_tokens
     WHERE token = $1`,
    [token]
  );
  return rows[0] || null;
};

/**
 * Mark a token as used (set used_at = NOW()).
 * @param {string} id - UUID of the token record
 */
const markUsed = async (id) => {
  const { rows } = await db.query(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE id = $1 AND used_at IS NULL
     RETURNING id, user_id, used_at`,
    [id]
  );
  return rows[0] || null;
};

module.exports = { create, findByToken, markUsed };
