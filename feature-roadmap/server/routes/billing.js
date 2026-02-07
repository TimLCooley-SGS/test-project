const express = require('express');
const db = require('../db');
const stripe = require('../lib/stripe');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Public endpoint — no auth required
router.get('/public-plans', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, slug, description, price_monthly, price_yearly, features, sort_order FROM plans WHERE is_active = true ORDER BY sort_order ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Public plans error:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// All billing routes below require authenticated admin
router.use(authenticate, requireAdmin);

// GET /api/billing/plans — list active plans
router.get('/plans', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM plans WHERE is_active = true ORDER BY sort_order ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Billing plans error:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// GET /api/billing/subscription — current org subscription + plan info
router.get('/subscription', async (req, res) => {
  try {
    const orgId = req.user.organization_id;

    const subResult = await db.query(
      `SELECT s.*, p.name as plan_name, p.slug as plan_slug, p.features, p.price_monthly, p.price_yearly
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.organization_id = $1
       ORDER BY s.created_at DESC LIMIT 1`,
      [orgId]
    );

    const orgResult = await db.query(
      'SELECT plan, trial_ends_at, stripe_customer_id FROM organizations WHERE id = $1',
      [orgId]
    );
    const org = orgResult.rows[0];

    res.json({
      subscription: subResult.rows[0] || null,
      currentPlan: org?.plan || 'starter',
      trialEndsAt: org?.trial_ends_at || null,
      hasStripeCustomer: !!org?.stripe_customer_id,
    });
  } catch (error) {
    console.error('Billing subscription error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// POST /api/billing/checkout — create Stripe Checkout Session
router.post('/checkout', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }

  try {
    const { planId, interval = 'monthly' } = req.body;
    const orgId = req.user.organization_id;

    // Look up plan
    const planResult = await db.query('SELECT * FROM plans WHERE id = $1', [planId]);
    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    const plan = planResult.rows[0];

    const priceId = interval === 'yearly' ? plan.stripe_price_yearly_id : plan.stripe_price_monthly_id;
    if (!priceId) {
      return res.status(400).json({ error: 'Plan does not have a Stripe price configured' });
    }

    // Get or create Stripe customer
    const orgResult = await db.query('SELECT * FROM organizations WHERE id = $1', [orgId]);
    const org = orgResult.rows[0];
    let customerId = org.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        email: req.user.email,
        metadata: { organization_id: orgId },
      });
      customerId = customer.id;
      await db.query('UPDATE organizations SET stripe_customer_id = $1 WHERE id = $2', [customerId, orgId]);
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/admin/billing?success=true`,
      cancel_url: `${frontendUrl}/admin/billing?canceled=true`,
      metadata: {
        organization_id: orgId,
        plan_id: planId,
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Billing checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /api/billing/portal — create Stripe Customer Portal session
router.post('/portal', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }

  try {
    const orgId = req.user.organization_id;
    const orgResult = await db.query('SELECT stripe_customer_id FROM organizations WHERE id = $1', [orgId]);
    const customerId = orgResult.rows[0]?.stripe_customer_id;

    if (!customerId) {
      return res.status(400).json({ error: 'No billing account found. Please subscribe to a plan first.' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${frontendUrl}/admin/billing`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Billing portal error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// GET /api/billing/invoices — org payment history
router.get('/invoices', async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const result = await db.query(
      'SELECT * FROM payments WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 50',
      [orgId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Billing invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

module.exports = router;
