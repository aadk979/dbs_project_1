'use strict';

/**
 * utils/paginate.js
 * Pagination helper for all list endpoints.
 * Enforces sane bounds on limit and page values.
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse pagination parameters from a request query object.
 *
 * @param {object} query - Express req.query
 * @param {string|number} [query.page=1]  - 1-indexed page number
 * @param {string|number} [query.limit=20] - Items per page (max 100)
 * @returns {{ limit: number, offset: number, page: number }}
 */
const parsePagination = (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT)
  );
  const offset = (page - 1) * limit;
  return { limit, offset, page };
};

/**
 * Build a pagination metadata object to include in list API responses.
 *
 * @param {number} total  - Total number of matching rows (from COUNT query)
 * @param {number} page   - Current page (1-indexed)
 * @param {number} limit  - Items per page
 * @returns {{ total: number, page: number, limit: number, totalPages: number, hasNext: boolean, hasPrev: boolean }}
 */
const buildPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

module.exports = { parsePagination, buildPaginationMeta };
