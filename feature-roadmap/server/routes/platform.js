const express = require('express');
const db = require('../db');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');

const sgMail = require('@sendgrid/mail');
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const router = express.Router();

// All platform routes require super admin
router.use(authenticate, requireSuperAdmin);

// ========================================
// ORGANIZATIONS
// ========================================

// GET /api/platform/organizations
router.get('/organizations', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT o.*,
        (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id) as user_count,
        (SELECT COUNT(*) FROM suggestions s WHERE s.organization_id = o.id) as suggestion_count
      FROM organizations o
      ORDER BY o.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Platform orgs error:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// PATCH /api/platform/organizations/:id
router.patch('/organizations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, plan, is_active } = req.body;

    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
    if (plan !== undefined) { fields.push(`plan = $${idx++}`); values.push(plan); }
    if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(is_active); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const result = await db.query(
      `UPDATE organizations SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Platform org update error:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// ========================================
// USERS
// ========================================

// GET /api/platform/users
router.get('/users', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.name, u.email, u.role, u.is_super_admin,
             u.created_at, u.last_login_at, u.organization_id,
             o.name as organization_name, o.slug as organization_slug
      FROM users u
      JOIN organizations o ON u.organization_id = o.id
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Platform users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PATCH /api/platform/users/:id
router.patch('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, is_super_admin } = req.body;

    const fields = [];
    const values = [];
    let idx = 1;

    if (role !== undefined) { fields.push(`role = $${idx++}`); values.push(role); }
    if (is_super_admin !== undefined) { fields.push(`is_super_admin = $${idx++}`); values.push(is_super_admin); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const result = await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, email, role, is_super_admin`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Platform user update error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/platform/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Platform user delete error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ========================================
// SETTINGS
// ========================================

// GET /api/platform/settings
router.get('/settings', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM platform_settings ORDER BY key');
    res.json(result.rows);
  } catch (error) {
    console.error('Platform settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/platform/settings/:key
router.put('/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    const result = await db.query(
      `INSERT INTO platform_settings (key, value, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value = $2, description = $3
       RETURNING *`,
      [key, value, description || null]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Platform settings update error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// ========================================
// EMAIL TEMPLATES
// ========================================

// GET /api/platform/email-templates
router.get('/email-templates', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM email_templates ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Platform email templates error:', error);
    res.status(500).json({ error: 'Failed to fetch email templates' });
  }
});

// PATCH /api/platform/email-templates/:id
router.patch('/email-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, html_body, is_active } = req.body;

    const fields = [];
    const values = [];
    let idx = 1;

    if (subject !== undefined) { fields.push(`subject = $${idx++}`); values.push(subject); }
    if (html_body !== undefined) { fields.push(`html_body = $${idx++}`); values.push(html_body); }
    if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(is_active); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const result = await db.query(
      `UPDATE email_templates SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Email template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Platform email template update error:', error);
    res.status(500).json({ error: 'Failed to update email template' });
  }
});

// POST /api/platform/email-templates/:id/test
router.post('/email-templates/:id/test', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('SELECT * FROM email_templates WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Email template not found' });
    }

    const template = result.rows[0];

    if (!process.env.SENDGRID_API_KEY || !process.env.FROM_EMAIL) {
      return res.status(400).json({ error: 'SendGrid not configured' });
    }

    await sgMail.send({
      to: req.user.email,
      from: process.env.FROM_EMAIL,
      subject: `[TEST] ${template.subject}`,
      html: template.html_body,
    });

    res.json({ message: `Test email sent to ${req.user.email}` });
  } catch (error) {
    console.error('Platform email test error:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// ========================================
// ANALYTICS
// ========================================

// GET /api/platform/analytics
router.get('/analytics', async (req, res) => {
  try {
    const [orgs, users, suggestions, votes, recentSuggestions, recentUsers] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM organizations'),
      db.query('SELECT COUNT(*) as count FROM users'),
      db.query('SELECT COUNT(*) as count FROM suggestions'),
      db.query('SELECT COUNT(*) as count FROM votes'),
      db.query(`
        SELECT s.id, s.title, s.status, s.created_at, o.name as organization_name
        FROM suggestions s
        JOIN organizations o ON s.organization_id = o.id
        ORDER BY s.created_at DESC LIMIT 10
      `),
      db.query(`
        SELECT u.id, u.name, u.email, u.created_at, o.name as organization_name
        FROM users u
        JOIN organizations o ON u.organization_id = o.id
        ORDER BY u.created_at DESC LIMIT 10
      `),
    ]);

    res.json({
      totalOrganizations: parseInt(orgs.rows[0].count),
      totalUsers: parseInt(users.rows[0].count),
      totalSuggestions: parseInt(suggestions.rows[0].count),
      totalVotes: parseInt(votes.rows[0].count),
      recentSuggestions: recentSuggestions.rows,
      recentUsers: recentUsers.rows,
    });
  } catch (error) {
    console.error('Platform analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
