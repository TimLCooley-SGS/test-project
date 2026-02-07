const express = require('express');
const db = require('../db');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');
const { getStripeForRequest, getMode, clearModeCache, testKeySet, liveKeySet } = require('../lib/stripe');

const sgMail = require('@sendgrid/mail');
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const router = express.Router();

// Public branding endpoint (no auth required)
router.get('/branding', async (req, res) => {
  try {
    const [settingsResult, slugResult] = await Promise.all([
      db.query(
        `SELECT key, value FROM platform_settings WHERE key IN ('platform_logo', 'platform_favicon', 'platform_brand_name')`
      ),
      db.query(
        `SELECT o.slug FROM users u
         JOIN organizations o ON u.organization_id = o.id
         WHERE u.is_super_admin = true AND o.is_active = true
         LIMIT 1`
      ),
    ]);
    const map = {};
    settingsResult.rows.forEach(r => { map[r.key] = r.value; });
    res.json({
      logo: map['platform_logo'] || null,
      favicon: map['platform_favicon'] || null,
      brandName: map['platform_brand_name'] || null,
      boardSlug: slugResult.rows[0]?.slug || null,
    });
  } catch (error) {
    console.error('Platform branding error:', error);
    res.status(500).json({ error: 'Failed to fetch branding' });
  }
});

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
        (SELECT COUNT(*) FROM suggestions s WHERE s.organization_id = o.id) as suggestion_count,
        sub.status as subscription_status,
        sub.cancel_at_period_end,
        sub.current_period_end,
        sub.stripe_subscription_id
      FROM organizations o
      LEFT JOIN LATERAL (
        SELECT s.status, s.cancel_at_period_end, s.current_period_end, s.stripe_subscription_id
        FROM subscriptions s
        WHERE s.organization_id = o.id
        ORDER BY s.created_at DESC
        LIMIT 1
      ) sub ON true
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

    // Send deactivation email to org admin(s) when is_active set to false
    if (is_active === false && process.env.SENDGRID_API_KEY && process.env.FROM_EMAIL) {
      const orgName = result.rows[0].name;
      const adminResult = await db.query(
        `SELECT email FROM users WHERE organization_id = $1 AND role = 'admin'`,
        [id]
      );

      if (adminResult.rows.length > 0) {
        let subject = 'Your organization has been deactivated';
        let html = `
          <h2>Organization Deactivated</h2>
          <p>Your organization <strong>${orgName}</strong> has been deactivated by the platform administrator.</p>
          <p>Users in your organization will no longer be able to access the platform until the account is reactivated.</p>
          <p>If you believe this was done in error, please contact support.</p>
        `;

        try {
          const tplResult = await db.query(
            "SELECT * FROM email_templates WHERE name = 'organization_deactivation' AND is_active = true"
          );
          if (tplResult.rows.length > 0) {
            const tpl = tplResult.rows[0];
            subject = tpl.subject.replace(/\{\{org_name\}\}/g, orgName);
            html = tpl.html_body.replace(/\{\{org_name\}\}/g, orgName);
          }
        } catch (tplErr) {
          console.error('Email template lookup failed, using fallback:', tplErr);
        }

        for (const { email } of adminResult.rows) {
          try {
            await sgMail.send({ to: email, from: process.env.FROM_EMAIL, subject, html });
          } catch (emailErr) {
            console.error(`Failed to send deactivation email to ${email}:`, emailErr);
          }
        }
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Platform org update error:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// POST /api/platform/organizations/:id/cancel-subscription
router.post('/organizations/:id/cancel-subscription', async (req, res) => {
  const stripe = await getStripeForRequest();
  try {
    const { id } = req.params;

    // Look up the org's active subscription
    const subResult = await db.query(
      `SELECT s.*, p.name as plan_name
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.organization_id = $1 AND s.status = 'active'
       ORDER BY s.created_at DESC LIMIT 1`,
      [id]
    );

    if (subResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active subscription found for this organization' });
    }

    const sub = subResult.rows[0];

    if (sub.cancel_at_period_end) {
      return res.status(400).json({ error: 'Subscription is already set to cancel' });
    }

    if (!stripe) {
      return res.status(400).json({ error: 'Stripe is not configured' });
    }

    // Set cancel_at_period_end in Stripe
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Update local DB
    await db.query(
      `UPDATE subscriptions SET cancel_at_period_end = true, updated_at = NOW() WHERE id = $1`,
      [sub.id]
    );

    // Look up org name and admin emails
    const orgResult = await db.query('SELECT name FROM organizations WHERE id = $1', [id]);
    const orgName = orgResult.rows[0]?.name || 'Your organization';

    const adminResult = await db.query(
      `SELECT email FROM users WHERE organization_id = $1 AND role = 'admin'`,
      [id]
    );

    // Calculate days remaining
    const endDate = new Date(sub.current_period_end);
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    const formattedEndDate = endDate.toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    // Send cancellation email to admin(s)
    if (process.env.SENDGRID_API_KEY && process.env.FROM_EMAIL && adminResult.rows.length > 0) {
      let subject = 'Your subscription has been canceled';
      let html = `
        <h2>Subscription Canceled</h2>
        <p>Your organization <strong>${orgName}</strong>'s <strong>${sub.plan_name}</strong> plan has been canceled by the platform administrator.</p>
        <p>You will continue to have access until <strong>${formattedEndDate}</strong> (${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining).</p>
        <p>After that date, your account will revert to the free plan.</p>
      `;

      try {
        const tplResult = await db.query(
          "SELECT * FROM email_templates WHERE name = 'subscription_cancellation' AND is_active = true"
        );
        if (tplResult.rows.length > 0) {
          const tpl = tplResult.rows[0];
          subject = tpl.subject
            .replace(/\{\{org_name\}\}/g, orgName)
            .replace(/\{\{plan_name\}\}/g, sub.plan_name)
            .replace(/\{\{days_remaining\}\}/g, String(daysRemaining))
            .replace(/\{\{end_date\}\}/g, formattedEndDate);
          html = tpl.html_body
            .replace(/\{\{org_name\}\}/g, orgName)
            .replace(/\{\{plan_name\}\}/g, sub.plan_name)
            .replace(/\{\{days_remaining\}\}/g, String(daysRemaining))
            .replace(/\{\{end_date\}\}/g, formattedEndDate);
        }
      } catch (tplErr) {
        console.error('Email template lookup failed, using fallback:', tplErr);
      }

      const emails = adminResult.rows.map(r => r.email);
      for (const email of emails) {
        try {
          await sgMail.send({
            to: email,
            from: process.env.FROM_EMAIL,
            subject,
            html,
          });
        } catch (emailErr) {
          console.error(`Failed to send cancellation email to ${email}:`, emailErr);
        }
      }
    }

    res.json({ success: true, cancel_at_period_end: true, current_period_end: sub.current_period_end });
  } catch (error) {
    console.error('Platform cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
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

// ========================================
// PLANS (Billing)
// ========================================

// GET /api/platform/plans — all plans including inactive
router.get('/plans', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM plans ORDER BY sort_order ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Platform plans error:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// POST /api/platform/plans — create plan + Stripe product/prices
router.post('/plans', async (req, res) => {
  const stripe = await getStripeForRequest();
  try {
    const { name, slug, description, price_monthly, price_yearly, features, sort_order, allow_theme, allow_integrations, allow_embed, max_users } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }

    let stripeProductId = null;
    let stripeMonthlyPriceId = null;
    let stripeYearlyPriceId = null;

    if (stripe) {
      // Create Stripe product
      const product = await stripe.products.create({
        name,
        description: description || undefined,
      });
      stripeProductId = product.id;

      // Create monthly price if > 0
      if (price_monthly > 0) {
        const monthlyPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: price_monthly,
          currency: 'usd',
          recurring: { interval: 'month' },
        });
        stripeMonthlyPriceId = monthlyPrice.id;
      }

      // Create yearly price if > 0
      if (price_yearly > 0) {
        const yearlyPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: price_yearly,
          currency: 'usd',
          recurring: { interval: 'year' },
        });
        stripeYearlyPriceId = yearlyPrice.id;
      }
    }

    const result = await db.query(
      `INSERT INTO plans (name, slug, description, price_monthly, price_yearly, features, stripe_product_id, stripe_price_monthly_id, stripe_price_yearly_id, sort_order, allow_theme, allow_integrations, allow_embed, max_users)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [name, slug, description || '', price_monthly || 0, price_yearly || 0, JSON.stringify(features || []), stripeProductId, stripeMonthlyPriceId, stripeYearlyPriceId, sort_order || 0, allow_theme || false, allow_integrations || false, allow_embed || false, max_users || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Platform plan create error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A plan with that slug already exists' });
    }
    res.status(500).json({ error: error.message || 'Failed to create plan' });
  }
});

// PATCH /api/platform/plans/:id — update plan + Stripe sync
router.patch('/plans/:id', async (req, res) => {
  const stripe = await getStripeForRequest();
  try {
    const { id } = req.params;
    const { name, description, price_monthly, price_yearly, features, is_active, sort_order, allow_theme, allow_integrations, allow_embed, max_users } = req.body;

    // Get current plan
    const current = await db.query('SELECT * FROM plans WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    const plan = current.rows[0];

    let stripeProductId = plan.stripe_product_id;
    let stripeMonthlyPriceId = plan.stripe_price_monthly_id;
    let stripeYearlyPriceId = plan.stripe_price_yearly_id;

    if (stripe && !stripeProductId) {
      // Plan exists in DB but not in Stripe — create product + prices
      const product = await stripe.products.create({
        name: name || plan.name,
        description: (description !== undefined ? description : plan.description) || undefined,
      });
      stripeProductId = product.id;

      const effectiveMonthly = price_monthly !== undefined ? price_monthly : plan.price_monthly;
      if (effectiveMonthly > 0) {
        const mp = await stripe.prices.create({
          product: product.id, unit_amount: effectiveMonthly, currency: 'usd',
          recurring: { interval: 'month' },
        });
        stripeMonthlyPriceId = mp.id;
      }

      const effectiveYearly = price_yearly !== undefined ? price_yearly : plan.price_yearly;
      if (effectiveYearly > 0) {
        const yp = await stripe.prices.create({
          product: product.id, unit_amount: effectiveYearly, currency: 'usd',
          recurring: { interval: 'year' },
        });
        stripeYearlyPriceId = yp.id;
      }
    } else if (stripe && stripeProductId) {
      // Update existing Stripe product
      if (name || description !== undefined) {
        await stripe.products.update(stripeProductId, {
          name: name || plan.name,
          description: description !== undefined ? description : plan.description,
        });
      }

      // If monthly price changed, create new price and archive old
      if (price_monthly !== undefined && price_monthly !== plan.price_monthly) {
        if (price_monthly > 0) {
          const newPrice = await stripe.prices.create({
            product: stripeProductId, unit_amount: price_monthly, currency: 'usd',
            recurring: { interval: 'month' },
          });
          if (plan.stripe_price_monthly_id) {
            await stripe.prices.update(plan.stripe_price_monthly_id, { active: false });
          }
          stripeMonthlyPriceId = newPrice.id;
        } else {
          if (plan.stripe_price_monthly_id) {
            await stripe.prices.update(plan.stripe_price_monthly_id, { active: false });
          }
          stripeMonthlyPriceId = null;
        }
      }

      // If yearly price changed, create new price and archive old
      if (price_yearly !== undefined && price_yearly !== plan.price_yearly) {
        if (price_yearly > 0) {
          const newPrice = await stripe.prices.create({
            product: stripeProductId, unit_amount: price_yearly, currency: 'usd',
            recurring: { interval: 'year' },
          });
          if (plan.stripe_price_yearly_id) {
            await stripe.prices.update(plan.stripe_price_yearly_id, { active: false });
          }
          stripeYearlyPriceId = newPrice.id;
        } else {
          if (plan.stripe_price_yearly_id) {
            await stripe.prices.update(plan.stripe_price_yearly_id, { active: false });
          }
          stripeYearlyPriceId = null;
        }
      }
    }

    const result = await db.query(
      `UPDATE plans SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        price_monthly = COALESCE($3, price_monthly),
        price_yearly = COALESCE($4, price_yearly),
        features = COALESCE($5, features),
        is_active = COALESCE($6, is_active),
        sort_order = COALESCE($7, sort_order),
        stripe_product_id = COALESCE($8, stripe_product_id),
        stripe_price_monthly_id = $9,
        stripe_price_yearly_id = $10,
        allow_theme = COALESCE($12, allow_theme),
        allow_integrations = COALESCE($13, allow_integrations),
        allow_embed = COALESCE($14, allow_embed),
        max_users = COALESCE($15, max_users),
        updated_at = NOW()
      WHERE id = $11 RETURNING *`,
      [
        name || null, description !== undefined ? description : null,
        price_monthly !== undefined ? price_monthly : null,
        price_yearly !== undefined ? price_yearly : null,
        features ? JSON.stringify(features) : null,
        is_active !== undefined ? is_active : null,
        sort_order !== undefined ? sort_order : null,
        stripeProductId, stripeMonthlyPriceId, stripeYearlyPriceId, id,
        allow_theme !== undefined ? allow_theme : null,
        allow_integrations !== undefined ? allow_integrations : null,
        allow_embed !== undefined ? allow_embed : null,
        max_users !== undefined ? max_users : null,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Platform plan update error:', error);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// DELETE /api/platform/plans/:id — soft-deactivate plan
router.delete('/plans/:id', async (req, res) => {
  const stripe = await getStripeForRequest();
  try {
    const { id } = req.params;

    const current = await db.query('SELECT * FROM plans WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    const plan = current.rows[0];

    // Archive in Stripe
    if (stripe && plan.stripe_product_id) {
      await stripe.products.update(plan.stripe_product_id, { active: false });
    }

    await db.query('UPDATE plans SET is_active = false, updated_at = NOW() WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Platform plan delete error:', error);
    res.status(500).json({ error: 'Failed to deactivate plan' });
  }
});

// ========================================
// STRIPE MODE
// ========================================

// GET /api/platform/stripe-mode
router.get('/stripe-mode', async (req, res) => {
  try {
    const mode = await getMode();
    res.json({ mode, testKeySet, liveKeySet });
  } catch (error) {
    console.error('Stripe mode fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch Stripe mode' });
  }
});

// PUT /api/platform/stripe-mode
router.put('/stripe-mode', async (req, res) => {
  try {
    const { mode } = req.body;
    if (mode !== 'test' && mode !== 'live') {
      return res.status(400).json({ error: 'Mode must be "test" or "live"' });
    }

    await db.query(
      `INSERT INTO platform_settings (key, value, description)
       VALUES ('stripe_mode', $1, 'Stripe API mode (test or live)')
       ON CONFLICT (key) DO UPDATE SET value = $1`,
      [mode]
    );

    clearModeCache();
    res.json({ mode, testKeySet, liveKeySet });
  } catch (error) {
    console.error('Stripe mode update error:', error);
    res.status(500).json({ error: 'Failed to update Stripe mode' });
  }
});

// ========================================
// PAYMENTS (Cross-org)
// ========================================

// GET /api/platform/payments — cross-org payment history filtered by stripe mode
router.get('/payments', async (req, res) => {
  try {
    const mode = await getMode();
    const result = await db.query(
      `SELECT p.*, o.name as organization_name
       FROM payments p
       JOIN organizations o ON p.organization_id = o.id
       WHERE p.stripe_mode = $1
       ORDER BY p.created_at DESC
       LIMIT 100`,
      [mode]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Platform payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

module.exports = router;
