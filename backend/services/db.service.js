'use strict';

/**
 * services/db.service.js
 * Thin wrapper around the pg pool.
 * All model files and services should use these helpers instead of importing
 * the pool directly, so connection handling is centralised.
 */

const pool = require('../configs/db');

/**
 * Execute a single parameterised query and return the result.
 * @param {string} text  - SQL query string with $1, $2, … placeholders
 * @param {Array}  params - Parameter values
 * @returns {Promise<pg.QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

/**
 * Acquire a dedicated client from the pool.
 * The caller MUST call client.release() when finished.
 * Prefer withTransaction() for transactional work.
 * @returns {Promise<pg.PoolClient>}
 */
const getClient = () => pool.connect();

/**
 * Execute an async callback inside a BEGIN … COMMIT / ROLLBACK transaction.
 * The pool client is acquired, passed to the callback, then released.
 *
 * @param {(client: pg.PoolClient) => Promise<T>} callback
 * @returns {Promise<T>}
 *
 * @example
 * const result = await withTransaction(async (client) => {
 *   await client.query('INSERT INTO …', […]);
 *   await client.query('UPDATE …', […]);
 *   return someValue;
 * });
 */
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { query, getClient, withTransaction };
