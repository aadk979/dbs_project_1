'use strict';

/**
 * app.js
 * Express application factory.
 * Registers all global middleware, mounts routes, and attaches the error handler.
 * Does NOT start the HTTP server — that lives in server.js.
 */

// Load and validate env vars first (will throw if any are missing)
require('./configs/env');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('./configs/passport');
const errorHandler = require('./middlewares/errorHandler');
const apiRouter = require('./routes/index');

const app = express();

// ---- Security headers ----
app.use(helmet());

// ---- CORS ----
// In production, replace the origin with your real frontend domain
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ---- Body parsers ----
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ---- Passport (stateless — no session) ----
app.use(passport.initialize());

// ---- Static files (Phase 10 — public/ folder) ----
// app.use(express.static('public'));

// ---- API routes ----
app.use('/api/v1', apiRouter);

// ---- 404 handler (must be after all routes) ----
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ---- Global error handler (must be last middleware) ----
app.use(errorHandler);

module.exports = app;
