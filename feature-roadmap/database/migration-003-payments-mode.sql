-- Migration 003: Add stripe_mode to payments table
-- Tracks whether a payment was made in test or live mode

ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_mode VARCHAR(10) NOT NULL DEFAULT 'test';

-- Backfill existing payments: Stripe test-mode invoice IDs start with 'in_' but
-- we can detect test objects by their prefix pattern. For safety, mark all existing
-- payments as 'test' since the platform started in test mode.

CREATE INDEX IF NOT EXISTS idx_payments_mode ON payments(stripe_mode);
