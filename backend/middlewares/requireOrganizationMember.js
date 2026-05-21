'use strict';

/**
 * middlewares/requireOrganizationMember.js
 * Phase 3 stub: Will be implemented in Phase 4.
 * For now, this just passes through so routes can be defined.
 */
const asyncHandler = require('../utils/asyncHandler');

const requireOrganizationMember = asyncHandler(async (req, res, next) => {
  // TODO: Implement in Phase 4
  // 1. Find member record for req.user.id in req.params.orgId
  // 2. Attach to req.member
  // 3. Throw 403 if not found or not active
  
  // Dummy req.member to prevent crashes downstream for now
  req.member = { id: 'dummy', role: 'admin', is_root_admin: true };
  next();
});

module.exports = requireOrganizationMember;
