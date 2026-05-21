'use strict';

/**
 * configs/passport.js
 * Passport OAuth strategy configurations.
 * Strategies are registered here and imported in app.js.
 * Actual find-or-create user logic lives in auth.service.js.
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const env = require('./env');

// auth.service is loaded lazily to avoid circular dependency issues at startup
let authService;
const getAuthService = () => {
  if (!authService) authService = require('../services/auth.service');
  return authService;
};

// ---- Google OAuth Strategy ----
passport.use(
  new GoogleStrategy(
    {
      clientID: env.google.clientId,
      clientSecret: env.google.clientSecret,
      callbackURL: env.google.callbackUrl,
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const service = getAuthService();
        const user = await service.findOrCreateOAuthUser({
          provider: 'google',
          providerAccountId: profile.id,
          email: profile.emails?.[0]?.value,
          fullName: profile.displayName,
          profileImageUrl: profile.photos?.[0]?.value,
          accessToken,
          refreshToken,
        });
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// ---- GitHub OAuth Strategy ----
passport.use(
  new GitHubStrategy(
    {
      clientID: env.github.clientId,
      clientSecret: env.github.clientSecret,
      callbackURL: env.github.callbackUrl,
      scope: ['user:email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const service = getAuthService();
        // GitHub may return multiple emails; pick the primary verified one
        const primaryEmail =
          profile.emails?.find((e) => e.primary && e.verified)?.value ||
          profile.emails?.[0]?.value;

        const user = await service.findOrCreateOAuthUser({
          provider: 'github',
          providerAccountId: String(profile.id),
          email: primaryEmail,
          fullName: profile.displayName || profile.username,
          profileImageUrl: profile.photos?.[0]?.value,
          accessToken,
          refreshToken,
        });
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Passport session serialization — not used (stateless JWT), but required
// by passport to avoid errors when session middleware is absent
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => done(null, { id }));

module.exports = passport;
