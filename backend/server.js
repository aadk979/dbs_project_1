'use strict';

/**
 * server.js
 * HTTP server entry point.
 * Imports the Express app and starts listening on the configured port.
 */

const app = require('./app');
const env = require('./configs/env');

const server = app.listen(env.port, () => {
  console.log(`[server] Running in ${env.nodeEnv} mode`);
  console.log(`[server] Listening on http://localhost:${env.port}`);
  console.log(`[server] API available at http://localhost:${env.port}/api/v1`);
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\n[server] ${signal} received — shutting down gracefully...`);
  server.close(() => {
    console.log('[server] HTTP server closed.');
    process.exit(0);
  });

  // Force-quit after 10 s if graceful shutdown hangs
  setTimeout(() => {
    console.error('[server] Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Catch unhandled rejections / uncaught exceptions so they don't silently swallow errors
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err);
  process.exit(1);
});
