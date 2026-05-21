'use strict';

/**
 * routes/organizationMember.routes.js
 * Nested routes for Organization Members under an organization.
 * Mounted at: /api/v1/organizations/:orgId/members
 */

const express = require('express');
const organizationMemberController = require('../controllers/organizationMember.controller');
const requireOrganizationMember = require('../middlewares/requireOrganizationMember');
const requirePbac = require('../middlewares/requirePbac');

const router = express.Router({ mergeParams: true });

// All routes here require the user to be a member of the organization
router.use(requireOrganizationMember);

router.get(
  '/',
  requirePbac('members_read'),
  organizationMemberController.listMembers
);

// Note: updateMember handles fine-grained PBAC checks internally
// based on whether the role or pbac_policy_id is being updated.
router.put(
  '/:memberId',
  organizationMemberController.updateMember
);

router.delete(
  '/:memberId',
  requirePbac('members_remove'),
  organizationMemberController.removeMember
);

module.exports = router;
