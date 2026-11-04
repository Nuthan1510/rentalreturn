import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';

// Validate and replace req[source] with the parsed (coerced, trimmed) value.
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req.body && source === 'body' ? req.body : req[source]);
  if (!result.success) return next(result.error);
  req[source === 'query' ? 'validQuery' : source] = result.data;
  next();
};

export const validateId = (param = 'id') => (req, _res, next) => {
  if (!mongoose.isValidObjectId(req.params[param])) {
    return next(new AppError(400, 'Invalid id format'));
  }
  next();
};
