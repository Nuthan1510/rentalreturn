import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';

export const notFoundHandler = (req, _res, next) => {
  next(new AppError(404, `Route ${req.method} ${req.originalUrl} not found`));
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  let status = 500;
  let message = 'Something went wrong on our side';
  let details;

  if (err instanceof ZodError) {
    status = 400;
    message = 'Please fix the highlighted fields';
    details = err.issues.map((i) => ({ field: i.path.join('.') || 'body', message: i.message }));
  } else if (err instanceof AppError) {
    ({ status, message, details } = err);
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err?.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `That ${field.toUpperCase()} already exists`;
    details = [{ field, message }];
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON';
  }

  if (status >= 500) console.error(err);
  res.status(status).json({ error: { status, message, details } });
};
