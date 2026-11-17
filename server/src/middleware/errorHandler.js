import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
}

// Express 5 sends async errors here automatically
export function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Server error';

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }
  if (err.code === 11000) {
    status = 409;
    message = `${Object.keys(err.keyValue).join(', ')} already exists`;
  }
  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid id';
  }

  if (status >= 500) logger.error(err.stack || err.message);

  res.status(status).json({
    success: false,
    message,
    errors: err.errors && status !== 400 ? undefined : err.errors,
    ...(env.isProd ? {} : { stack: status >= 500 ? err.stack : undefined }),
  });
}
