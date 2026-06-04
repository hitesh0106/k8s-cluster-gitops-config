// ============================================================================
// API Unit Tests (Jest + Supertest)
// Tests health endpoints, CRUD operations, and error handling
// ============================================================================

const request = require('supertest');
const app = require('../src/index');

// ─────────────────────────────────────────────────────────────────────────────
// Root Endpoint
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /', () => {
  it('should return welcome message', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('running');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Health Check Endpoints
// ─────────────────────────────────────────────────────────────────────────────
describe('Health Checks', () => {
  describe('GET /health/live', () => {
    it('should return alive status', async () => {
      const res = await request(app).get('/health/live');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('alive');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /health/ready', () => {
    it('should return ready status when server is up', async () => {
      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.checks.memory).toHaveProperty('used');
    });
  });

  describe('GET /health/startup', () => {
    it('should return started status', async () => {
      const res = await request(app).get('/health/startup');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('started');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// API Routes — CRUD Operations
// ─────────────────────────────────────────────────────────────────────────────
describe('API v1 Routes', () => {
  let createdItemId;

  // ─── GET /api/v1/info ────────────────────────────────────────────────
  describe('GET /api/v1/info', () => {
    it('should return application info', async () => {
      const res = await request(app).get('/api/v1/info');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('k8s-cicd-api');
    });
  });

  // ─── GET /api/v1/items ───────────────────────────────────────────────
  describe('GET /api/v1/items', () => {
    it('should return paginated items', async () => {
      const res = await request(app).get('/api/v1/items');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toHaveProperty('total');
      expect(res.body.pagination).toHaveProperty('page');
    });

    it('should support pagination params', async () => {
      const res = await request(app).get('/api/v1/items?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(2);
    });
  });

  // ─── POST /api/v1/items ──────────────────────────────────────────────
  describe('POST /api/v1/items', () => {
    it('should create a new item', async () => {
      const newItem = {
        name: 'Docker',
        description: 'Container runtime engine',
        category: 'containers',
      };

      const res = await request(app)
        .post('/api/v1/items')
        .send(newItem)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Docker');
      expect(res.body.data).toHaveProperty('id');

      createdItemId = res.body.data.id;
    });

    it('should return 400 for invalid data', async () => {
      const res = await request(app)
        .post('/api/v1/items')
        .send({ name: '' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ─── GET /api/v1/items/:id ───────────────────────────────────────────
  describe('GET /api/v1/items/:id', () => {
    it('should return a single item', async () => {
      const res = await request(app).get(`/api/v1/items/${createdItemId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Docker');
    });

    it('should return 404 for non-existent item', async () => {
      const res = await request(app).get('/api/v1/items/non-existent-id');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ITEM_NOT_FOUND');
    });
  });

  // ─── PUT /api/v1/items/:id ───────────────────────────────────────────
  describe('PUT /api/v1/items/:id', () => {
    it('should update an existing item', async () => {
      const res = await request(app)
        .put(`/api/v1/items/${createdItemId}`)
        .send({ name: 'Docker Engine' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Docker Engine');
    });

    it('should return 404 for non-existent item', async () => {
      const res = await request(app)
        .put('/api/v1/items/non-existent-id')
        .send({ name: 'test' });

      expect(res.status).toBe(404);
    });
  });

  // ─── DELETE /api/v1/items/:id ────────────────────────────────────────
  describe('DELETE /api/v1/items/:id', () => {
    it('should delete an existing item', async () => {
      const res = await request(app).delete(`/api/v1/items/${createdItemId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 for already deleted item', async () => {
      const res = await request(app).delete(`/api/v1/items/${createdItemId}`);
      expect(res.status).toBe(404);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Error Handling
// ─────────────────────────────────────────────────────────────────────────────
describe('Error Handling', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown-route');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
