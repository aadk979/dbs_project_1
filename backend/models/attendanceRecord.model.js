'use strict';

/**
 * models/attendanceRecord.model.js
 * Raw SQL queries for the attendance_records table.
 */

const db = require('../services/db.service');

/**
 * Insert a new attendance record.
 * Done transactionally in the service layer.
 */
const submit = async (data, client = null) => {
  const { event_id, user_id, status, submitted_at, code_used } = data;
  const executor = client || db;

  const { rows } = await executor.query(
    `INSERT INTO attendance_records (event_id, user_id, status, submitted_at, code_used)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [event_id, user_id, status, submitted_at, code_used]
  );
  return rows[0];
};

/**
 * Find an attendance record by event and user.
 */
const findByEventAndUser = async (eventId, userId) => {
  const { rows } = await db.query(
    `SELECT * FROM attendance_records WHERE event_id = $1 AND user_id = $2`,
    [eventId, userId]
  );
  return rows[0] || null;
};

/**
 * Find an attendance record by its primary key ID.
 */
const findById = async (id) => {
  const { rows } = await db.query(
    `SELECT * FROM attendance_records WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
};

/**
 * Paginated list of attendance records for an event.
 * Joins with the users table to return user details.
 */
const findByEventPaginated = async (eventId, limit, offset, filters = {}) => {
  const conditions = ['a.event_id = $1'];
  const values = [eventId];
  let i = 2;

  if (filters.status) {
    conditions.push(`a.status = $${i++}`);
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
      `SELECT a.id, a.status, a.submitted_at, a.code_used, a.overridden_by_member_id,
              u.id AS user_id, u.full_name, u.email, u.profile_image_url
       FROM attendance_records a
       JOIN users u ON a.user_id = u.id
       ${where}
       ORDER BY a.submitted_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...values, limit, offset]
    ),
    db.query(
      `SELECT COUNT(*) AS total 
       FROM attendance_records a
       JOIN users u ON a.user_id = u.id
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
 * Update the status of an attendance record (for manual overrides).
 */
const updateStatus = async (id, newStatus, overriddenByMemberId) => {
  const { rows } = await db.query(
    `UPDATE attendance_records
     SET status = $1, overridden_by_member_id = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [newStatus, overriddenByMemberId, id]
  );
  return rows[0] || null;
};

module.exports = {
  submit,
  findByEventAndUser,
  findById,
  findByEventPaginated,
  updateStatus,
};
