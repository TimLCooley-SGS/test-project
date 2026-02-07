-- Feature Roadmap Database Schema
-- Organizations > Users structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ORGANIZATIONS
-- ============================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,  -- URL-friendly identifier (e.g., "acme-corp")
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Subscription/billing info
    plan VARCHAR(50) DEFAULT 'starter',  -- starter, pro, enterprise
    trial_ends_at TIMESTAMP WITH TIME ZONE,

    -- Branding/theme settings (JSON for flexibility)
    theme_settings JSONB DEFAULT '{}'::jsonb,

    -- Feature flags
    is_active BOOLEAN DEFAULT true
);

-- ============================================
-- USERS
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Auth info
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    -- Profile
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,

    -- Role within organization
    role VARCHAR(50) NOT NULL DEFAULT 'user',  -- admin, user

    -- CRM integration fields
    customer_value DECIMAL(12, 2) DEFAULT 0,
    company VARCHAR(255),
    crm_id VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,

    -- Super admin flag (platform-level, independent of org role)
    is_super_admin BOOLEAN DEFAULT false,

    -- Email must be unique within an organization
    UNIQUE(organization_id, email)
);

-- Index for faster lookups
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6b7280',  -- Hex color
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(organization_id, name)
);

CREATE INDEX idx_categories_organization ON categories(organization_id);

-- ============================================
-- SUGGESTIONS
-- ============================================
CREATE TABLE suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Content
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'under_review',  -- under_review, planned, in_progress, done
    sprint VARCHAR(100),  -- e.g., "March 2026"

    -- Requirements (admin can add detailed specs)
    requirements TEXT,

    -- External integrations
    jira_synced BOOLEAN DEFAULT false,
    jira_synced_at TIMESTAMP WITH TIME ZONE,
    external_id VARCHAR(255),  -- ID in external system (Jira, Linear, etc.)
    external_url VARCHAR(500),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_suggestions_organization ON suggestions(organization_id);
CREATE INDEX idx_suggestions_category ON suggestions(category_id);
CREATE INDEX idx_suggestions_status ON suggestions(status);
CREATE INDEX idx_suggestions_created_by ON suggestions(created_by);

-- ============================================
-- VOTES
-- ============================================
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suggestion_id UUID NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- One vote per user per suggestion
    UNIQUE(suggestion_id, user_id)
);

CREATE INDEX idx_votes_suggestion ON votes(suggestion_id);
CREATE INDEX idx_votes_user ON votes(user_id);

-- ============================================
-- INTEGRATIONS
-- ============================================
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Integration type
    type VARCHAR(50) NOT NULL,  -- jira, linear, asana, salesforce, hubspot
    name VARCHAR(255) NOT NULL,

    -- Credentials (encrypted in production)
    config JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Status
    is_enabled BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_integrations_organization ON integrations(organization_id);

-- ============================================
-- PUSH HISTORY (tracking what was pushed to external tools)
-- ============================================
CREATE TABLE push_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suggestion_id UUID NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    pushed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    external_id VARCHAR(255),
    external_url VARCHAR(500),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_push_history_suggestion ON push_history(suggestion_id);

-- ============================================
-- SESSIONS (for authentication)
-- ============================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- ============================================
-- PASSWORD RESET TOKENS
-- ============================================
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used BOOLEAN DEFAULT false
);

CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);

-- ============================================
-- PLATFORM SETTINGS
-- ============================================
CREATE TABLE platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- EMAIL TEMPLATES
-- ============================================
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_body TEXT NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suggestions_updated_at BEFORE UPDATE ON suggestions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_settings_updated_at BEFORE UPDATE ON platform_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEW: Suggestion with vote count
-- ============================================
CREATE VIEW suggestions_with_votes AS
SELECT
    s.*,
    COUNT(v.id) as vote_count,
    COALESCE(SUM(u.customer_value), 0) as impact_score
FROM suggestions s
LEFT JOIN votes v ON s.id = v.suggestion_id
LEFT JOIN users u ON v.user_id = u.id
GROUP BY s.id;

-- ============================================
-- INITIAL DATA (optional - for testing)
-- ============================================
-- This will be run separately or customized per deployment
