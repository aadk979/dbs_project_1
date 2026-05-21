'use strict';

/**
 * utils/dateUtils.js
 * Date and timestamp helper functions used across the attendance domain.
 */

/**
 * Determine the attendance status ('on_time' or 'late') for a given submission.
 *
 * @param {Date|string} submittedAt       - The timestamp when the user submitted attendance
 * @param {Date|string} attendanceOpensAt - The timestamp when the attendance window opens
 * @param {number}      lateAfterMinutes  - Minutes after attendanceOpensAt that count as late
 * @returns {'on_time' | 'late'}
 */
const determineAttendanceStatus = (submittedAt, attendanceOpensAt, lateAfterMinutes) => {
  const submitted = new Date(submittedAt).getTime();
  const opens = new Date(attendanceOpensAt).getTime();
  const lateThreshold = opens + lateAfterMinutes * 60 * 1000;

  return submitted <= lateThreshold ? 'on_time' : 'late';
};

/**
 * Check whether the current time falls within an attendance window.
 *
 * @param {Date|string} attendanceOpensAt  - Window open timestamp
 * @param {Date|string} attendanceClosesAt - Window close timestamp
 * @param {Date} [now=new Date()]          - Override "now" for testing
 * @returns {boolean}
 */
const isWithinAttendanceWindow = (attendanceOpensAt, attendanceClosesAt, now = new Date()) => {
  const t = now.getTime();
  return t >= new Date(attendanceOpensAt).getTime() && t <= new Date(attendanceClosesAt).getTime();
};

/**
 * Add a number of minutes to a Date and return a new Date.
 *
 * @param {Date|string} date
 * @param {number} minutes
 * @returns {Date}
 */
const addMinutes = (date, minutes) => {
  return new Date(new Date(date).getTime() + minutes * 60 * 1000);
};

/**
 * Return an ISO 8601 string for a date X days in the future.
 *
 * @param {number} days
 * @returns {string}
 */
const daysFromNow = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

/**
 * Return an ISO 8601 string for a date X hours in the future.
 *
 * @param {number} hours
 * @returns {string}
 */
const hoursFromNow = (hours) => {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
};

module.exports = {
  determineAttendanceStatus,
  isWithinAttendanceWindow,
  addMinutes,
  daysFromNow,
  hoursFromNow,
};
