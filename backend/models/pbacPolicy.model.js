'use strict';

/**
 * models/pbacPolicy.model.js
 * Raw SQL queries for the pbac_policies table.
 */

const db = require('../services/db.service');

const ALL_PERMISSION_COLS = [
  'users_read', 'users_write',
  'organization_read', 'organization_write',
  'members_read', 'members_invite', 'members_write', 'members_remove', 'members_change_role', 'members_assign_pbac',
  'events_read', 'events_write', 'events_update', 'events_delete', 'events_publish', 'events_lock',
  'attendance_code_read', 'attendance_code_rotate',
  'attendance_read', 'attendance_submit', 'attendance_override',
  'analytics_read'
];

/**
 * Create a new PBAC policy.
 * @param {object} data
 */
const create = async (data) => {
  const allowedFields = ['organization_id', 'policy_name', 'description', 'created_by_member_id', ...ALL_PERMISSION_COLS];
  const fields = Object.keys(data).filter(k => allowedFields.includes(k));
  
  if (fields.length === 0) throw new Error('No valid fields provided');

  const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
  const values = fields.map(f => data[f]);
  const columns = fields.join(', ');

  const { rows } = await db.query(
    `INSERT INTO pbac_policies (${columns})
     VALUES (${placeholders})
     RETURNING *`,
    values
  );
  return rows[0];
};

/**
 * Find a policy by ID.
 */
const findById = async (id) => {
  const { rows } = await db.query(`SELECT * FROM pbac_policies WHERE id = $1`, [id]);
  return rows[0] || null;
};

/**
 * Find all policies for a given organization.
 */
const findByOrganizationId = async (orgId) => {
  const { rows } = await db.query(
    `SELECT * FROM pbac_policies WHERE organization_id = $1 ORDER BY created_at DESC`,
    [orgId]
  );
  return rows;
};

/**
 * Update a policy by ID.
 */
const updateById = async (id, data) => {
  const allowedFields = ['policy_name', 'description', ...ALL_PERMISSION_COLS];
  const fields = Object.keys(data).filter(k => allowedFields.includes(k));
  
  if (fields.length === 0) return null;

  const setClauses = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => data[f]);

  const { rows } = await db.query(
    `UPDATE pbac_policies
     SET ${setClauses}, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, ...values]
  );
  return rows[0] || null;
};

/**
 * Delete a policy by ID.
 */
const deleteById = async (id) => {
  const { rows } = await db.query(
    `DELETE FROM pbac_policies WHERE id = $1 RETURNING id`,
    [id]
  );
  return rows[0] || null;
};

module.exports = {
  ALL_PERMISSION_COLS,
  create,
  findById,
  findByOrganizationId,
  updateById,
  deleteById,
};
