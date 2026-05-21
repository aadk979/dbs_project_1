'use strict';

/**
 * utils/ApiError.js
 * Custom application error class.
 * All error responses throughout the app must use this class so that the
 * global errorHandler middleware can handle them consistently.
 *
 * @example
 * throw new ApiError(404, 'User not found');
 * throw new ApiError(403, 'Insufficient permissions');
 */

class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (e.g. 400, 401, 403, 404, 409, 500)
   * @param {string} message    - Human-readable error message
   * @param {boolean} [isOperational=true] - True for expected errors, false for unexpected bugs
   */
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture stack trace (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;
