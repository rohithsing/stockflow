import { HttpError } from '../lib/http.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.details ? { fields: err.details } : {}),
    });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong on our side' });
}
