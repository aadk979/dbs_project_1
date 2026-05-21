'use strict';

/**
 * routes/attendanceManagement.routes.js
 * Organization-facing attendance management routes.
 * Mounted at: /api/v1/organizations/:orgId/events/:eventId/attendance
 */

const express = require('express');
const attendanceRecordController = require('../controllers/attendanceRecord.controller');
const requirePbac = require('../middlewares/requirePbac');

const router = express.Router({ mergeParams: true });

// Note: requireOrganizationMember is already applied in event.routes.js 
// to all routes nested under it, so req.member is already populated.

router.get(
  '/',
  requirePbac('attendance_read'),
  attendanceRecordController.listAttendance
);

router.put(
  '/:recordId/override',
  requirePbac('attendance_override'),
  attendanceRecordController.overrideAttendance
);

module.exports = router;
