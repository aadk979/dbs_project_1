'use strict';

/**
 * services/analytics.service.js
 * Business logic for analytics and statistics.
 */

const db = require('./db.service');

/**
 * Get organization-level statistics.
 * Total events, total members, upcoming events count.
 */
const getOrganizationStats = async (orgId) => {
  const [eventsResult, membersResult, upcomingResult] = await Promise.all([
    db.query(`SELECT COUNT(*) AS total FROM events WHERE organization_id = $1`, [orgId]),
    db.query(`SELECT COUNT(*) AS total FROM organization_members WHERE organization_id = $1 AND status = 'active'`, [orgId]),
    db.query(`SELECT COUNT(*) AS total FROM events WHERE organization_id = $1 AND start_time > NOW() AND status = 'published'`, [orgId])
  ]);

  return {
    total_events: parseInt(eventsResult.rows[0].total, 10),
    total_members: parseInt(membersResult.rows[0].total, 10),
    upcoming_events: parseInt(upcomingResult.rows[0].total, 10),
  };
};

/**
 * Get event-level statistics.
 * Total allowlisted users, total attendees (on_time vs late), attendance rate.
 */
const getEventStats = async (eventId) => {
  const [allowlistResult, attendanceResult] = await Promise.all([
    db.query(`SELECT COUNT(*) AS total FROM event_allowed_users WHERE event_id = $1`, [eventId]),
    db.query(
      `SELECT status, COUNT(*) AS count 
       FROM attendance_records 
       WHERE event_id = $1 
       GROUP BY status`,
      [eventId]
    )
  ]);

  const totalAllowed = parseInt(allowlistResult.rows[0].total, 10);
  
  let onTimeCount = 0;
  let lateCount = 0;

  attendanceResult.rows.forEach(row => {
    if (row.status === 'on_time') onTimeCount = parseInt(row.count, 10);
    if (row.status === 'late') lateCount = parseInt(row.count, 10);
  });

  const totalAttendees = onTimeCount + lateCount;
  
  // Calculate attendance rate. 0 if no allowed users.
  let attendanceRate = 0;
  if (totalAllowed > 0) {
    attendanceRate = parseFloat(((totalAttendees / totalAllowed) * 100).toFixed(2));
  }

  return {
    total_allowlisted: totalAllowed,
    total_attendees: totalAttendees,
    on_time_count: onTimeCount,
    late_count: lateCount,
    attendance_rate_percentage: attendanceRate,
  };
};

module.exports = {
  getOrganizationStats,
  getEventStats,
};
