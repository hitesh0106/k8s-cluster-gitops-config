// ============================================================================
// Configuration Management
// Centralized config using environment variables with sensible defaults
// ============================================================================

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Application
  app: {
    name: process.env.APP_NAME || 'k8s-cicd-api',
    version: process.env.APP_VERSION || '1.0.0',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json', // 'json' for production, 'simple' for dev
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100, // limit each IP to 100 requests per windowMs
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE',
  },

  // Health Check
  health: {
    // Simulates dependency check (e.g., database connectivity)
    checkDependencies: process.env.HEALTH_CHECK_DEPS === 'true',
  },
};

module.exports = config;
