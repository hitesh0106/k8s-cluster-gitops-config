// ============================================================================
// Health Check Routes
// Kubernetes-compatible liveness and readiness probes
// ============================================================================

const express = require('express');
const router = express.Router();
const config = require('../config');

// Track application readiness state
let isReady = false;

// Mark as ready after startup tasks complete
const setReady = () => {
  isReady = true;
};

// Mark as not ready (for graceful shutdown)
const setNotReady = () => {
  isReady = false;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /health/live — Liveness Probe
// Returns 200 if the process is alive. If this fails, K8s restarts the pod.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: config.app.version,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /health/ready — Readiness Probe
// Returns 200 only if the app is ready to serve traffic.
// If this fails, K8s removes the pod from the Service endpoints.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/ready', (req, res) => {
  if (!isReady) {
    return res.status(503).json({
      status: 'not_ready',
      message: 'Application is not ready to accept traffic',
      timestamp: new Date().toISOString(),
    });
  }

  const healthCheck = {
    status: 'ready',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    version: config.app.version,
    checks: {
      memory: {
        status: 'pass',
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
      },
    },
  };

  res.status(200).json(healthCheck);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /health/startup — Startup Probe (K8s 1.20+)
// Used for slow-starting containers. Once it passes, liveness kicks in.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/startup', (req, res) => {
  if (!isReady) {
    return res.status(503).json({
      status: 'starting',
      timestamp: new Date().toISOString(),
    });
  }

  res.status(200).json({
    status: 'started',
    timestamp: new Date().toISOString(),
  });
});

module.exports = { router, setReady, setNotReady };
