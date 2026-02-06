-- Seed data for testing/development
-- Run this AFTER schema.sql

-- ============================================
-- Sample Organization
-- ============================================
INSERT INTO organizations (id, name, slug, plan, trial_ends_at) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Demo Company', 'demo-company', 'pro', NOW() + INTERVAL '15 days');

-- ============================================
-- Sample Users (password is 'password123' - bcrypt hash)
-- In production, use proper password hashing!
-- ============================================
INSERT INTO users (id, organization_id, email, password_hash, name, role, customer_value, company) VALUES
    -- Admin user (first user = admin)
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
     'admin@demo.com', '$2b$10$example_hash_replace_in_production', 'Admin User', 'admin', 0, 'Demo Company'),
    -- Regular users
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111',
     'jane@acme.com', '$2b$10$example_hash_replace_in_production', 'Jane Smith', 'user', 120000, 'Acme Corp'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111',
     'bob@startup.io', '$2b$10$example_hash_replace_in_production', 'Bob Wilson', 'user', 15000, 'Startup.io'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111',
     'sarah@enterprise.com', '$2b$10$example_hash_replace_in_production', 'Sarah Chen', 'user', 500000, 'Enterprise Co');

-- ============================================
-- Sample Categories
-- ============================================
INSERT INTO categories (id, organization_id, name, color, sort_order) VALUES
    ('cat11111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'UI', '#3b82f6', 1),
    ('cat22222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Performance', '#10b981', 2),
    ('cat33333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Mobile', '#8b5cf6', 3),
    ('cat44444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Dashboard', '#f59e0b', 4),
    ('cat55555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'API', '#ef4444', 5),
    ('cat66666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Security', '#6366f1', 6);

-- ============================================
-- Sample Suggestions
-- ============================================
INSERT INTO suggestions (id, organization_id, category_id, created_by, title, description, status, sprint) VALUES
    -- Under Review
    ('sug11111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
     'cat11111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     'Dark mode', 'Add dark mode option for better night-time viewing', 'under_review', NULL),

    -- Planned
    ('sug22222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
     'cat33333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
     'Mobile app', 'Create a native mobile application for iOS and Android', 'planned', 'March 2026'),

    -- In Progress
    ('sug33333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
     'cat22222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
     'Faster loading times', 'Optimize database queries and implement caching', 'in_progress', 'February 2026'),

    -- Done
    ('sug44444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
     'cat66666-6666-6666-6666-666666666666', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     'User authentication', 'Implement secure login with OAuth 2.0 and multi-factor authentication', 'done', 'January 2026'),

    ('sug55555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111',
     'cat44444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
     'Dashboard redesign', 'Modern dashboard with customizable widgets and real-time data', 'done', 'January 2026');

-- ============================================
-- Sample Votes
-- ============================================
INSERT INTO votes (suggestion_id, user_id) VALUES
    -- Dark mode votes
    ('sug11111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    ('sug11111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
    ('sug11111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),

    -- Mobile app votes
    ('sug22222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    ('sug22222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    ('sug22222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
    ('sug22222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),

    -- Faster loading votes
    ('sug33333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    ('sug33333-3333-3333-3333-333333333333', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),

    -- Auth votes
    ('sug44444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    ('sug44444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
    ('sug44444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
