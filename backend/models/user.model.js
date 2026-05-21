'use strict';

/**
 * models/user.model.js
 * Raw SQL queries for the users table.
 * No business logic — only data access functions.
 * All queries respect soft deletes (WHERE deleted_at IS NULL).
 */

const db = require('../services/db.service');

/**
 * Find a user by their UUID primary key.
 * Excludes soft-deleted users.
 */
const findById = async (id) => {
  const { rows } = await db.query(
    `SELECT id, full_name, email, profile_image_url, status,
            is_email_verified, last_sign_in_at, created_at, updated_at
     FROM users
     WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return rows[0] || null;
};

/**
 * Find a user by email address (case-insensitive via lower()).
 * Includes password_hash for auth comparisons.
 * Excludes soft-deleted users.
 */
const findByEmail = async (email) => {
  const { rows } = await db.query(
    `SELECT id, full_name, email, password_hash, profile_image_url,
            status, is_email_verified, last_sign_in_at, created_at, updated_at
     FROM users
     WHERE lower(email) = lower($1) AND deleted_at IS NULL`,
    [email]
  );
  return rows[0] || null;
};

/**
 * Create a new user record.
 * @param {{ full_name, email, password_hash?, profile_image_url?, status?, is_email_verified? }} data
 */
const create = async (data) => {
  const {
    full_name,
    email,
    password_hash = null,
    profile_image_url = null,
    status = 'pending_verification',
    is_email_verified = false,
  } = data;

  const { rows } = await db.query(
    `INSERT INTO users (full_name, email, password_hash, profile_image_url, status, is_email_verified)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, full_name, email, profile_image_url, status, is_email_verified, created_at, updated_at`,
    [full_name, email, password_hash, profile_image_url, status, is_email_verified]
  );
  return rows[0];
};

/**
 * Update allowed fields on a user by ID.
 * Only updates fields present in the data object.
 */
const updateById = async (id, data) => {
  const allowed = [
    'full_name',
    'email',
    'password_hash',
    'profile_image_url',
    'status',
    'is_email_verified',
    'last_sign_in_at',
  ];

  const fields = Object.keys(data).filter((k) => allowed.includes(k));
  if (fields.length === 0) return null;

  const setClauses = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map((f) => data[f]);

  const { rows } = await db.query(
    `UPDATE users
     SET ${setClauses}, updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id, full_name, email, profile_image_url, status, is_email_verified, updated_at`,
    [id, ...values]
  );
  return rows[0] || null;
};

/**
 * Soft-delete a user by setting deleted_at to NOW().
 */
const softDeleteById = async (id) => {
  const { rows } = await db.query(
    `UPDATE users
     SET deleted_at = NOW(), status = 'deactivated', updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [id]
  );
  return rows[0] || null;
};

/**
 * Paginated list of all non-deleted users.
 * Supports optional filters: status, search (name/email).
 */
const findAllPaginated = async (limit, offset, filters = {}) => {
  const conditions = ['deleted_at IS NULL'];
  const values = [];
  let i = 1;

  if (filters.status) {
    conditions.push(`status = $${i++}`);
    values.push(filters.status);
  }

  if (filters.search) {
    conditions.push(`(lower(full_name) LIKE $${i} OR lower(email) LIKE $${i})`);
    values.push(`%${filters.search.toLowerCase()}%`);
    i++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [dataResult, countResult] = await Promise.all([
    db.query(
      `SELECT id, full_name, email, profile_image_url, status, is_email_verified, created_at
       FROM users
       ${where}
       ORDER BY created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...values, limit, offset]
    ),
    db.query(
      `SELECT COUNT(*) AS total FROM users ${where}`,
      values
    ),
  ]);

  return {
    rows: dataResult.rows,
    total: parseInt(countResult.rows[0].total, 10),
  };
};

module.exports = {
  findById,
  findByEmail,
  create,
  updateById,
  softDeleteById,
  findAllPaginated,
};
