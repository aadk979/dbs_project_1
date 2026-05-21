'use strict';

/**
 * middlewares/errorHandler.js
 * Global Express error-handling middleware.
 * Must be registered LAST in app.js (after all routes).
 *
 * Handles:
 *  - ApiError instances → return their statusCode + message
 *  - PostgreSQL unique-violation errors (code 23505) → 409 Conflict
 *  - PostgreSQL foreign-key errors (code 23503) → 400 Bad Request
 *  - Unexpected errors → 500 with a safe generic message (full error logged server-side)
 */

const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Always log the full error server-side
  console.error(`[error] ${req.method} ${req.originalUrl}`, {
    name: err.name,
    message: err.message,
    statusCode: err.statusCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Known operational errors (thrown via ApiError)
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  // PostgreSQL unique constraint violation
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: 'A record with that value already exists.',
    });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      error: 'Referenced resource does not exist.',
    });
  }

  // PostgreSQL check constraint violation
  if (err.code === '23514') {
    return res.status(400).json({
      success: false,
      error: 'Data validation failed at the database level.',
    });
  }

  // JWT errors forwarded from authenticate middleware (belt-and-suspenders)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token.',
    });
  }

  // Unknown / unexpected errors — don't leak internals
  return res.status(500).json({
    success: false,
    error: 'An unexpected error occurred. Please try again later.',
  });
};

module.exports = errorHandler;
