// ============================================================================
// API Routes
// Sample CRUD endpoints with proper error handling and validation
// ============================================================================

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// In-memory data store (replace with database in production)
const items = new Map();

// Seed some initial data
const seedData = () => {
  const defaultItems = [
    { name: 'Kubernetes', description: 'Container orchestration platform', category: 'infrastructure' },
    { name: 'ArgoCD', description: 'GitOps continuous delivery tool', category: 'cicd' },
    { name: 'Terraform', description: 'Infrastructure as Code tool', category: 'infrastructure' },
  ];

  defaultItems.forEach((item) => {
    const id = uuidv4();
    items.set(id, {
      id,
      ...item,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });
};

seedData();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/items — List all items
// Supports pagination: ?page=1&limit=10
// ─────────────────────────────────────────────────────────────────────────────
router.get('/items', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const allItems = Array.from(items.values());

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedItems = allItems.slice(startIndex, endIndex);

  res.status(200).json({
    success: true,
    data: paginatedItems,
    pagination: {
      page,
      limit,
      total: allItems.length,
      totalPages: Math.ceil(allItems.length / limit),
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/items/:id — Get single item
// ─────────────────────────────────────────────────────────────────────────────
router.get('/items/:id', (req, res) => {
  const item = items.get(req.params.id);

  if (!item) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'ITEM_NOT_FOUND',
        message: `Item with id '${req.params.id}' not found`,
      },
    });
  }

  res.status(200).json({
    success: true,
    data: item,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/items — Create new item
// ─────────────────────────────────────────────────────────────────────────────
router.post('/items', (req, res) => {
  const { name, description, category } = req.body;

  // Validation
  const errors = [];
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required and must be a non-empty string' });
  }
  if (!description || typeof description !== 'string') {
    errors.push({ field: 'description', message: 'Description is required and must be a string' });
  }
  if (category && typeof category !== 'string') {
    errors.push({ field: 'category', message: 'Category must be a string' });
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: errors,
      },
    });
  }

  const id = uuidv4();
  const newItem = {
    id,
    name: name.trim(),
    description: description.trim(),
    category: category ? category.trim() : 'general',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  items.set(id, newItem);

  res.status(201).json({
    success: true,
    data: newItem,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/v1/items/:id — Update an item
// ─────────────────────────────────────────────────────────────────────────────
router.put('/items/:id', (req, res) => {
  const item = items.get(req.params.id);

  if (!item) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'ITEM_NOT_FOUND',
        message: `Item with id '${req.params.id}' not found`,
      },
    });
  }

  const { name, description, category } = req.body;

  const updatedItem = {
    ...item,
    name: name ? name.trim() : item.name,
    description: description ? description.trim() : item.description,
    category: category ? category.trim() : item.category,
    updatedAt: new Date().toISOString(),
  };

  items.set(req.params.id, updatedItem);

  res.status(200).json({
    success: true,
    data: updatedItem,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/items/:id — Delete an item
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/items/:id', (req, res) => {
  const item = items.get(req.params.id);

  if (!item) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'ITEM_NOT_FOUND',
        message: `Item with id '${req.params.id}' not found`,
      },
    });
  }

  items.delete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Item deleted successfully',
    data: { id: req.params.id },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/info — Application info endpoint
// ─────────────────────────────────────────────────────────────────────────────
router.get('/info', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      name: 'k8s-cicd-api',
      version: '1.0.0',
      description: 'Production-grade REST API for K8s CI/CD GitOps project',
      endpoints: {
        health: '/health/live, /health/ready, /health/startup',
        api: '/api/v1/items (GET, POST), /api/v1/items/:id (GET, PUT, DELETE)',
        info: '/api/v1/info',
      },
    },
  });
});

module.exports = router;
