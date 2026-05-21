'use strict';

/**
 * services/attendance.service.js
 * Business logic for processing attendance submissions.
 */

const db = require('./db.service');
const EventModel = require('../models/event.model');
const EventAllowedUserModel = require('../models/eventAllowedUser.model');
const AttendanceTrackingCodeModel = require('../models/attendanceTrackingCode.model');
const AttendanceRecordModel = require('../models/attendanceRecord.model');
const { determineAttendanceStatus } = require('../utils/dateUtils');
const ApiError = require('../utils/ApiError');

const LATE_GRACE_PERIOD_MINUTES = 15;

/**
 * Process an attendance submission from a user.
 * 
 * @param {string} eventId 
 * @param {string} userId 
 * @param {string} code - The ATC provided by the user
 * @returns {Promise<object>} The inserted attendance record
 */
const processSubmission = async (eventId, userId, code) => {
  return db.withTransaction(async (client) => {
    // 1. Verify event exists and is published
    const event = await EventModel.findById(eventId);
    if (!event) throw new ApiError(404, 'Event not found');
    if (event.status !== 'published') {
      throw new ApiError(400, 'Cannot submit attendance for an unpublished event');
    }

    // 2. Verify user is on the allowlist
    const isAllowed = await EventAllowedUserModel.isUserAllowed(eventId, userId);
    if (!isAllowed) {
      throw new ApiError(403, 'You are not on the allowlist for this event');
    }

    // 3. Verify user hasn't already submitted attendance
    const existingRecord = await AttendanceRecordModel.findByEventAndUser(eventId, userId);
    if (existingRecord) {
      throw new ApiError(409, 'You have already submitted attendance for this event');
    }

    // 4. Verify the provided code matches the currently active code
    const activeCode = await AttendanceTrackingCodeModel.findActiveByEvent(eventId);
    if (!activeCode) {
      throw new ApiError(400, 'No active attendance code for this event. Wait for the host to generate one.');
    }
    if (activeCode.code !== code.toUpperCase()) {
      throw new ApiError(400, 'Invalid or expired attendance code');
    }

    // 5. Determine on_time vs late
    const now = new Date().toISOString();
    const status = determineAttendanceStatus(now, event.start_time, LATE_GRACE_PERIOD_MINUTES);

    // 6. Insert the record
    const record = await AttendanceRecordModel.submit({
      event_id: eventId,
      user_id: userId,
      status,
      submitted_at: now,
      code_used: activeCode.code,
    }, client);

    return record;
  });
};

module.exports = {
  processSubmission,
};
