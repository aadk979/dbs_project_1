'use strict';

/**
 * routes/auth.routes.js
 * Authentication and OAuth routes.
 */

const express = require('express');
const passport = require('passport');
const authController = require('../controllers/auth.controller');
const authService = require('../services/auth.service');
const authenticate = require('../middlewares/authenticate');
const env = require('../configs/env');
const UserModel = require('../models/user.model');

const router = express.Router();

// ---- Local Auth ----
router.post('/register', authController.register);
router.get('/verify-email', authController.verifyEmail);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// ---- OAuth Helper ----
const handleOAuthCallback = async (req, res) => {
  if (!req.user) {
    return res.redirect(`${env.frontendUrl}/login?error=oauth_failed`);
  }

  // Generate tokens
  const tokens = authService.generateTokenPair(req.user.id);
  
  // Update last_sign_in_at
  await UserModel.updateById(req.user.id, { last_sign_in_at: new Date().toISOString() });

  // Redirect to frontend with tokens in URL hash (frontend will extract and store them)
  const redirectUrl = `${env.frontendUrl}/login/oauth?access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`;
  res.redirect(redirectUrl);
};

// ---- Google OAuth ----
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${env.frontendUrl}/login?error=google_failed` }),
  handleOAuthCallback
);

// ---- GitHub OAuth ----
router.get(
  '/github',
  passport.authenticate('github', { scope: ['user:email'], session: false })
);

router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${env.frontendUrl}/login?error=github_failed` }),
  handleOAuthCallback
);

// ---- Protected Route Example (for testing authenticate middleware) ----
router.get('/me', authenticate, (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      id: req.user.id,
      full_name: req.user.full_name,
      email: req.user.email,
      profile_image_url: req.user.profile_image_url,
    },
  });
});

module.exports = router;
