'use strict';

/**
 * controllers/invite.controller.js
 * Invites domain request handling.
 */

const InviteModel = require('../models/invite.model');
const OrganizationModel = require('../models/organization.model');
const db = require('../services/db.service');
const emailService = require('../services/email.service');
const { generateToken } = require('../utils/generateCode');
const { daysFromNow } = require('../utils/dateUtils');
const { parsePagination, buildPaginationMeta } = require('../utils/paginate');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/v1/invites/organizations/:orgId
 */
const createOrganizationInvite = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const { email, pbac_policy_id } = req.body;

  if (!email) throw new ApiError(400, 'Email is required');

  const org = await OrganizationModel.findById(orgId);
  if (!org) throw new ApiError(404, 'Organization not found');

  const tokenStr = generateToken();

  const invite = await InviteModel.create({
    type: 'organization',
    target_id: orgId,
    email,
    token: tokenStr,
    expires_at: daysFromNow(7),
    invited_by_member_id: req.member.id,
    pbac_policy_id: pbac_policy_id || null,
  });

  // Send email asynchronously
  emailService.sendOrganizationInviteEmail(email, tokenStr, org.name).catch(err => {
    console.error('[email] Failed to send organization invite:', err);
  });

  res.status(201).json({
    success: true,
    message: 'Invitation sent successfully',
    data: invite,
  });
});

/**
 * GET /api/v1/invites/organizations/:orgId
 */
const listOrganizationInvites = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const { limit, offset, page } = parsePagination(req.query);
  const filters = { status: req.query.status };

  const { rows, total } = await InviteModel.findByOrg(orgId, limit, offset, filters);

  res.status(200).json({
    success: true,
    data: rows,
    meta: buildPaginationMeta(total, page, limit),
  });
});

/**
 * POST /api/v1/invites/events/:eventId
 * Requires Phase 6 event tables, but implementing here for completeness.
 * The route will be mounted in event routes or global invite routes.
 */
const createEventInvite = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { email } = req.body;

  if (!email) throw new ApiError(400, 'Email is required');

  // We don't have EventModel fully built until Phase 6, so we use a raw query to check
  const { rows } = await db.query(`SELECT id, title, organization_id FROM events WHERE id = $1`, [eventId]);
  const event = rows[0];
  if (!event) throw new ApiError(404, 'Event not found');

  const tokenStr = generateToken();

  const invite = await InviteModel.create({
    type: 'event',
    target_id: eventId,
    email,
    token: tokenStr,
    expires_at: daysFromNow(7),
    invited_by_member_id: req.member.id, // Assume req.member is populated by route middleware
  });

  emailService.sendEventInviteEmail(email, tokenStr, event.title).catch(err => {
    console.error('[email] Failed to send event invite:', err);
  });

  res.status(201).json({
    success: true,
    message: 'Event invitation sent successfully',
    data: invite,
  });
});

/**
 * POST /api/v1/invites/accept
 */
const acceptInvite = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const userId = req.user.id;

  if (!token) throw new ApiError(400, 'Token is required');

  const invite = await InviteModel.findByToken(token);
  if (!invite) throw new ApiError(404, 'Invalid or expired invite token');

  if (invite.status === 'accepted') throw new ApiError(400, 'This invite has already been accepted');
  if (invite.status === 'expired' || new Date(invite.expires_at) < new Date()) {
    throw new ApiError(400, 'This invite has expired');
  }

  // Ensure the invite is for the logged-in user's email
  if (invite.email.toLowerCase() !== req.user.email.toLowerCase()) {
    throw new ApiError(403, 'This invite was sent to a different email address');
  }

  await db.withTransaction(async (client) => {
    if (invite.type === 'organization') {
      // Create member record (handle conflict if already member)
      await client.query(
        `INSERT INTO organization_members (organization_id, user_id, role, status, pbac_policy_id, joined_at)
         VALUES ($1, $2, 'member', 'active', $3, NOW())
         ON CONFLICT (organization_id, user_id) DO UPDATE SET status = 'active'`,
        [invite.target_id, userId, invite.pbac_policy_id]
      );
    } else if (invite.type === 'event') {
      // Create event_allowed_users record (Phase 6 table)
      await client.query(
        `INSERT INTO event_allowed_users (event_id, user_id, added_by_member_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (event_id, user_id) DO NOTHING`,
        [invite.target_id, userId, invite.invited_by_member_id]
      );
    }

    // Mark invite as accepted
    await client.query(`UPDATE invites SET status = 'accepted', updated_at = NOW() WHERE id = $1`, [invite.id]);
  });

  res.status(200).json({
    success: true,
    message: `Successfully joined ${invite.type}`,
  });
});

module.exports = {
  createOrganizationInvite,
  listOrganizationInvites,
  createEventInvite,
  acceptInvite,
};
