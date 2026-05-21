'use strict';

/**
 * middlewares/authenticate.js
 * Verifies JWT Access Token from the Authorization header.
 * Attaches the user object to req.user on success.
 */

const authService = require('../services/auth.service');
const UserModel = require('../models/user.model');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authentication required');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = authService.verifyAccessToken(token);
    
    // Check if user still exists and is not soft-deleted
    const user = await UserModel.findById(decoded.sub);
    if (!user) {
      throw new ApiError(401, 'User associated with this token no longer exists');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token expired');
    }
    throw new ApiError(401, 'Invalid token');
  }
});

module.exports = authenticate;
