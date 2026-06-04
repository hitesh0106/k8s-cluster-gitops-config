// ============================================================================
// Winston Logger Configuration
// Structured JSON logging for production environments
// ============================================================================

const winston = require('winston');
const config = require('../config');

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

// Custom format for development (human-readable)
const devFormat = printf(({ level, message, timestamp: ts, ...metadata }) => {
  let msg = `${ts} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  defaultMeta: {
    service: config.app.name,
    version: config.app.version,
    environment: config.nodeEnv,
  },
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    errors({ stack: true })
  ),
  transports: [],
  // Don't exit on uncaught exceptions — let the process manager handle it
  exitOnError: false,
});

// Add appropriate transport based on environment
if (config.nodeEnv === 'production' || config.logging.format === 'json') {
  // Production: JSON format for log aggregation (Loki, ELK, etc.)
  logger.add(
    new winston.transports.Console({
      format: combine(json()),
    })
  );
} else {
  // Development: Human-readable colored output
  logger.add(
    new winston.transports.Console({
      format: combine(colorize(), devFormat),
    })
  );
}

module.exports = logger;
