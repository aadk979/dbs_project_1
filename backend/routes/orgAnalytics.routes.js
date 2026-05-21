'use strict';

/**
 * routes/orgAnalytics.routes.js
 * Organization-level analytics routes.
 * Mounted at: /api/v1/organizations/:orgId/analytics
 */

const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const requirePbac = require('../middlewares/requirePbac');

const router = express.Router({ mergeParams: true });

// Note: requireOrganizationMember is already applied in organization.routes.js 
// to all routes nested under it, so req.member is already populated. Wait, is it?
// Let me verify if requireOrganizationMember was applied globally in organization.routes.js.
// Actually, in organization.routes.js I did NOT apply requireOrganizationMember globally,
// I applied it individually to the endpoints, EXCEPT for the nested routes where I should apply it.
// Wait, I need to make sure I apply it. I will import it here just to be safe.

const requireOrganizationMember = require('../middlewares/requireOrganizationMember');

router.use(requireOrganizationMember);

router.get(
  '/',
  requirePbac('analytics_read'),
  analyticsController.getOrgAnalytics
);

module.exports = router;
