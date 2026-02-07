const Stripe = require('stripe');
const db = require('../db');

const API_VERSION = '2024-06-20';

// Create Stripe clients for each mode (if keys exist)
const testKey = process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
const liveKey = process.env.STRIPE_LIVE_SECRET_KEY;

const stripeTest = testKey ? new Stripe(testKey, { apiVersion: API_VERSION }) : null;
const stripeLive = liveKey ? new Stripe(liveKey, { apiVersion: API_VERSION }) : null;

if (!testKey && !liveKey) {
  console.warn('No Stripe keys set — Stripe billing features disabled');
}

// Cached mode with 60s TTL
let cachedMode = null;
let cacheExpiry = 0;

async function getMode() {
  const now = Date.now();
  if (cachedMode && now < cacheExpiry) return cachedMode;

  try {
    const result = await db.query(
      "SELECT value FROM platform_settings WHERE key = 'stripe_mode'"
    );
    cachedMode = result.rows[0]?.value || 'test';
  } catch {
    cachedMode = 'test';
  }
  cacheExpiry = now + 60_000;
  return cachedMode;
}

function clearModeCache() {
  cachedMode = null;
  cacheExpiry = 0;
}

function getStripe(mode) {
  return mode === 'live' ? stripeLive : stripeTest;
}

async function getStripeForRequest() {
  const mode = await getMode();
  return getStripe(mode);
}

function getWebhookSecret(mode) {
  if (mode === 'live') {
    return process.env.STRIPE_LIVE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
  }
  return process.env.STRIPE_TEST_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
}

module.exports = {
  getMode,
  getStripe,
  getStripeForRequest,
  getWebhookSecret,
  clearModeCache,
  testKeySet: !!testKey,
  liveKeySet: !!liveKey,
};
