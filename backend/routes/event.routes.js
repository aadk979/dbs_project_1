'use strict';

/**
 * routes/event.routes.js
 * Nested routes for Events under an organization.
 * Mounted at: /api/v1/organizations/:orgId/events
 */

const express = require('express');
const eventController = require('../controllers/event.controller');
const requireOrganizationMember = require('../middlewares/requireOrganizationMember');
const requirePbac = require('../middlewares/requirePbac');

const router = express.Router({ mergeParams: true });

// All event routes require the user to be a member of the organization
router.use(requireOrganizationMember);

// ---- Event CRUD ----
router.post(
  '/',
  requirePbac('events_write'),
  eventController.createEvent
);

router.get(
  '/',
  requirePbac('events_read'),
  eventController.listOrganizationEvents
);

router.get(
  '/:eventId',
  requirePbac('events_read'),
  eventController.getEvent
);

router.put(
  '/:eventId',
  requirePbac('events_update'),
  eventController.updateEvent
);

router.delete(
  '/:eventId',
  requirePbac('events_delete'),
  eventController.deleteEvent
);

router.post(
  '/:eventId/publish',
  requirePbac('events_publish'),
  eventController.publishEvent
);

// ---- Event Allowed Users ----
router.get(
  '/:eventId/allowed-users',
  requirePbac('events_read'),
  eventController.listAllowedUsers
);

router.post(
  '/:eventId/allowed-users',
  requirePbac('events_write'),
  eventController.addAllowedUser
);

router.delete(
  '/:eventId/allowed-users/:userId',
  requirePbac('events_write'),
  eventController.removeAllowedUser
);

// ---- Nested Event Routes ----
router.use('/:eventId/code', require('./atc.routes'));
router.use('/:eventId/attendance', require('./attendanceManagement.routes'));
router.use('/:eventId/analytics', require('./eventAnalytics.routes'));

module.exports = router;
