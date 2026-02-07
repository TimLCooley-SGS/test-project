-- Migration 004: Add feature gating columns to plans table
-- Allows platform admin to control which features each plan tier includes

ALTER TABLE plans ADD COLUMN IF NOT EXISTS allow_theme BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS allow_integrations BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS allow_embed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_users INTEGER NOT NULL DEFAULT 0; -- 0 = unlimited
