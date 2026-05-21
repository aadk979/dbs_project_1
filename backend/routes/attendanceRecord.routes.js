'use strict';

/**
 * routes/attendanceRecord.routes.js
 * Public attendance submission routes.
 * Mounted at: /api/v1/events
 */

const express = require('express');
const attendanceRecordController = require('../controllers/attendanceRecord.controller');
const authenticate = require('../middlewares/authenticate');

const router = express.Router();

// Attendance submission requires the user to be logged in,
// but they do NOT need to be an organization member.
// They just need to be on the event's allowlist (checked in the service).
router.use(authenticate);

router.post(
  '/:eventId/attendance',
  attendanceRecordController.submitAttendance
);

module.exports = router;
