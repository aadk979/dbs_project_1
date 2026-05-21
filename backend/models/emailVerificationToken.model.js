'use strict';

/**
 * models/emailVerificationToken.model.js
 * Raw SQL queries for the email_verification_tokens table.
 */

const db = require('../services/db.service');

/**
 * Create a new email verification token for a user.
 * @param {{ user_id, token, expires_at }} data
 */
const create = async (data) => {
  const { user_id, token, expires_at } = data;
  const { rows } = await db.query(
    `INSERT INTO email_verification_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, token, expires_at, created_at`,
    [user_id, token, expires_at]
  );
  return rows[0];
};

/**
 * Find a token record by the token string.
 * Returns null if not found.
 */
const findByToken = async (token) => {
  const { rows } = await db.query(
    `SELECT id, user_id, token, expires_at, verified_at, created_at
     FROM email_verification_tokens
     WHERE token = $1`,
    [token]
  );
  return rows[0] || null;
};

/**
 * Mark a token as verified (set verified_at = NOW()).
 * @param {string} id - UUID of the token record
 */
const markVerified = async (id) => {
  const { rows } = await db.query(
    `UPDATE email_verification_tokens
     SET verified_at = NOW()
     WHERE id = $1 AND verified_at IS NULL
     RETURNING id, user_id, verified_at`,
    [id]
  );
  return rows[0] || null;
};

module.exports = { create, findByToken, markVerified };
