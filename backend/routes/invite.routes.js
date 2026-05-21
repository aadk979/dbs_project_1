'use strict';

/**
 * routes/invite.routes.js
 * Invites domain routes.
 * Mounted at: /api/v1/invites
 */

const express = require('express');
const inviteController = require('../controllers/invite.controller');
const authenticate = require('../middlewares/authenticate');
const requireOrganizationMember = require('../middlewares/requireOrganizationMember');
const requirePbac = require('../middlewares/requirePbac');

const router = express.Router();

// All invite actions require authentication
router.use(authenticate);

// Global accept endpoint
router.post('/accept', inviteController.acceptInvite);

// ---- Organization Invites ----
router.post(
  '/organizations/:orgId',
  requireOrganizationMember,
  requirePbac('members_invite'),
  inviteController.createOrganizationInvite
);

router.get(
  '/organizations/:orgId',
  requireOrganizationMember,
  requirePbac('members_read'),
  inviteController.listOrganizationInvites
);

// ---- Event Invites (Phase 6 crossover) ----
// Events routes are built in Phase 6, but we define the invite endpoint here
// requireOrganizationMember needs :orgId, but for an event invite we might only have :eventId in the path.
// This route will be protected properly in Phase 6 when we have a requireEventAccess middleware.
// For now, it's defined but should not be used securely until Phase 6 is complete.
router.post(
  '/events/:eventId',
  // TODO: Add requireEventAccess middleware from Phase 6
  inviteController.createEventInvite
);

module.exports = router;
