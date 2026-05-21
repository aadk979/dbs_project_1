'use strict';

/**
 * controllers/analytics.controller.js
 * Analytics and statistics request handling.
 */

const analyticsService = require('../services/analytics.service');
const EventModel = require('../models/event.model');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Helper to ensure the event belongs to the organization
 */
const verifyEventOrg = async (eventId, orgId) => {
  const event = await EventModel.findById(eventId);
  if (!event || event.organization_id !== orgId) {
    throw new ApiError(404, 'Event not found in this organization');
  }
  return event;
};

/**
 * GET /organizations/:orgId/analytics
 * Retrieve high-level organization statistics.
 */
const getOrgAnalytics = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const stats = await analyticsService.getOrganizationStats(orgId);

  res.status(200).json({
    success: true,
    data: stats,
  });
});

/**
 * GET /organizations/:orgId/events/:eventId/analytics
 * Retrieve detailed event statistics.
 */
const getEventAnalytics = asyncHandler(async (req, res) => {
  const { orgId, eventId } = req.params;
  await verifyEventOrg(eventId, orgId);

  const stats = await analyticsService.getEventStats(eventId);

  res.status(200).json({
    success: true,
    data: stats,
  });
});

module.exports = {
  getOrgAnalytics,
  getEventAnalytics,
};
