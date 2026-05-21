'use strict';

/**
 * controllers/pbacPolicy.controller.js
 * PBAC Policies request handling.
 */

const PbacPolicyModel = require('../models/pbacPolicy.model');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /organizations/:orgId/pbac-policies
 */
const createPolicy = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const { policy_name, description, ...permissions } = req.body;

  if (!policy_name) throw new ApiError(400, 'Policy name is required');

  const policyData = {
    organization_id: orgId,
    policy_name,
    description,
    created_by_member_id: req.member.id,
    ...permissions
  };

  const policy = await PbacPolicyModel.create(policyData);

  res.status(201).json({
    success: true,
    message: 'Policy created successfully',
    data: policy,
  });
});

/**
 * GET /organizations/:orgId/pbac-policies
 */
const listPolicies = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const policies = await PbacPolicyModel.findByOrganizationId(orgId);

  res.status(200).json({
    success: true,
    data: policies,
  });
});

/**
 * PUT /organizations/:orgId/pbac-policies/:id
 */
const updatePolicy = asyncHandler(async (req, res) => {
  const { id, orgId } = req.params;
  
  // Verify the policy belongs to this org
  const existing = await PbacPolicyModel.findById(id);
  if (!existing || existing.organization_id !== orgId) {
    throw new ApiError(404, 'Policy not found');
  }

  const updated = await PbacPolicyModel.updateById(id, req.body);
  
  res.status(200).json({
    success: true,
    message: 'Policy updated successfully',
    data: updated,
  });
});

/**
 * DELETE /organizations/:orgId/pbac-policies/:id
 */
const deletePolicy = asyncHandler(async (req, res) => {
  const { id, orgId } = req.params;

  // Verify the policy belongs to this org
  const existing = await PbacPolicyModel.findById(id);
  if (!existing || existing.organization_id !== orgId) {
    throw new ApiError(404, 'Policy not found');
  }

  await PbacPolicyModel.deleteById(id);

  res.status(200).json({
    success: true,
    message: 'Policy deleted successfully',
  });
});

module.exports = {
  createPolicy,
  listPolicies,
  updatePolicy,
  deletePolicy,
};
