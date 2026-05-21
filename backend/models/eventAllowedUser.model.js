'use strict';

/**
 * models/eventAllowedUser.model.js
 * Raw SQL queries for the event_allowed_users table.
 */

const db = require('../services/db.service');

/**
 * Add a user to the event's allowlist.
 */
const addAllowedUser = async (eventId, userId, addedByMemberId) => {
  const { rows } = await db.query(
    `INSERT INTO event_allowed_users (event_id, user_id, added_by_member_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (event_id, user_id) DO NOTHING
     RETURNING *`,
    [eventId, userId, addedByMemberId]
  );
  return rows[0] || null;
};

/**
 * Remove a user from the event's allowlist.
 */
const removeAllowedUser = async (eventId, userId) => {
  const { rows } = await db.query(
    `DELETE FROM event_allowed_users
     WHERE event_id = $1 AND user_id = $2
     RETURNING *`,
    [eventId, userId]
  );
  return rows[0] || null;
};

/**
 * Check if a user is explicitly allowed for this event.
 */
const isUserAllowed = async (eventId, userId) => {
  const { rows } = await db.query(
    `SELECT 1 FROM event_allowed_users
     WHERE event_id = $1 AND user_id = $2`,
    [eventId, userId]
  );
  return rows.length > 0;
};

/**
 * List all users allowed for an event, paginated.
 */
const listAllowedUsers = async (eventId, limit, offset, filters = {}) => {
  const conditions = ['e.event_id = $1'];
  const values = [eventId];
  let i = 2;

  if (filters.search) {
    conditions.push(`(lower(u.full_name) LIKE lower($${i}) OR lower(u.email) LIKE lower($${i}))`);
    values.push(`%${filters.search}%`);
    i++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [dataResult, countResult] = await Promise.all([
    db.query(
      `SELECT e.id, e.event_id, e.created_at, 
              u.id AS user_id, u.full_name, u.email, u.profile_image_url
       FROM event_allowed_users e
       JOIN users u ON e.user_id = u.id
       ${where}
       ORDER BY e.created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...values, limit, offset]
    ),
    db.query(
      `SELECT COUNT(*) AS total 
       FROM event_allowed_users e
       JOIN users u ON e.user_id = u.id
       ${where}`,
      values
    ),
  ]);

  return {
    rows: dataResult.rows,
    total: parseInt(countResult.rows[0].total, 10),
  };
};

module.exports = {
  addAllowedUser,
  removeAllowedUser,
  isUserAllowed,
  listAllowedUsers,
};
