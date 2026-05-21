'use strict';

/**
 * routes/index.js
 * Root router — mounts all sub-routers under /api/v1.
 * Additional route files are imported here as each phase is completed.
 */

const express = require('express');

const router = express.Router();

// ---- Health check ----
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ---- Phase 2: Auth ----
router.use('/auth', require('./auth.routes'));

// ---- Phase 3: Organizations ----
router.use('/organizations', require('./organization.routes'));

// ---- Phase 4: PBAC Policies & Members ----
// (mounted inside organization routes as nested routers)

// ---- Phase 5: Invites ----
router.use('/invites', require('./invite.routes'));

// ---- Phase 8: Attendance (public submit) ----
// router.use('/events', require('./attendanceRecord.routes'));

// ---- Phase 9: Analytics ----
// (mounted inside organization routes)

module.exports = router;
