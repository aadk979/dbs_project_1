'use strict';

/**
 * models/event.model.js
 * Raw SQL queries for the events table.
 */

const db = require('../services/db.service');

/**
 * Create a new event.
 */
const create = async (data) => {
  const { 
    organization_id, title, description, location, 
    start_time, end_time, status = 'draft', created_by_member_id 
  } = data;

  const { rows } = await db.query(
    `INSERT INTO events (organization_id, title, description, location, start_time, end_time, status, created_by_member_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [organization_id, title, description, location, start_time, end_time, status, created_by_member_id]
  );
  return rows[0];
};

/**
 * Find an event by ID.
 */
const findById = async (id) => {
  const { rows } = await db.query(`SELECT * FROM events WHERE id = $1`, [id]);
  return rows[0] || null;
};

/**
 * Find paginated events for an organization.
 */
const findByOrganization = async (orgId, limit, offset, filters = {}) => {
  const conditions = ['organization_id = $1'];
  const values = [orgId];
  let i = 2;

  if (filters.status) {
    conditions.push(`status = $${i++}`);
    values.push(filters.status);
  }

  if (filters.search) {
    conditions.push(`lower(title) LIKE lower($${i})`);
    values.push(`%${filters.search}%`);
    i++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [dataResult, countResult] = await Promise.all([
    db.query(
      `SELECT * FROM events 
       ${where}
       ORDER BY start_time ASC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...values, limit, offset]
    ),
    db.query(`SELECT COUNT(*) AS total FROM events ${where}`, values),
  ]);

  return {
    rows: dataResult.rows,
    total: parseInt(countResult.rows[0].total, 10),
  };
};

/**
 * Update an event by ID.
 */
const updateById = async (id, data) => {
  const allowedFields = ['title', 'description', 'location', 'start_time', 'end_time', 'status'];
  const fields = Object.keys(data).filter(k => allowedFields.includes(k));
  
  if (fields.length === 0) return null;

  const setClauses = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map(f => data[f]);

  const { rows } = await db.query(
    `UPDATE events
     SET ${setClauses}, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, ...values]
  );
  return rows[0] || null;
};

/**
 * Delete an event by ID.
 */
const deleteById = async (id) => {
  const { rows } = await db.query(`DELETE FROM events WHERE id = $1 RETURNING id`, [id]);
  return rows[0] || null;
};

module.exports = {
  create,
  findById,
  findByOrganization,
  updateById,
  deleteById,
};
