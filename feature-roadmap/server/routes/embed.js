const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { sendTemplatedEmail } = require('../email');

const router = express.Router();

// Default embed config (mirrors frontend defaults)
const DEFAULT_EMBED_CONFIG = {
  enabled: false,
  allowedViews: ['suggestions', 'roadmap'],
  defaultView: 'suggestions',
  showHeader: true,
  showVoting: true,
  showFilters: true,
  allowSubmissions: false,
  customCss: '',
  allowedDomains: [],
  height: '600px',
  width: '100%',
};

// --- Helpers ---

async function getOrgBySlug(slug) {
  const result = await db.query(
    'SELECT * FROM organizations WHERE slug = $1 AND is_active = true',
    [slug]
  );
  return result.rows[0] || null;
}

function getEmbedConfig(org) {
  return { ...DEFAULT_EMBED_CONFIG, ...(org.embed_config || {}) };
}

function checkDomainAllowed(config, req) {
  if (!config.allowedDomains || config.allowedDomains.length === 0) {
    return true;
  }
  const origin = req.get('Origin') || req.get('Referer') || '';
  try {
    const url = new URL(origin);
    return config.allowedDomains.some(d => url.hostname === d || url.hostname.endsWith('.' + d));
  } catch {
    // No valid origin — allow for direct browser access
    return true;
  }
}

