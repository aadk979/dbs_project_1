'use strict';

/**
 * models/oauthAccount.model.js
 * Raw SQL queries for the oauth_accounts table.
 */

const db = require('../services/db.service');

/**
 * Find an OAuth account by provider name and provider-side account ID.
 * Returns null if not found.
 * @param {string} provider          - 'google' | 'github' | 'microsoft'
 * @param {string} providerAccountId - The ID from the OAuth provider
 */
const findByProvider = async (provider, providerAccountId) => {
  const { rows } = await db.query(
    `SELECT id, user_id, provider, provider_account_id, created_at
     FROM oauth_accounts
     WHERE provider = $1 AND provider_account_id = $2`,
    [provider, providerAccountId]
  );
  return rows[0] || null;
};

/**
 * Create a new OAuth account linkage.
 * @param {{ user_id, provider, provider_account_id, access_token?, refresh_token? }} data
 */
const create = async (data) => {
  const {
    user_id,
    provider,
    provider_account_id,
    access_token = null,
    refresh_token = null,
  } = data;

  const { rows } = await db.query(
    `INSERT INTO oauth_accounts (user_id, provider, provider_account_id, access_token, refresh_token)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, provider, provider_account_id, created_at`,
    [user_id, provider, provider_account_id, access_token, refresh_token]
  );
  return rows[0];
};

/**
 * Find all OAuth accounts linked to a given user ID.
 * @param {string} userId
 */
const findByUserId = async (userId) => {
  const { rows } = await db.query(
    `SELECT id, provider, provider_account_id, created_at
     FROM oauth_accounts
     WHERE user_id = $1
     ORDER BY created_at ASC`,
    [userId]
  );
  return rows;
};

module.exports = { findByProvider, create, findByUserId };
