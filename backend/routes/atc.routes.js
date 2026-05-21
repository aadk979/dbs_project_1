'use strict';

/**
 * routes/atc.routes.js
 * Attendance Tracking Code (ATC) routes.
 * Mounted at: /api/v1/organizations/:orgId/events/:eventId/code
 */

const express = require('express');
const atcController = require('../controllers/atc.controller');
const requirePbac = require('../middlewares/requirePbac');

const router = express.Router({ mergeParams: true });

// Note: requireOrganizationMember is already applied in event.routes.js 
// to all routes nested under it, so req.member is already populated.

router.get(
  '/',
  requirePbac('attendance_code_read'),
  atcController.getActiveCode
);

router.post(
  '/rotate',
  requirePbac('attendance_code_rotate'),
  atcController.rotateCode
);

module.exports = router;
