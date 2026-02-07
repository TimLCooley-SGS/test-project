const Stripe = require('stripe');

let stripe = null;

if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });
} else {
  console.warn('STRIPE_SECRET_KEY not set — Stripe billing features disabled');
}

module.exports = stripe;
