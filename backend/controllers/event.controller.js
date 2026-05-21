'use strict';

/**
 * controllers/event.controller.js
 * Events domain request handling.
 */

const EventModel = require('../models/event.model');
const EventAllowedUserModel = require('../models/eventAllowedUser.model');
const { parsePagination, buildPaginationMeta } = require('../utils/paginate');
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
 * POST /organizations/:orgId/events
 */
const createEvent = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const { title, description, location, start_time, end_time } = req.body;

  if (!title || !start_time || !end_time) {
    throw new ApiError(400, 'Title, start_time, and end_time are required');
  }

  const event = await EventModel.create({
    organization_id: orgId,
    title,
    description,
    location,
    start_time,
    end_time,
    status: 'draft',
    created_by_member_id: req.member.id,
  });

  res.status(201).json({
    success: true,
    message: 'Event created successfully',
    data: event,
  });
});

/**
 * GET /organizations/:orgId/events
 */
const listOrganizationEvents = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const { limit, offset, page } = parsePagination(req.query);
  const filters = {
    status: req.query.status,
    search: req.query.search,
  };

  const { rows, total } = await EventModel.findByOrganization(orgId, limit, offset, filters);

  res.status(200).json({
    success: true,
    data: rows,
    meta: buildPaginationMeta(total, page, limit),
  });
});

/**
 * GET /organizations/:orgId/events/:eventId
 */
const getEvent = asyncHandler(async (req, res) => {
  const { orgId, eventId } = req.params;
  const event = await verifyEventOrg(eventId, orgId);

  res.status(200).json({
    success: true,
    data: event,
  });
});

/**
 * PUT /organizations/:orgId/events/:eventId
 */
const updateEvent = asyncHandler(async (req, res) => {
  const { orgId, eventId } = req.params;
  await verifyEventOrg(eventId, orgId);

  const updated = await EventModel.updateById(eventId, req.body);

  res.status(200).json({
    success: true,
    message: 'Event updated successfully',
    data: updated,
  });
});

/**
 * DELETE /organizations/:orgId/events/:eventId
 */
const deleteEvent = asyncHandler(async (req, res) => {
  const { orgId, eventId } = req.params;
  await verifyEventOrg(eventId, orgId);

  await EventModel.deleteById(eventId);

  res.status(200).json({
    success: true,
    message: 'Event deleted successfully',
  });
});

/**
 * POST /organizations/:orgId/events/:eventId/publish
 */
const publishEvent = asyncHandler(async (req, res) => {
  const { orgId, eventId } = req.params;
  await verifyEventOrg(eventId, orgId);

  const updated = await EventModel.updateById(eventId, { status: 'published' });

  res.status(200).json({
    success: true,
    message: 'Event published successfully',
    data: updated,
  });
});

/**
 * GET /organizations/:orgId/events/:eventId/allowed-users
 */
const listAllowedUsers = asyncHandler(async (req, res) => {
  const { orgId, eventId } = req.params;
  await verifyEventOrg(eventId, orgId);

  const { limit, offset, page } = parsePagination(req.query);
  const filters = { search: req.query.search };

  const { rows, total } = await EventAllowedUserModel.listAllowedUsers(eventId, limit, offset, filters);

  res.status(200).json({
    success: true,
    data: rows,
    meta: buildPaginationMeta(total, page, limit),
  });
});

/**
 * POST /organizations/:orgId/events/:eventId/allowed-users
 */
const addAllowedUser = asyncHandler(async (req, res) => {
  const { orgId, eventId } = req.params;
  const { user_id } = req.body;

  if (!user_id) throw new ApiError(400, 'User ID is required');
  await verifyEventOrg(eventId, orgId);

  const record = await EventAllowedUserModel.addAllowedUser(eventId, user_id, req.member.id);

  if (!record) {
    return res.status(200).json({
      success: true,
      message: 'User is already in the allowlist',
    });
  }

  res.status(201).json({
    success: true,
    message: 'User added to event allowlist',
    data: record,
  });
});

/**
 * DELETE /organizations/:orgId/events/:eventId/allowed-users/:userId
 */
const removeAllowedUser = asyncHandler(async (req, res) => {
  const { orgId, eventId, userId } = req.params;
  await verifyEventOrg(eventId, orgId);

  const deleted = await EventAllowedUserModel.removeAllowedUser(eventId, userId);
  if (!deleted) throw new ApiError(404, 'User not found in allowlist');

  res.status(200).json({
    success: true,
    message: 'User removed from event allowlist',
  });
});

module.exports = {
  createEvent,
  listOrganizationEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  publishEvent,
  listAllowedUsers,
  addAllowedUser,
  removeAllowedUser,
};
