'use strict';

/**
 * models/organization.model.js
 * Raw SQL queries for the organizations table.
 */

const db = require('../services/db.service');

/**
 * Create a new organization.
 * Note: This does not create the member record. The controller should
 * use db.withTransaction to insert both the org and the root admin member.
 *
 * @param {{ name, description, join_code, created_by_user_id, is_active? }} data
 * @param {object} [client] - Optional pg client for transactions
 */
const create = async (data, client = null) => {
  const { name, description = null, join_code, created_by_user_id, is_active = true } = data;
  const query = `
    INSERT INTO organizations (name, description, join_code, created_by_user_id, is_active)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, name, description, join_code, created_by_user_id, is_active, created_at, updated_at
  `;
  const values = [name, description, join_code, created_by_user_id, is_active];

  const executor = client || db;
  const { rows } = await executor.query(query, values);
  return rows[0];
};

/**
 * Find an organization by its UUID.
 */
const findById = async (id) => {
  const { rows } = await db.query(
    `SELECT id, name, description, join_code, created_by_user_id, is_active, created_at, updated_at
     FROM organizations
     WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
};

/**
 * Find an organization by its unique join code.
 */
const findByJoinCode = async (code) => {
  const { rows } = await db.query(
    `SELECT id, name, description, join_code, created_by_user_id, is_active, created_at, updated_at
     FROM organizations
     WHERE join_code = $1`,
    [code]
  );
  return rows[0] || null;
};

/**
 * Update allowed fields on an organization.
 */
const updateById = async (id, data) => {
  const allowed = ['name', 'description', 'join_code', 'is_active'];
  const fields = Object.keys(data).filter((k) => allowed.includes(k));
  if (fields.length === 0) return null;

  const setClauses = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map((f) => data[f]);

  const { rows } = await db.query(
    `UPDATE organizations
     SET ${setClauses}, updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, description, join_code, created_by_user_id, is_active, updated_at`,
    [id, ...values]
  );
  return rows[0] || null;
};

/**
 * Find all organizations a specific user belongs to.
 * This joins with organization_members.
 */
const findByUserId = async (userId) => {
  const { rows } = await db.query(
    `SELECT o.id, o.name, o.description, o.join_code, o.is_active, o.created_at,
            m.role, m.status, m.is_root_admin
     FROM organizations o
     JOIN organization_members m ON o.id = m.organization_id
     WHERE m.user_id = $1 AND m.status = 'active' AND o.is_active = TRUE
     ORDER BY o.name ASC`,
    [userId]
  );
  return rows;
};

/**
 * Paginated list of all organizations (e.g. for system admin).
 */
const findAllPaginated = async (limit, offset) => {
  const [dataResult, countResult] = await Promise.all([
    db.query(
      `SELECT id, name, description, join_code, created_by_user_id, is_active, created_at
       FROM organizations
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    db.query(`SELECT COUNT(*) AS total FROM organizations`)
  ]);

  return {
    rows: dataResult.rows,
    total: parseInt(countResult.rows[0].total, 10),
  };
};

module.exports = {
  create,
  findById,
  findByJoinCode,
  updateById,
  findByUserId,
  findAllPaginated,
};
