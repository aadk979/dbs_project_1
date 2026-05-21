'use strict';

/**
 * middlewares/requireOrganizationMember.js
 * Verifies that the authenticated user is an active member of the organization
 * specified in req.params.orgId.
 * Attaches the member record to req.member.
 */
const OrganizationMemberModel = require('../models/organizationMember.model');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const requireOrganizationMember = asyncHandler(async (req, res, next) => {
  const { orgId } = req.params;
  const userId = req.user.id;

  if (!orgId) {
    throw new ApiError(400, 'Organization ID is required in the route path');
  }

  const member = await OrganizationMemberModel.findByOrgAndUser(orgId, userId);

  if (!member) {
    throw new ApiError(403, 'You are not a member of this organization');
  }

  if (member.status !== 'active') {
    throw new ApiError(403, `Your membership status is '${member.status}'`);
  }

  req.member = member;
  next();
});

module.exports = requireOrganizationMember;
