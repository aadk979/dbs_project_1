'use strict';

/**
 * controllers/attendanceRecord.controller.js
 * Attendance Records request handling.
 */

const attendanceService = require('../services/attendance.service');
const AttendanceRecordModel = require('../models/attendanceRecord.model');
const EventModel = require('../models/event.model');
const { parsePagination, buildPaginationMeta } = require('../utils/paginate');
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
 * POST /api/v1/events/:eventId/attendance
 * Public submit endpoint. Authenticated, but does not require being an org member.
 * Only requires being on the event's allowlist (checked in service).
 */
const submitAttendance = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { code } = req.body;
  const userId = req.user.id;

  if (!code) throw new ApiError(400, 'Attendance code is required');

  const record = await attendanceService.processSubmission(eventId, userId, code);

  res.status(201).json({
    success: true,
    message: `Attendance recorded successfully as ${record.status}`,
    data: record,
  });
});

/**
 * GET /api/v1/organizations/:orgId/events/:eventId/attendance
 * List all attendance records for an event (Management endpoint).
 */
const listAttendance = asyncHandler(async (req, res) => {
  const { orgId, eventId } = req.params;
  await verifyEventOrg(eventId, orgId);

  const { limit, offset, page } = parsePagination(req.query);
  const filters = {
    status: req.query.status,
    search: req.query.search,
  };

  const { rows, total } = await AttendanceRecordModel.findByEventPaginated(eventId, limit, offset, filters);

  res.status(200).json({
    success: true,
    data: rows,
    meta: buildPaginationMeta(total, page, limit),
  });
});

/**
 * PUT /api/v1/organizations/:orgId/events/:eventId/attendance/:recordId/override
 * Manual override of attendance status (e.g. late -> on_time).
 */
const overrideAttendance = asyncHandler(async (req, res) => {
  const { orgId, eventId, recordId } = req.params;
  const { status } = req.body;

  if (!['on_time', 'late'].includes(status)) {
    throw new ApiError(400, "Status must be 'on_time' or 'late'");
  }

  await verifyEventOrg(eventId, orgId);

  const existingRecord = await AttendanceRecordModel.findById(recordId);
  if (!existingRecord || existingRecord.event_id !== eventId) {
    throw new ApiError(404, 'Attendance record not found for this event');
  }

  const updatedRecord = await AttendanceRecordModel.updateStatus(recordId, status, req.member.id);

  res.status(200).json({
    success: true,
    message: 'Attendance record overridden successfully',
    data: updatedRecord,
  });
});

module.exports = {
  submitAttendance,
  listAttendance,
  overrideAttendance,
};
