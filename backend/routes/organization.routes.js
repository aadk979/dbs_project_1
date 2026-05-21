'use strict';

/**
 * routes/organization.routes.js
 * Organization domain routes.
 */

const express = require('express');
const organizationController = require('../controllers/organization.controller');
const authenticate = require('../middlewares/authenticate');
const requireOrganizationMember = require('../middlewares/requireOrganizationMember');
const requirePbac = require('../middlewares/requirePbac');

const router = express.Router();

// All organization routes require the user to be authenticated
router.use(authenticate);

// ---- Top-level Organization Routes ----
router.post('/', organizationController.createOrganization);
router.get('/', organizationController.listUserOrganizations);
router.post('/join', organizationController.joinOrganization);

// ---- Organization-specific Routes ----
// These require the user to be a member of the specific organization (:orgId)
router.get('/:orgId', requireOrganizationMember, organizationController.getOrganization);

router.put(
  '/:orgId',
  requireOrganizationMember,
  requirePbac('organization_write'),
  organizationController.updateOrganization
);

router.post(
  '/:orgId/regenerate-join-code',
  requireOrganizationMember,
  requirePbac('organization_write'),
  organizationController.regenerateJoinCode
);

// ---- Nested Domain Routes ----
router.use('/:orgId/pbac-policies', require('./pbacPolicy.routes'));
router.use('/:orgId/members', require('./organizationMember.routes'));

module.exports = router;
