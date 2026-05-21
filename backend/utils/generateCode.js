'use strict';

/**
 * utils/generateCode.js
 * Utility functions for generating random codes used throughout the app:
 * - Organization join codes
 * - Attendance Tracking Codes (ATCs)
 * - Email verification / password-reset tokens (UUID-based, in models)
 */

const crypto = require('crypto');

/**
 * Generate a random uppercase alphanumeric code of the specified length.
 * Uses crypto.randomBytes for cryptographic quality randomness.
 *
 * @param {number} [length=8] - Desired code length
 * @returns {string} e.g. "AB3K9PQZ"
 */
const generateCode = (length = 8) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes)
    .map((b) => alphabet[b % alphabet.length])
    .join('');
};

/**
 * Generate an Attendance Tracking Code (ATC).
 * Always uppercase alphanumeric, 8 characters.
 *
 * @returns {string} e.g. "K7PZXB3A"
 */
const generateAtcCode = () => generateCode(8);

/**
 * Generate an organization join code.
 * 6 uppercase alphanumeric characters.
 *
 * @returns {string} e.g. "AB3K9P"
 */
const generateJoinCode = () => generateCode(6);

/**
 * Generate a URL-safe random token string (hex, 48 chars = 24 bytes).
 * Used for email verification and password reset tokens.
 *
 * @returns {string}
 */
const generateToken = () => crypto.randomBytes(32).toString('hex');

module.exports = { generateCode, generateAtcCode, generateJoinCode, generateToken };
