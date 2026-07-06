const { logger } = require('../utils/logger');

function errorHandler(err, _req, res, _next) {
  const statusCode = err.status || err.statusCode || 500;
  const safeMessage = statusCode >= 500 ? 'Internal server error' : err.message;

  if (statusCode >= 500) {
    logger.error({ err, statusCode }, 'Unhandled error');
  } else {
    logger.warn({ err, statusCode }, 'Application error');
  }

  res.status(statusCode).json({
    error: safeMessage,
    ...(process.env.NODE_ENV === 'development' && statusCode >= 500
      ? { detail: err.message }
      : {}),
  });
}

function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Not found' });
}

class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

module.exports = { errorHandler, notFoundHandler, AppError };
