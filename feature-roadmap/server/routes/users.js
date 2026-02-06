const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/users - Get all users in organization (admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, role, customer_value, company, crm_id, created_at, last_login_at
       FROM users
       WHERE organization_id = $1 AND email != 'anonymous@system.internal'
       ORDER BY created_at`,
      [req.user.organization_id]
    );

    const users = result.rows.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      customerValue: parseFloat(user.customer_value) || 0,
      company: user.company,
      crmId: user.crm_id,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
    }));

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id - Get single user
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Users can only view their own profile, admins can view all
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      `SELECT id, name, email, role, customer_value, company, crm_id, created_at, last_login_at
       FROM users
       WHERE id = $1 AND organization_id = $2`,
      [id, req.user.organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      customerValue: parseFloat(user.customer_value) || 0,
      company: user.company,
      crmId: user.crm_id,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PATCH /api/users/:id - Update user
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, customerValue, company, crmId } = req.body;

    // Users can only update their own profile (except role/customerValue)
    // Admins can update anyone
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only admins can change roles and customer values
    if ((role !== undefined || customerValue !== undefined || crmId !== undefined) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required to change role or customer value' });
    }

    // Verify user belongs to organization
    const existing = await db.query(
      'SELECT * FROM users WHERE id = $1 AND organization_id = $2',
      [id, req.user.organization_id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }
    if (email !== undefined) {
      // Check if email is already in use
      const emailCheck = await db.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email.toLowerCase(), id]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      updates.push(`email = $${paramIndex}`);
      values.push(email.toLowerCase());
      paramIndex++;
    }
    if (password !== undefined) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push(`password_hash = $${paramIndex}`);
      values.push(passwordHash);
      paramIndex++;
    }
    if (role !== undefined) {
      updates.push(`role = $${paramIndex}`);
      values.push(role);
      paramIndex++;
    }
    if (customerValue !== undefined) {
      updates.push(`customer_value = $${paramIndex}`);
      values.push(customerValue);
      paramIndex++;
    }
    if (company !== undefined) {
      updates.push(`company = $${paramIndex}`);
      values.push(company);
      paramIndex++;
    }
    if (crmId !== undefined) {
      updates.push(`crm_id = $${paramIndex}`);
      values.push(crmId);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    values.push(id);
    const result = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, name, email, role, customer_value, company, crm_id`,
      values
    );

    const user = result.rows[0];
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      customerValue: parseFloat(user.customer_value) || 0,
      company: user.company,
      crmId: user.crm_id,
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Can't delete yourself
    if (req.user.id === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if this is the only admin
    const admins = await db.query(
      `SELECT COUNT(*) as count FROM users
       WHERE organization_id = $1 AND role = 'admin'`,
      [req.user.organization_id]
    );

    const targetUser = await db.query(
      'SELECT role FROM users WHERE id = $1 AND organization_id = $2',
      [id, req.user.organization_id]
    );

    if (targetUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.rows[0].role === 'admin' && parseInt(admins.rows[0].count) <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only admin' });
    }

    await db.query(
      'DELETE FROM users WHERE id = $1 AND organization_id = $2',
      [id, req.user.organization_id]
    );

    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
