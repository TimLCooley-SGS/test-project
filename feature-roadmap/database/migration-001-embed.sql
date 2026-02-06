-- Migration 001: Embed support
-- Adds embed_config to organizations and anonymous_votes table

-- Add embed_config column to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS embed_config JSONB DEFAULT '{}';

-- Anonymous votes table for fingerprint-based vote tracking
CREATE TABLE anonymous_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suggestion_id UUID NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    ip_address INET,
    fingerprint VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- One anonymous vote per fingerprint per suggestion
    UNIQUE(suggestion_id, fingerprint)
);

CREATE INDEX idx_anonymous_votes_suggestion ON anonymous_votes(suggestion_id);
CREATE INDEX idx_anonymous_votes_fingerprint ON anonymous_votes(fingerprint);
CREATE INDEX idx_anonymous_votes_ip ON anonymous_votes(ip_address);
