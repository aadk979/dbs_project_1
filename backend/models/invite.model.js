'use strict';

/**
 * models/invite.model.js
 * Raw SQL queries for the invites table.
 */

const db = require('../services/db.service');

/**
 * Create a new invite.
 */
const create = async (data) => {
  const { type, target_id, email, token, expires_at, invited_by_member_id, pbac_policy_id = null } = data;
  
  const { rows } = await db.query(
    `INSERT INTO invites (type, target_id, email, token, expires_at, invited_by_member_id, pbac_policy_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
     RETURNING *`,
    [type, target_id, email, token, expires_at, invited_by_member_id, pbac_policy_id]
  );
  return rows[0];
};

/**
 * Find an invite by its ID.
 */
const findById = async (id) => {
  const { rows } = await db.query(`SELECT * FROM invites WHERE id = $1`, [id]);
  return rows[0] || null;
};

/**
 * Find an invite by its token.
 */
const findByToken = async (token) => {
  const { rows } = await db.query(`SELECT * FROM invites WHERE token = $1`, [token]);
  return rows[0] || null;
};

/**
 * Find paginated invites for an organization.
 */
const findByOrg = async (orgId, limit, offset, filters = {}) => {
  const conditions = ['type = $1', 'target_id = $2'];
  const values = ['organization', orgId];
  let i = 3;

  if (filters.status) {
    conditions.push(`status = $${i++}`);
    values.push(filters.status);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [dataResult, countResult] = await Promise.all([
    db.query(
      `SELECT * FROM invites 
       ${where}
       ORDER BY created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...values, limit, offset]
    ),
    db.query(`SELECT COUNT(*) AS total FROM invites ${where}`, values),
  ]);

  return {
    rows: dataResult.rows,
    total: parseInt(countResult.rows[0].total, 10),
  };
};

/**
 * Find paginated invites for an event.
 */
const findByEvent = async (eventId, limit, offset, filters = {}) => {
  const conditions = ['type = $1', 'target_id = $2'];
  const values = ['event', eventId];
  let i = 3;

  if (filters.status) {
    conditions.push(`status = $${i++}`);
    values.push(filters.status);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [dataResult, countResult] = await Promise.all([
    db.query(
      `SELECT * FROM invites 
       ${where}
       ORDER BY created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...values, limit, offset]
    ),
    db.query(`SELECT COUNT(*) AS total FROM invites ${where}`, values),
  ]);

  return {
    rows: dataResult.rows,
    total: parseInt(countResult.rows[0].total, 10),
  };
};

/**
 * Update the status of an invite (e.g. accepted, expired).
 */
const updateStatus = async (id, status) => {
  const { rows } = await db.query(
    `UPDATE invites
     SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [status, id]
  );
  return rows[0] || null;
};

module.exports = {
  create,
  findById,
  findByToken,
  findByOrg,
  findByEvent,
  updateStatus,
};
