'use strict';

/**
 * controllers/organization.controller.js
 * Organization domain request handling.
 */

const OrganizationModel = require('../models/organization.model');
const db = require('../services/db.service');
const { generateJoinCode } = require('../utils/generateCode');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /organizations
 * Creates a new organization and auto-creates the root admin member record.
 */
const createOrganization = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const userId = req.user.id;

  if (!name) throw new ApiError(400, 'Organization name is required');

  const joinCode = generateJoinCode();

  const org = await db.withTransaction(async (client) => {
    // 1. Create the organization
    const orgData = await OrganizationModel.create({
      name,
      description,
      join_code: joinCode,
      created_by_user_id: userId,
    }, client);

    // 2. Auto-create the root admin member record
    await client.query(
      `INSERT INTO organization_members (organization_id, user_id, role, status, is_root_admin, joined_at)
       VALUES ($1, $2, 'admin', 'active', TRUE, NOW())`,
      [orgData.id, userId]
    );

    return orgData;
  });

  res.status(201).json({
    success: true,
    message: 'Organization created successfully',
    data: org,
  });
});

/**
 * GET /organizations
 * List all organizations the authenticated user belongs to.
 */
const listUserOrganizations = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const orgs = await OrganizationModel.findByUserId(userId);

  res.status(200).json({
    success: true,
    data: orgs,
  });
});

/**
 * GET /organizations/:orgId
 * Get organization details. (Assuming any authenticated user can view if they have the ID,
 * or it should be protected by requireOrganizationMember - we'll attach the middleware on the route).
 */
const getOrganization = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const org = await OrganizationModel.findById(orgId);

  if (!org) throw new ApiError(404, 'Organization not found');

  res.status(200).json({
    success: true,
    data: org,
  });
});

/**
 * PUT /organizations/:orgId
 * Update organization details. Requires 'organization_write' PBAC (checked in route).
 */
const updateOrganization = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const { name, description, is_active } = req.body;

  const org = await OrganizationModel.updateById(orgId, { name, description, is_active });
  if (!org) throw new ApiError(404, 'Organization not found');

  res.status(200).json({
    success: true,
    message: 'Organization updated successfully',
    data: org,
  });
});

/**
 * POST /organizations/join
 * Join an organization using its join_code.
 */
const joinOrganization = asyncHandler(async (req, res) => {
  const { join_code } = req.body;
  const userId = req.user.id;

  if (!join_code) throw new ApiError(400, 'Join code is required');

  const org = await OrganizationModel.findByJoinCode(join_code);
  if (!org || !org.is_active) {
    throw new ApiError(404, 'Invalid or inactive join code');
  }

  // Insert member record or handle conflict
  try {
    await db.query(
      `INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
       VALUES ($1, $2, 'member', 'active', NOW())`,
      [org.id, userId]
    );
  } catch (err) {
    // 23505 is PostgreSQL unique violation (user is already a member)
    if (err.code === '23505') {
      throw new ApiError(409, 'You are already a member of this organization');
    }
    throw err;
  }

  res.status(200).json({
    success: true,
    message: 'Successfully joined organization',
    data: { id: org.id, name: org.name },
  });
});

/**
 * POST /organizations/:orgId/regenerate-join-code
 * Regenerate the join code. Requires 'organization_write' PBAC.
 */
const regenerateJoinCode = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const newJoinCode = generateJoinCode();

  const org = await OrganizationModel.updateById(orgId, { join_code: newJoinCode });
  if (!org) throw new ApiError(404, 'Organization not found');

  res.status(200).json({
    success: true,
    message: 'Join code regenerated successfully',
    data: { join_code: org.join_code },
  });
});

module.exports = {
  createOrganization,
  listUserOrganizations,
  getOrganization,
  updateOrganization,
  joinOrganization,
  regenerateJoinCode,
};