async function getAnonymousUserId(orgId) {
  const email = 'anonymous@system.internal';

  // Check if anonymous user already exists for this org
  const existing = await db.query(
    'SELECT id FROM users WHERE email = $1 AND organization_id = $2',
    [email, orgId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  // Create the anonymous system user
  const id = uuidv4();
  const passwordHash = await bcrypt.hash(uuidv4(), 10); // random unusable password
  await db.query(
    `INSERT INTO users (id, organization_id, email, password_hash, name, role)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, orgId, email, passwordHash, 'Anonymous', 'user']
  );

  return id;
}

// ============================================
// ADMIN ENDPOINTS (authenticated)
// Must be registered BEFORE /:slug routes to avoid "config" matching as a slug
// ============================================

// GET /config - Get org's embed config
router.get('/config', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT embed_config, slug FROM organizations WHERE id = $1',
      [req.user.organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const config = { ...DEFAULT_EMBED_CONFIG, ...(result.rows[0].embed_config || {}) };
    res.json({ config, slug: result.rows[0].slug });
  } catch (error) {
    console.error('Get admin embed config error:', error);
    res.status(500).json({ error: 'Failed to fetch embed config' });
  }
});

// PATCH /config - Update org's embed config (admin only)
router.patch('/config', authenticate, requireAdmin, async (req, res) => {
  try {
    const newConfig = req.body;

    // Merge with existing config
    const existing = await db.query(
      'SELECT embed_config, slug FROM organizations WHERE id = $1',
      [req.user.organization_id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const mergedConfig = {
      ...DEFAULT_EMBED_CONFIG,
      ...(existing.rows[0].embed_config || {}),
      ...newConfig,
    };

    await db.query(
      'UPDATE organizations SET embed_config = $1 WHERE id = $2',
      [JSON.stringify(mergedConfig), req.user.organization_id]
    );

    res.json({ config: mergedConfig, slug: existing.rows[0].slug });
  } catch (error) {
    console.error('Update embed config error:', error);
    res.status(500).json({ error: 'Failed to update embed config' });
  }
});

// ============================================
// PUBLIC ENDPOINTS (no auth, scoped by slug)
// ============================================

// GET /:slug/config - Get embed config for org
router.get('/:slug/config', async (req, res) => {
  try {
    const org = await getOrgBySlug(req.params.slug);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const config = getEmbedConfig(org);
    if (!config.enabled) {
      return res.status(403).json({ error: 'Embed is not enabled for this organization' });
    }

    if (!checkDomainAllowed(config, req)) {
      return res.status(403).json({ error: 'Domain not allowed' });
    }

    res.json(config);
  } catch (error) {
    console.error('Get embed config error:', error);
    res.status(500).json({ error: 'Failed to fetch embed config' });
  }
});

// GET /:slug/suggestions - Public suggestion list
router.get('/:slug/suggestions', async (req, res) => {
  try {
    const org = await getOrgBySlug(req.params.slug);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const config = getEmbedConfig(org);
    if (!config.enabled) {
      return res.status(403).json({ error: 'Embed is not enabled' });
    }

    if (!checkDomainAllowed(config, req)) {
      return res.status(403).json({ error: 'Domain not allowed' });
    }

    const { fingerprint } = req.query;

    // Get suggestions with vote counts (authenticated + anonymous)
    const result = await db.query(
      `SELECT
        s.id, s.title, s.description, s.status, s.sprint, s.created_at,
        c.name as category_name, c.id as category_id,
        COUNT(DISTINCT v.id) + COUNT(DISTINCT av.id) as vote_count
      FROM suggestions s
      LEFT JOIN categories c ON s.category_id = c.id
      LEFT JOIN votes v ON s.id = v.suggestion_id
      LEFT JOIN anonymous_votes av ON s.id = av.suggestion_id
      WHERE s.organization_id = $1
      GROUP BY s.id, c.name, c.id
      ORDER BY vote_count DESC, s.created_at DESC`,
      [org.id]
    );

    // If fingerprint provided, check which suggestions this visitor voted on
    let votedSuggestionIds = new Set();
    if (fingerprint) {
      const votedResult = await db.query(
        'SELECT suggestion_id FROM anonymous_votes WHERE organization_id = $1 AND fingerprint = $2',
        [org.id, fingerprint]
      );
      votedSuggestionIds = new Set(votedResult.rows.map(r => r.suggestion_id));
    }

    const suggestions = result.rows.map(s => ({
      id: s.id,
      title: s.title,
      description: s.description || '',
      status: s.status,
      sprint: s.sprint,
      category: s.category_name || '',
      categoryId: s.category_id,
      votes: parseInt(s.vote_count),
      createdAt: s.created_at,
      hasVoted: votedSuggestionIds.has(s.id),
    }));

    res.json(suggestions);
  } catch (error) {
    console.error('Get embed suggestions error:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// GET /:slug/categories - Categories for the org
router.get('/:slug/categories', async (req, res) => {
  try {
    const org = await getOrgBySlug(req.params.slug);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const config = getEmbedConfig(org);
    if (!config.enabled) {
      return res.status(403).json({ error: 'Embed is not enabled' });
    }

    const result = await db.query(
      'SELECT id, name, color, sort_order FROM categories WHERE organization_id = $1 ORDER BY sort_order, name',
      [org.id]
    );

    const categories = result.rows.map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      sortOrder: c.sort_order,
    }));

    res.json(categories);
  } catch (error) {
    console.error('Get embed categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /:slug/suggestions/:id/vote - Toggle anonymous vote
router.post('/:slug/suggestions/:id/vote', async (req, res) => {
  try {
    const org = await getOrgBySlug(req.params.slug);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const config = getEmbedConfig(org);
    if (!config.enabled) {
      return res.status(403).json({ error: 'Embed is not enabled' });
    }

    if (!config.showVoting) {
      return res.status(403).json({ error: 'Voting is disabled' });
    }

    const { fingerprint } = req.body;
    if (!fingerprint || typeof fingerprint !== 'string' || fingerprint.length > 64) {
      return res.status(400).json({ error: 'Valid fingerprint is required' });
    }

    const suggestionId = req.params.id;

    // Verify suggestion belongs to this org
    const suggestion = await db.query(
      'SELECT id FROM suggestions WHERE id = $1 AND organization_id = $2',
      [suggestionId, org.id]
    );

    if (suggestion.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    // Check if already voted
    const existingVote = await db.query(
      'SELECT id FROM anonymous_votes WHERE suggestion_id = $1 AND fingerprint = $2',
      [suggestionId, fingerprint]
    );

    if (existingVote.rows.length > 0) {
      // Remove vote
      await db.query(
        'DELETE FROM anonymous_votes WHERE suggestion_id = $1 AND fingerprint = $2',
        [suggestionId, fingerprint]
      );
      res.json({ voted: false });
    } else {
      // Add vote
      const ip = req.ip || null;
      await db.query(
        'INSERT INTO anonymous_votes (suggestion_id, organization_id, ip_address, fingerprint) VALUES ($1, $2, $3, $4)',
        [suggestionId, org.id, ip, fingerprint]
      );
      res.json({ voted: true });
    }
  } catch (error) {
    console.error('Embed vote error:', error);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// POST /:slug/suggestions - Anonymous suggestion submission
router.post('/:slug/suggestions', async (req, res) => {
  try {
    const org = await getOrgBySlug(req.params.slug);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const config = getEmbedConfig(org);
    if (!config.enabled) {
      return res.status(403).json({ error: 'Embed is not enabled' });
    }

    if (!config.allowSubmissions) {
      return res.status(403).json({ error: 'Submissions are disabled' });
    }

    const { title, description, categoryId } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Get or create anonymous system user
    const anonymousUserId = await getAnonymousUserId(org.id);

    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO suggestions (id, organization_id, category_id, created_by, title, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, org.id, categoryId || null, anonymousUserId, title.trim(), (description || '').trim()]
    );

    const s = result.rows[0];

    // Notify org admins of new suggestion (fire-and-forget)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const boardLink = `${frontendUrl}/board/${org.slug}`;

    db.query(
      `SELECT email FROM users WHERE organization_id = $1 AND role = 'admin'`,
      [org.id]
    ).then(adminResult => {
      if (adminResult.rows.length > 0) {
        sendTemplatedEmail({
          to: adminResult.rows.map(r => r.email),
          templateName: 'new_suggestion',
          variables: {
            org_name: org.name,
            suggestion_title: title.trim(),
            suggestion_description: (description || '').trim(),
            submitter_name: 'Anonymous',
            board_link: boardLink,
          },
          fallbackSubject: `New suggestion submitted: ${title.trim()}`,
          fallbackHtml: `
            <h2>New Suggestion</h2>
            <p>A new suggestion has been submitted in <strong>${org.name}</strong>:</p>
            <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
              <h3 style="margin:0 0 8px;">${title.trim()}</h3>
              <p style="margin:0;color:#555;">${(description || '').trim()}</p>
            </div>
            <p><strong>Submitted by:</strong> Anonymous</p>
            <p><a href="${boardLink}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">View on Board</a></p>
          `,
        });
      }
    }).catch(err => console.error('Failed to send new_suggestion notification:', err));

    // Fetch category name if categoryId was provided
    let categoryName = '';
    if (s.category_id) {
      const catResult = await db.query('SELECT name FROM categories WHERE id = $1', [s.category_id]);
      if (catResult.rows.length > 0) categoryName = catResult.rows[0].name;
    }

    res.status(201).json({
      id: s.id,
      title: s.title,
      description: s.description || '',
      status: s.status,
      sprint: s.sprint,
      category: categoryName,
      categoryId: s.category_id,
      votes: 0,
      createdAt: s.created_at,
      hasVoted: false,
    });
  } catch (error) {
    console.error('Embed create suggestion error:', error);
    res.status(500).json({ error: 'Failed to create suggestion' });
  }
});

module.exports = router;
