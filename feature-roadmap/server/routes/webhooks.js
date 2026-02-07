const express = require('express');
const db = require('../db');
const { getStripeForRequest, getMode, getWebhookSecret } = require('../lib/stripe');

const router = express.Router();

// POST /api/webhooks/stripe
// Must use raw body for signature verification
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const stripe = await getStripeForRequest();
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }

    const sig = req.headers['stripe-signature'];
    const mode = await getMode();
    const webhookSecret = getWebhookSecret(mode);

    if (!webhookSecret) {
      console.error('Stripe webhook secret not set for mode:', mode);
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object, stripe);
          break;
        case 'invoice.paid':
          await handleInvoicePaid(event.data.object, mode);
          break;
        case 'invoice.payment_failed':
          await handleInvoiceFailed(event.data.object, mode);
          break;
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object);
          break;
        default:
          console.log(`Unhandled webhook event: ${event.type}`);
      }
    } catch (err) {
      console.error(`Error handling webhook ${event.type}:`, err);
      return res.status(500).json({ error: 'Webhook handler error' });
    }

    res.json({ received: true });
  }
);

// --- Handlers ---

async function handleCheckoutCompleted(session, stripe) {
  const orgId = session.metadata?.organization_id;
  const planId = session.metadata?.plan_id;
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  if (!orgId || !planId || !subscriptionId) return;

  // Update org stripe_customer_id
  await db.query(
    'UPDATE organizations SET stripe_customer_id = $1 WHERE id = $2',
    [customerId, orgId]
  );

  // Fetch subscription details from Stripe
  const sub = await stripe.subscriptions.retrieve(subscriptionId);

  // Look up plan to get its slug for org.plan
  const planResult = await db.query('SELECT slug FROM plans WHERE id = $1', [planId]);
  const planSlug = planResult.rows[0]?.slug || 'starter';

  // Upsert subscription row
  await db.query(
    `INSERT INTO subscriptions (organization_id, plan_id, stripe_subscription_id, stripe_customer_id, status, current_period_start, current_period_end)
     VALUES ($1, $2, $3, $4, $5, to_timestamp($6), to_timestamp($7))
     ON CONFLICT (stripe_subscription_id) DO UPDATE SET
       plan_id = $2, status = $5, current_period_start = to_timestamp($6), current_period_end = to_timestamp($7), updated_at = NOW()`,
    [orgId, planId, subscriptionId, customerId, sub.status, sub.current_period_start, sub.current_period_end]
  );

  // Update org plan
  await db.query('UPDATE organizations SET plan = $1 WHERE id = $2', [planSlug, orgId]);
}

async function handleInvoicePaid(invoice, stripeMode) {
  const customerId = invoice.customer;
  const org = await findOrgByCustomer(customerId);
  if (!org) return;

  // Insert payment record
  await db.query(
    `INSERT INTO payments (organization_id, stripe_invoice_id, stripe_charge_id, amount_cents, currency, status, plan_name, invoice_url, stripe_mode)
     VALUES ($1, $2, $3, $4, $5, 'paid', $6, $7, $8)`,
    [
      org.id,
      invoice.id,
      invoice.charge,
      invoice.amount_paid,
      invoice.currency,
      invoice.lines?.data?.[0]?.description || 'Subscription',
      invoice.hosted_invoice_url,
      stripeMode || 'test',
    ]
  );

  // Ensure subscription is active
  if (invoice.subscription) {
    await db.query(
      `UPDATE subscriptions SET status = 'active', updated_at = NOW() WHERE stripe_subscription_id = $1`,
      [invoice.subscription]
    );
  }
}

async function handleInvoiceFailed(invoice, stripeMode) {
  const customerId = invoice.customer;
  const org = await findOrgByCustomer(customerId);
  if (!org) return;

  await db.query(
    `INSERT INTO payments (organization_id, stripe_invoice_id, stripe_charge_id, amount_cents, currency, status, plan_name, invoice_url, stripe_mode)
     VALUES ($1, $2, $3, $4, $5, 'failed', $6, $7, $8)`,
    [
      org.id,
      invoice.id,
      invoice.charge,
      invoice.amount_due,
      invoice.currency,
      invoice.lines?.data?.[0]?.description || 'Subscription',
      invoice.hosted_invoice_url,
      stripeMode || 'test',
    ]
  );

  if (invoice.subscription) {
    await db.query(
      `UPDATE subscriptions SET status = 'past_due', updated_at = NOW() WHERE stripe_subscription_id = $1`,
      [invoice.subscription]
    );
  }
}

async function handleSubscriptionUpdated(subscription) {
  const subResult = await db.query(
    'SELECT * FROM subscriptions WHERE stripe_subscription_id = $1',
    [subscription.id]
  );
  if (subResult.rows.length === 0) return;

  // Find matching plan by stripe price ID
  const priceId = subscription.items?.data?.[0]?.price?.id;
  let planId = subResult.rows[0].plan_id;
  if (priceId) {
    const planResult = await db.query(
      'SELECT id, slug FROM plans WHERE stripe_price_monthly_id = $1 OR stripe_price_yearly_id = $1',
      [priceId]
    );
    if (planResult.rows.length > 0) {
      planId = planResult.rows[0].id;
      // Update org plan slug
      await db.query(
        'UPDATE organizations SET plan = $1 WHERE id = $2',
        [planResult.rows[0].slug, subResult.rows[0].organization_id]
      );
    }
  }

  await db.query(
    `UPDATE subscriptions SET
       plan_id = $1, status = $2,
       current_period_start = to_timestamp($3), current_period_end = to_timestamp($4),
       cancel_at_period_end = $5, updated_at = NOW()
     WHERE stripe_subscription_id = $6`,
    [
      planId,
      subscription.status,
      subscription.current_period_start,
      subscription.current_period_end,
      subscription.cancel_at_period_end,
      subscription.id,
    ]
  );
}

async function handleSubscriptionDeleted(subscription) {
  const subResult = await db.query(
    'SELECT * FROM subscriptions WHERE stripe_subscription_id = $1',
    [subscription.id]
  );
  if (subResult.rows.length === 0) return;

  const orgId = subResult.rows[0].organization_id;

  await db.query(
    `UPDATE subscriptions SET status = 'canceled', updated_at = NOW() WHERE stripe_subscription_id = $1`,
    [subscription.id]
  );

  // Downgrade org to starter
  await db.query('UPDATE organizations SET plan = $1 WHERE id = $2', ['starter', orgId]);
}

// --- Helpers ---

async function findOrgByCustomer(customerId) {
  const result = await db.query(
    'SELECT id FROM organizations WHERE stripe_customer_id = $1',
    [customerId]
  );
  return result.rows[0] || null;
}

module.exports = router;
