// ============================================================================
// Express Server Entry Point
// Production-ready with graceful shutdown, structured logging, security headers
// ============================================================================

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const config = require('./config');
const logger = require('./middleware/logger');
const { router: healthRouter, setReady, setNotReady } = require('./routes/health');
const apiRouter = require('./routes/api');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// ─────────────────────────────────────────────────────────────────────────────
// Initialize Express App
// ─────────────────────────────────────────────────────────────────────────────
const app = express();

// ─────────────────────────────────────────────────────────────────────────────
// Request ID Middleware (for distributed tracing)
// ─────────────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// Security Middleware
// ─────────────────────────────────────────────────────────────────────────────
app.use(helmet());                    // Security headers
app.use(cors(config.cors));           // CORS handling
app.use(compression());              // Gzip compression

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiting (DDoS protection)
// ─────────────────────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
});
app.use('/api/', limiter);

// ─────────────────────────────────────────────────────────────────────────────
// Body Parsing
// ─────────────────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Request Logging (Morgan → Winston)
// ─────────────────────────────────────────────────────────────────────────────
const morganStream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

app.use(
  morgan(
    ':method :url :status :res[content-length] - :response-time ms',
    {
      stream: morganStream,
      skip: (req) => req.url === '/health/live', // Don't log liveness probe spam
    }
  )
);

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'K8s CI/CD API is running',
    version: config.app.version,
    docs: '/api/v1/info',
  });
});

// Health check routes (no rate limiting — K8s probes need unrestricted access)
app.use('/health', healthRouter);

// API routes
app.use('/api/v1', apiRouter);

// ─────────────────────────────────────────────────────────────────────────────
// Error Handling
// ─────────────────────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─────────────────────────────────────────────────────────────────────────────
// Server Startup
// ─────────────────────────────────────────────────────────────────────────────
let server;

const startServer = () => {
  server = app.listen(config.port, () => {
    logger.info(`🚀 Server started`, {
      port: config.port,
      environment: config.nodeEnv,
      pid: process.pid,
    });

    // Mark app as ready for K8s readiness probe
    setReady();
  });

  // Handle server errors
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${config.port} is already in use`);
      process.exit(1);
    }
    throw error;
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Graceful Shutdown
// Kubernetes sends SIGTERM before killing a pod. We use this to:
// 1. Stop accepting new connections
// 2. Finish processing in-flight requests
// 3. Close database connections, flush logs, etc.
// ─────────────────────────────────────────────────────────────────────────────
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Mark as not ready — K8s readiness probe will fail,
  // so no new traffic is routed to this pod
  setNotReady();

  // Give K8s time to update endpoints (remove pod from service)
  const SHUTDOWN_DELAY = parseInt(process.env.SHUTDOWN_DELAY_MS, 10) || 5000;

  setTimeout(() => {
    if (server) {
      server.close((err) => {
        if (err) {
          logger.error('Error during server shutdown', { error: err.message });
          process.exit(1);
        }

        logger.info('Server shut down gracefully');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  }, SHUTDOWN_DELAY);

  // Force shutdown after 30 seconds (safety net)
  setTimeout(() => {
    logger.error('Forced shutdown — could not close connections in time');
    process.exit(1);
  }, 30000);
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: reason?.toString() });
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer();

// Export for testing
module.exports = app;
