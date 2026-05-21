'use strict';

/**
 * services/pbac.service.js
 * Policy-Based Access Control logic.
 */

const PbacPolicyModel = require('../models/pbacPolicy.model');

// Base defaults if no specific policy is attached to the member.
const ROLE_DEFAULTS = {
  admin: {
    users_read: true, users_write: false,
    organization_read: true, organization_write: true,
    members_read: true, members_invite: true, members_write: true, members_remove: true, members_change_role: true, members_assign_pbac: true,
    events_read: true, events_write: true, events_update: true, events_delete: true, events_publish: true, events_lock: true,
    attendance_code_read: true, attendance_code_rotate: true,
    attendance_read: true, attendance_submit: true, attendance_override: true,
    analytics_read: true
  },
  member: {
    users_read: true, users_write: false,
    organization_read: true, organization_write: false,
    members_read: true, members_invite: false, members_write: false, members_remove: false, members_change_role: false, members_assign_pbac: false,
    events_read: true, events_write: false, events_update: false, events_delete: false, events_publish: false, events_lock: false,
    attendance_code_read: true, attendance_code_rotate: false,
    attendance_read: false, attendance_submit: true, attendance_override: false,
    analytics_read: false
  }
};

/**
 * Return an object where all permissions are true.
 */
const getRootAdminPolicy = () => {
  const policy = {};
  PbacPolicyModel.ALL_PERMISSION_COLS.forEach(col => {
    policy[col] = true;
  });
  return policy;
};

/**
 * Resolve the effective PBAC policy for a given member.
 * 
 * Hierarchy:
 * 1. is_root_admin -> all true
 * 2. Custom pbac_policy_id attached -> use custom policy from DB
 * 3. Fallback to base role defaults ('admin' or 'member')
 * 
 * @param {object} member 
 * @returns {Promise<object>}
 */
const resolvePbac = async (member) => {
  if (member.is_root_admin) {
    return getRootAdminPolicy();
  }

  if (member.pbac_policy_id) {
    const customPolicy = await PbacPolicyModel.findById(member.pbac_policy_id);
    if (customPolicy) {
      return customPolicy;
    }
  }

  return ROLE_DEFAULTS[member.role] || ROLE_DEFAULTS['member'];
};

/**
 * Check if a member has a specific permission.
 * 
 * @param {object} member 
 * @param {string} permissionKey 
 * @returns {Promise<boolean>}
 */
const hasPermission = async (member, permissionKey) => {
  if (member.is_root_admin) return true;
  
  // To avoid hitting the DB constantly if policy is already resolved and attached to member,
  // we check if member.pbac_policy exists. If not, resolve it.
  if (!member.pbac_policy) {
    member.pbac_policy = await resolvePbac(member);
  }
  
  return !!member.pbac_policy[permissionKey];
};

module.exports = {
  getRootAdminPolicy,
  resolvePbac,
  hasPermission,
};
