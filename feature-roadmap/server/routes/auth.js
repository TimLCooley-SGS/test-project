const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { generateToken, authenticate } = require('../middleware/auth');

const sgMail = require('@sendgrid/mail');
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const router = express.Router();

// POST /api/auth/register - Register new organization and admin user
router.post('/register', async (req, res) => {
  const client = await db.getClient();

  try {
    const { organizationName, name, email, password } = req.body;

    // Validate input
    if (!organizationName || !name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Generate slug from organization name
    const slug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if organization slug already exists
    const existingOrg = await client.query(
      'SELECT id FROM organizations WHERE slug = $1',
      [slug]
    );

    if (existingOrg.rows.length > 0) {
      return res.status(400).json({ error: 'An organization with this name already exists' });
    }

    // Check if email already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    await client.query('BEGIN');

    // Create organization
    const orgId = uuidv4();
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 15); // 15-day trial

    await client.query(
      `INSERT INTO organizations (id, name, slug, plan, trial_ends_at)
       VALUES ($1, $2, $3, 'pro', $4)`,
      [orgId, organizationName, slug, trialEndsAt]
    );

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user (first user is always admin)
    const userId = uuidv4();
    await client.query(
      `INSERT INTO users (id, organization_id, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, $5, 'admin')`,
      [userId, orgId, email.toLowerCase(), passwordHash, name]
    );

    // Create default categories
    const defaultCategories = ['UI', 'Performance', 'Mobile', 'Dashboard', 'API', 'Security'];
    for (let i = 0; i < defaultCategories.length; i++) {
      await client.query(
        `INSERT INTO categories (organization_id, name, sort_order)
         VALUES ($1, $2, $3)`,
        [orgId, defaultCategories[i], i + 1]
      );
    }

    await client.query('COMMIT');

    // Generate token
    const token = generateToken(userId, orgId);

    res.status(201).json({
      message: 'Organization created successfully',
      token,
      user: {
        id: userId,
        name,
        email: email.toLowerCase(),
        role: 'admin',
        organizationId: orgId,
        organizationName,
        organizationSlug: slug,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  } finally {
    client.release();
  }
});

// POST /api/auth/login - Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const result = await db.query(
      `SELECT u.*, o.name as organization_name, o.slug as organization_slug, o.plan as organization_plan
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       WHERE u.email = $1 AND o.is_active = true`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await db.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = generateToken(user.id, user.organization_id);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isSuperAdmin: user.is_super_admin || false,
        organizationId: user.organization_id,
        organizationName: user.organization_name,
        organizationSlug: user.organization_slug,
        customerValue: user.customer_value,
        company: user.company,
        avatarUrl: user.avatar_url || null,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', authenticate, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      isSuperAdmin: req.user.is_super_admin || false,
      organizationId: req.user.organization_id,
      organizationName: req.user.organization_name,
      organizationSlug: req.user.organization_slug,
      customerValue: req.user.customer_value,
      company: req.user.company,
      avatarUrl: req.user.avatar_url || null,
    },
  });
});

// POST /api/auth/invite - Invite user to organization (admin only)
router.post('/invite', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { email, name, role = 'user' } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    // Check if user already exists in this organization
    const existing = await db.query(
      'SELECT id FROM users WHERE email = $1 AND organization_id = $2',
      [email.toLowerCase(), req.user.organization_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists in this organization' });
    }

    // Create user with temporary password (they should reset it)
    const tempPassword = Math.random().toString(36).slice(-12);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const userId = uuidv4();
    await db.query(
      `INSERT INTO users (id, organization_id, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, req.user.organization_id, email.toLowerCase(), passwordHash, name, role]
    );

    // In production, send an email with the temp password or a password reset link
    res.status(201).json({
      message: 'User invited successfully',
      user: {
        id: userId,
        email: email.toLowerCase(),
        name,
        role,
      },
      // Only return temp password in development
      ...(process.env.NODE_ENV !== 'production' && { tempPassword }),
    });
  } catch (error) {
    console.error('Invite error:', error);
    res.status(500).json({ error: 'Failed to invite user' });
  }
});

// POST /api/auth/forgot-password - Request password reset email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Look up user by email
    const result = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // If user exists, generate token and send email
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.query(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, token, expiresAt]
      );

      // Send email via SendGrid
      if (process.env.SENDGRID_API_KEY && process.env.FROM_EMAIL) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetLink = `${frontendUrl}/reset-password?token=${token}`;

        // Try to load email template from DB
        let subject = 'Reset Your Password - Feature Roadmap';
        let html = `
            <h2>Password Reset</h2>
            <p>You requested a password reset. Click the link below to set a new password:</p>
            <p><a href="${resetLink}">Reset Password</a></p>
            <p>This link expires in 1 hour.</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
          `;

        try {
          const tplResult = await db.query(
            "SELECT * FROM email_templates WHERE name = 'password_reset' AND is_active = true"
          );
          if (tplResult.rows.length > 0) {
            const tpl = tplResult.rows[0];
            subject = tpl.subject;
            html = tpl.html_body.replace(/\{\{reset_link\}\}/g, resetLink);
          }
        } catch (tplErr) {
          // Fall back to hardcoded template
        }

        const msg = {
          to: email.toLowerCase(),
          from: process.env.FROM_EMAIL,
          subject,
          html,
        };

        try {
          await sgMail.send(msg);
        } catch (emailErr) {
          console.error('SendGrid error:', emailErr);
        }
      }
    }

    // Always return success to avoid revealing if email exists
    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Find valid token
    const result = await db.query(
      `SELECT * FROM password_reset_tokens
       WHERE token = $1 AND used = false AND expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const resetToken = result.rows[0];

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user's password
    await db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, resetToken.user_id]
    );

    // Mark token as used
    await db.query(
      'UPDATE password_reset_tokens SET used = true WHERE id = $1',
      [resetToken.id]
    );

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
