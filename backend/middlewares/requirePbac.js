'use strict';

/**
 * middlewares/requirePbac.js
 * Phase 3 stub: Will be implemented in Phase 4.
 * For now, this just passes through so routes can be defined.
 */
const asyncHandler = require('../utils/asyncHandler');

const requirePbac = (permissionKey) => asyncHandler(async (req, res, next) => {
  // TODO: Implement in Phase 4
  // 1. Call pbac.service.hasPermission(req.member, permissionKey)
  // 2. Throw 403 if false
  
  next();
});

module.exports = requirePbac;
