// ============================================================================
// Centralized Error Handling Middleware
// Catches all unhandled errors and returns structured JSON responses
// ============================================================================

const config = require('../config');
const logger = require('./logger');

// Custom Application Error class
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'INTERNAL_ERROR';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 404 Handler — Catch routes that don't exist
// ─────────────────────────────────────────────────────────────────────────────
const notFoundHandler = (req, res, _next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      timestamp: new Date().toISOString(),
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Global Error Handler — Catches all thrown/next(err) errors
// ─────────────────────────────────────────────────────────────────────────────
const errorHandler = (err, req, res, _next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';

  // Handle specific error types
  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Request body contains invalid JSON';
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
  }

  // Log error
  logger.error('Unhandled error', {
    error: {
      message: err.message,
      code,
      stack: err.stack,
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      requestId: req.id,
    },
  });

  // Build response
  const response = {
    success: false,
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
    },
  };

  // Include stack trace in development mode only
  if (config.nodeEnv === 'development') {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = { AppError, notFoundHandler, errorHandler };
