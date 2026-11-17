import { ApiError } from '../utils/ApiError.js';

// Checks req.body (or query/params) with a zod schema
export const validate = (schema, where = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[where]);
  if (!result.success) {
    const errors = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    throw new ApiError(400, errors[0].message, errors);
  }
  if (where === 'body') req.body = result.data;
  else req.validated = result.data;
  next();
};
