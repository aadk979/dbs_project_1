'use strict';

/**
 * routes/eventAnalytics.routes.js
 * Event-level analytics routes.
 * Mounted at: /api/v1/organizations/:orgId/events/:eventId/analytics
 */

const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const requirePbac = require('../middlewares/requirePbac');

const router = express.Router({ mergeParams: true });

// Note: requireOrganizationMember is already applied in event.routes.js 
// to all routes nested under it, so req.member is already populated.

router.get(
  '/',
  requirePbac('analytics_read'),
  analyticsController.getEventAnalytics
);

module.exports = router;
