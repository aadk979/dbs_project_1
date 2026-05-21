'use strict';

/**
 * middlewares/validate.js
 * Generic request validation middleware factory.
 * Validates req.body, req.params, or req.query against a plain validator function.
 *
 * Usage:
 *   router.post('/register', validate(registerSchema), authController.register);
 *
 * The schema is a function that receives the data and returns:
 *   { error: string | null }  where error is null if valid
 *
 * For Phase 1 this is a lightweight bespoke validator.
 * It can be swapped for Zod or Joi schemas in future without changing route code.
 */

const ApiError = require('../utils/ApiError');

/**
 * @param {Function} schemaFn - (data) => { error: string|null }
 * @param {'body'|'params'|'query'} [source='body']
 */
const validate = (schemaFn, source = 'body') => (req, res, next) => {
  const data = req[source];
  const { error } = schemaFn(data);
  if (error) {
    return next(new ApiError(400, error));
  }
  return next();
};

module.exports = validate;
