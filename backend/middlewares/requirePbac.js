'use strict';

/**
 * middlewares/requirePbac.js
 * Verifies that req.member has a specific PBAC permission.
 * MUST be used AFTER requireOrganizationMember.
 */
const pbacService = require('../services/pbac.service');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const requirePbac = (permissionKey) => asyncHandler(async (req, res, next) => {
  if (!req.member) {
    throw new ApiError(500, 'requirePbac must be used after requireOrganizationMember');
  }

  const hasPerm = await pbacService.hasPermission(req.member, permissionKey);

  if (!hasPerm) {
    throw new ApiError(403, `Insufficient permissions: Requires '${permissionKey}'`);
  }

  next();
});

module.exports = requirePbac;
