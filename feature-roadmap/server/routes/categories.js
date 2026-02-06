const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/categories - Get all categories for organization
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, COUNT(s.id) as suggestion_count
       FROM categories c
       LEFT JOIN suggestions s ON c.id = s.category_id
       WHERE c.organization_id = $1
       GROUP BY c.id
       ORDER BY c.sort_order, c.name`,
      [req.user.organization_id]
    );

    const categories = result.rows.map(cat => ({
      id: cat.id,
      name: cat.name,
      color: cat.color,
      sortOrder: cat.sort_order,
      suggestionCount: parseInt(cat.suggestion_count),
    }));

    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /api/categories - Create new category (admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, color = '#6b7280' } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check if category already exists
    const existing = await db.query(
      'SELECT id FROM categories WHERE organization_id = $1 AND LOWER(name) = LOWER($2)',
      [req.user.organization_id, name]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    // Get max sort order
    const maxOrder = await db.query(
      'SELECT COALESCE(MAX(sort_order), 0) as max_order FROM categories WHERE organization_id = $1',
      [req.user.organization_id]
    );

    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO categories (id, organization_id, name, color, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, req.user.organization_id, name, color, maxOrder.rows[0].max_order + 1]
    );

    const category = result.rows[0];

    res.status(201).json({
      id: category.id,
      name: category.name,
      color: category.color,
      sortOrder: category.sort_order,
      suggestionCount: 0,
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PATCH /api/categories/:id - Update category (admin only)
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, sortOrder } = req.body;

    // Verify category belongs to organization
    const existing = await db.query(
      'SELECT * FROM categories WHERE id = $1 AND organization_id = $2',
      [id, req.user.organization_id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }
    if (color !== undefined) {
      updates.push(`color = $${paramIndex}`);
      values.push(color);
      paramIndex++;
    }
    if (sortOrder !== undefined) {
      updates.push(`sort_order = $${paramIndex}`);
      values.push(sortOrder);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    values.push(id);
    const result = await db.query(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      color: result.rows[0].color,
      sortOrder: result.rows[0].sort_order,
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /api/categories/:id - Delete category (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has suggestions
    const suggestions = await db.query(
      'SELECT COUNT(*) as count FROM suggestions WHERE category_id = $1',
      [id]
    );

    if (parseInt(suggestions.rows[0].count) > 0) {
      // Set suggestions' category to null instead of blocking
      await db.query(
        'UPDATE suggestions SET category_id = NULL WHERE category_id = $1',
        [id]
      );
    }

    const result = await db.query(
      'DELETE FROM categories WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, req.user.organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
