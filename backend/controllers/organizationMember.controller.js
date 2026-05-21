'use strict';

/**
 * controllers/organizationMember.controller.js
 * Organization Members request handling.
 */

const OrganizationMemberModel = require('../models/organizationMember.model');
const pbacService = require('../services/pbac.service');
const { parsePagination, buildPaginationMeta } = require('../utils/paginate');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * GET /organizations/:orgId/members
 */
const listMembers = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const { limit, offset, page } = parsePagination(req.query);
  const filters = {
    status: req.query.status,
    search: req.query.search,
  };

  const { rows, total } = await OrganizationMemberModel.findAllByOrganization(orgId, limit, offset, filters);

  res.status(200).json({
    success: true,
    data: rows,
    meta: buildPaginationMeta(total, page, limit),
  });
});

/**
 * PUT /organizations/:orgId/members/:memberId
 */
const updateMember = asyncHandler(async (req, res) => {
  const { orgId, memberId } = req.params;
  const { role, status, pbac_policy_id } = req.body;

  const targetMember = await OrganizationMemberModel.findById(memberId);
  if (!targetMember || targetMember.organization_id !== orgId) {
    throw new ApiError(404, 'Member not found in this organization');
  }

  // Root admins cannot have their role changed or status deactivated via this endpoint
  if (targetMember.is_root_admin && (role || status)) {
    throw new ApiError(403, 'Cannot modify role or status of a root admin');
  }

  // Fine-grained permission checks based on what's being updated
  if (role) {
    const canChangeRole = await pbacService.hasPermission(req.member, 'members_change_role');
    if (!canChangeRole) throw new ApiError(403, "Insufficient permissions: Requires 'members_change_role'");
  }

  if (pbac_policy_id !== undefined) {
    const canAssignPbac = await pbacService.hasPermission(req.member, 'members_assign_pbac');
    if (!canAssignPbac) throw new ApiError(403, "Insufficient permissions: Requires 'members_assign_pbac'");
  }

  const updated = await OrganizationMemberModel.updateById(memberId, { role, status, pbac_policy_id });

  res.status(200).json({
    success: true,
    message: 'Member updated successfully',
    data: updated,
  });
});

/**
 * DELETE /organizations/:orgId/members/:memberId
 */
const removeMember = asyncHandler(async (req, res) => {
  const { orgId, memberId } = req.params;

  const targetMember = await OrganizationMemberModel.findById(memberId);
  if (!targetMember || targetMember.organization_id !== orgId) {
    throw new ApiError(404, 'Member not found in this organization');
  }

  if (targetMember.is_root_admin) {
    throw new ApiError(403, 'Cannot remove a root admin');
  }

  await OrganizationMemberModel.removeById(memberId);

  res.status(200).json({
    success: true,
    message: 'Member removed successfully',
  });
});

module.exports = {
  listMembers,
  updateMember,
  removeMember,
};
