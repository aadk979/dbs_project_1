'use strict';

/**
 * services/code.service.js
 * Business logic for Attendance Tracking Codes (ATCs).
 */

const AttendanceTrackingCodeModel = require('../models/attendanceTrackingCode.model');
const db = require('./db.service');
const { generateAtcCode } = require('../utils/generateCode');

/**
 * Generate a new ATC for an event and activate it,
 * deactivating any previously active codes in the same transaction.
 *
 * @param {string} eventId
 * @param {string} createdByMemberId
 * @returns {Promise<object>} The newly created active code record.
 */
const generateAndActivateCode = async (eventId, createdByMemberId) => {
  return db.withTransaction(async (client) => {
    // 1. Deactivate all existing codes for this event
    await AttendanceTrackingCodeModel.deactivateAllForEvent(eventId, client);

    // 2. Generate cryptographically strong uppercase alphanumeric code (8 chars)
    const codeStr = generateAtcCode();

    // 3. Insert and return the new active code
    const newCode = await AttendanceTrackingCodeModel.create({
      event_id: eventId,
      code: codeStr,
      is_active: true,
      created_by_member_id: createdByMemberId,
    }, client);

    return newCode;
  });
};

module.exports = {
  generateAndActivateCode,
};
