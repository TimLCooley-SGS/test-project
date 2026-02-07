const express = require('express');
const db = require('../db');

const router = express.Router();

// --- Helpers ---

async function getOrgBySlug(slug) {
  const result = await db.query(
    'SELECT * FROM organizations WHERE slug = $1 AND is_active = true',
    [slug]
  );
  return result.rows[0] || null;
}

// GET /:slug/suggestions — Public suggestion list (no embed gate)
router.get('/:slug/suggestions', async (req, res) => {
  try {
    const org = await getOrgBySlug(req.params.slug);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const { fingerprint } = req.query;

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
    console.error('Get board suggestions error:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// GET /:slug/categories — Categories for the org
router.get('/:slug/categories', async (req, res) => {
  try {
    const org = await getOrgBySlug(req.params.slug);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
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
    console.error('Get board categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /:slug/suggestions/:id/vote — Anonymous vote toggle (fingerprint-based)
router.post('/:slug/suggestions/:id/vote', async (req, res) => {
  try {
    const org = await getOrgBySlug(req.params.slug);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
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
      await db.query(
        'DELETE FROM anonymous_votes WHERE suggestion_id = $1 AND fingerprint = $2',
        [suggestionId, fingerprint]
      );
      res.json({ voted: false });
    } else {
      const ip = req.ip || null;
      await db.query(
        'INSERT INTO anonymous_votes (suggestion_id, organization_id, ip_address, fingerprint) VALUES ($1, $2, $3, $4)',
        [suggestionId, org.id, ip, fingerprint]
      );
      res.json({ voted: true });
    }
  } catch (error) {
    console.error('Board vote error:', error);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

module.exports = router;
