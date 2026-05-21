'use strict';

/**
 * models/attendanceTrackingCode.model.js
 * Raw SQL queries for the attendance_tracking_codes table.
 */

const db = require('../services/db.service');

/**
 * Create a new attendance tracking code.
 * Note: Usually called within a transaction by the code service to ensure
 * old codes are deactivated first.
 *
 * @param {object} data
 * @param {object} [client] - Optional pg client for transactions
 */
const create = async (data, client = null) => {
  const { event_id, code, is_active = true, created_by_member_id } = data;
  const executor = client || db;

  const { rows } = await executor.query(
    `INSERT INTO attendance_tracking_codes (event_id, code, is_active, created_by_member_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [event_id, code, is_active, created_by_member_id]
  );
  return rows[0];
};

/**
 * Find a specific code by the exact code string.
 * This is used during attendance submission.
 */
const findByCode = async (code) => {
  const { rows } = await db.query(
    `SELECT * FROM attendance_tracking_codes WHERE code = $1`,
    [code]
  );
  return rows[0] || null;
};

/**
 * Find the currently active code for a given event.
 */
const findActiveByEvent = async (eventId) => {
  const { rows } = await db.query(
    `SELECT * FROM attendance_tracking_codes 
     WHERE event_id = $1 AND is_active = TRUE
     ORDER BY created_at DESC 
     LIMIT 1`,
    [eventId]
  );
  return rows[0] || null;
};

/**
 * Deactivate all currently active codes for a given event.
 *
 * @param {string} eventId
 * @param {object} [client] - Optional pg client for transactions
 */
const deactivateAllForEvent = async (eventId, client = null) => {
  const executor = client || db;
  const { rows } = await executor.query(
    `UPDATE attendance_tracking_codes 
     SET is_active = FALSE, updated_at = NOW()
     WHERE event_id = $1 AND is_active = TRUE
     RETURNING id`,
    [eventId]
  );
  return rows.map(r => r.id);
};

module.exports = {
  create,
  findByCode,
  findActiveByEvent,
  deactivateAllForEvent,
};
