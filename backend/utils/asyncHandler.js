'use strict';

/**
 * utils/asyncHandler.js
 * Wraps an async Express route/controller function and forwards any thrown
 * errors to the next() error handler — eliminating repetitive try/catch boilerplate.
 *
 * @param {Function} fn - Async controller function (req, res, next) => Promise
 * @returns {Function} Express-compatible middleware
 *
 * @example
 * const getUser = asyncHandler(async (req, res) => {
 *   const user = await UserModel.findById(req.params.id);
 *   if (!user) throw new ApiError(404, 'User not found');
 *   res.json(user);
 * });
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
