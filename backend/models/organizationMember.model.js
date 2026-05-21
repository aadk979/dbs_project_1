'use strict';

/**
 * models/organizationMember.model.js
 * Raw SQL queries for the organization_members table.
 */

const db = require('../services/db.service');

/**
 * Find a member by their ID.
 */
const findById = async (id) => {
  const { rows } = await db.query(
    `SELECT id, organization_id, user_id, role, status, pbac_policy_id, 
            is_root_admin, invited_by_member_id, joined_at, created_at, updated_at
     FROM organization_members
     WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
};

/**
 * Find a member by organization ID and user ID.
 */
const findByOrgAndUser = async (orgId, userId) => {
  const { rows } = await db.query(
    `SELECT id, organization_id, user_id, role, status, pbac_policy_id, 
            is_root_admin, invited_by_member_id, joined_at, created_at, updated_at
     FROM organization_members
     WHERE organization_id = $1 AND user_id = $2`,
    [orgId, userId]
  );
  return rows[0] || null;
};

/**
 * Find all members in an organization, paginated, with optional filters.
 * Returns joined user details.
 */
const findAllByOrganization = async (orgId, limit, offset, filters = {}) => {
  const conditions = ['m.organization_id = $1'];
  const values = [orgId];
  let i = 2;

  if (filters.status) {
    conditions.push(`m.status = $${i++}`);
    values.push(filters.status);
  }

  if (filters.search) {
    conditions.push(`(lower(u.full_name) LIKE lower($${i}) OR lower(u.email) LIKE lower($${i}))`);
    values.push(`%${filters.search}%`);
    i++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [dataResult, countResult] = await Promise.all([
    db.query(
      `SELECT m.id, m.role, m.status, m.is_root_admin, m.joined_at, 
              u.id AS user_id, u.full_name, u.email, u.profile_image_url,
              p.id AS pbac_policy_id, p.policy_name
       FROM organization_members m
       JOIN users u ON m.user_id = u.id
       LEFT JOIN pbac_policies p ON m.pbac_policy_id = p.id
       ${where}
       ORDER BY m.created_at ASC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...values, limit, offset]
    ),
    db.query(
      `SELECT COUNT(*) AS total 
       FROM organization_members m 
       JOIN users u ON m.user_id = u.id
       ${where}`,
      values
    ),
  ]);

  return {
    rows: dataResult.rows,
    total: parseInt(countResult.rows[0].total, 10),
  };
};

/**
 * Update a member by ID.
 */
const updateById = async (id, data) => {
  const allowedFields = ['role', 'status', 'pbac_policy_id'];
  const fields = Object.keys(data).filter(k => allowedFields.includes(k));
  
  if (fields.length === 0) return null;

  const setClauses = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => data[f]);

  const { rows } = await db.query(
    `UPDATE organization_members
     SET ${setClauses}, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, ...values]
  );
  return rows[0] || null;
};

/**
 * Remove a member (soft-delete style by changing status to 'removed').
 */
const removeById = async (id) => {
  const { rows } = await db.query(
    `UPDATE organization_members
     SET status = 'removed', updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return rows[0] || null;
};

module.exports = {
  findById,
  findByOrgAndUser,
  findAllByOrganization,
  updateById,
  removeById,
};
