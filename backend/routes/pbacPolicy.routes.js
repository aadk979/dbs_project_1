'use strict';

/**
 * routes/pbacPolicy.routes.js
 * Nested routes for PBAC Policies under an organization.
 * Mounted at: /api/v1/organizations/:orgId/pbac-policies
 */

const express = require('express');
const pbacPolicyController = require('../controllers/pbacPolicy.controller');
const requireOrganizationMember = require('../middlewares/requireOrganizationMember');
const requirePbac = require('../middlewares/requirePbac');

// mergeParams: true is required to access :orgId from the parent router
const router = express.Router({ mergeParams: true });

// All routes here require the user to be a member of the organization
router.use(requireOrganizationMember);

router.post(
  '/',
  requirePbac('members_assign_pbac'),
  pbacPolicyController.createPolicy
);

router.get(
  '/',
  requirePbac('members_read'),
  pbacPolicyController.listPolicies
);

router.put(
  '/:id',
  requirePbac('members_assign_pbac'),
  pbacPolicyController.updatePolicy
);

router.delete(
  '/:id',
  requirePbac('members_assign_pbac'),
  pbacPolicyController.deletePolicy
);

module.exports = router;
