'use strict';

/**
 * controllers/atc.controller.js
 * Attendance Tracking Code (ATC) request handling.
 */

const AttendanceTrackingCodeModel = require('../models/attendanceTrackingCode.model');
const EventModel = require('../models/event.model');
const codeService = require('../services/code.service');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Helper to ensure the event belongs to the organization
 */
const verifyEventOrg = async (eventId, orgId) => {
  const event = await EventModel.findById(eventId);
  if (!event || event.organization_id !== orgId) {
    throw new ApiError(404, 'Event not found in this organization');
  }
  return event;
};

/**
 * GET /organizations/:orgId/events/:eventId/code
 * Gets the currently active attendance tracking code for an event.
 */
const getActiveCode = asyncHandler(async (req, res) => {
  const { orgId, eventId } = req.params;
  await verifyEventOrg(eventId, orgId);

  const activeCode = await AttendanceTrackingCodeModel.findActiveByEvent(eventId);

  res.status(200).json({
    success: true,
    data: activeCode || null,
  });
});

/**
 * POST /organizations/:orgId/events/:eventId/code/rotate
 * Generates a new active code and deactivates all previous ones.
 */
const rotateCode = asyncHandler(async (req, res) => {
  const { orgId, eventId } = req.params;
  await verifyEventOrg(eventId, orgId);

  const newCode = await codeService.generateAndActivateCode(eventId, req.member.id);

  res.status(201).json({
    success: true,
    message: 'Attendance tracking code rotated successfully',
    data: newCode,
  });
});

module.exports = {
  getActiveCode,
  rotateCode,
};
