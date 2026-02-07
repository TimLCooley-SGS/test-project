-- Migration 002: Billing / Stripe integration
-- Run against Supabase PostgreSQL

-- Add Stripe customer ID to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Plans table
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  price_monthly INTEGER NOT NULL DEFAULT 0,   -- cents
  price_yearly INTEGER NOT NULL DEFAULT 0,    -- cents
  features JSONB DEFAULT '[]'::jsonb,
  stripe_product_id VARCHAR(255),
  stripe_price_monthly_id VARCHAR(255),
  stripe_price_yearly_id VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'usd',
  status VARCHAR(50) NOT NULL DEFAULT 'paid',
  plan_name VARCHAR(100),
  invoice_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);

-- Seed default plans
INSERT INTO plans (name, slug, description, price_monthly, price_yearly, features, sort_order) VALUES
  ('Starter', 'starter', 'For small teams getting started', 0, 0, '["Up to 50 suggestions", "Basic analytics", "1 admin user"]'::jsonb, 0),
  ('Pro', 'pro', 'For growing teams that need more', 4900, 49000, '["Unlimited suggestions", "Advanced analytics", "Unlimited admins", "Priority support", "Custom branding"]'::jsonb, 1),
  ('Enterprise', 'enterprise', 'For large organizations with custom needs', 0, 0, '["Everything in Pro", "Dedicated support", "Custom integrations", "SLA guarantee", "SSO"]'::jsonb, 2)
ON CONFLICT (slug) DO NOTHING;
