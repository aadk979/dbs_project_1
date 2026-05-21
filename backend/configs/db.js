'use strict';

/**
 * configs/db.js
 * PostgreSQL connection pool using the `pg` package.
 * Tests the connection on startup and exits the process if it fails.
 */

const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  user: env.db.user,
  password: env.db.password,
  // Sensible pool defaults for a production-ready app
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

/**
 * Test the connection on startup.
 * Logs success or exits the process on failure so the issue is immediately visible.
 */
pool.connect((err, client, release) => {
  if (err) {
    console.error('[db] Failed to connect to PostgreSQL:', err.message);
    process.exit(1);
  }
  client.query('SELECT NOW()', (queryErr) => {
    release();
    if (queryErr) {
      console.error('[db] Startup query failed:', queryErr.message);
      process.exit(1);
    }
    console.log(`[db] Connected to PostgreSQL at ${env.db.host}:${env.db.port}/${env.db.name}`);
  });
});

// Emit pool errors so they don't silently crash the process
pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message);
});

module.exports = pool;
