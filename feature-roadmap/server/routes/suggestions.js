const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { sendTemplatedEmail } = require('../email');

const router = express.Router();

// GET /api/suggestions - Get all suggestions for organization
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, category } = req.query;

    let query = `
      SELECT
        s.*,
        c.name as category_name,
        c.color as category_color,
        u.name as created_by_name,
        COUNT(DISTINCT v.id) as vote_count,
        COALESCE(SUM(vu.customer_value), 0) as impact_score,
        BOOL_OR(v.user_id = $2) as user_has_voted
      FROM suggestions s
      LEFT JOIN categories c ON s.category_id = c.id
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN votes v ON s.id = v.suggestion_id
      LEFT JOIN users vu ON v.user_id = vu.id
      WHERE s.organization_id = $1
    `;

    const params = [req.user.organization_id, req.user.id];
    let paramIndex = 3;

    if (status && status !== 'all') {
      query += ` AND s.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (category && category !== 'all') {
      query += ` AND s.category_id = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    query += `
      GROUP BY s.id, c.name, c.color, u.name
      ORDER BY s.created_at DESC
    `;

    const result = await db.query(query, params);

    // Get voters for each suggestion (for admin view)
    const suggestions = await Promise.all(
      result.rows.map(async (suggestion) => {
        const votersResult = await db.query(
          `SELECT u.id, u.name, u.customer_value
           FROM votes v
           JOIN users u ON v.user_id = u.id
           WHERE v.suggestion_id = $1`,
          [suggestion.id]
        );

        return {
          id: suggestion.id,
          title: suggestion.title,
          description: suggestion.description,
          status: suggestion.status,
          sprint: suggestion.sprint,
          category: suggestion.category_name,
          categoryId: suggestion.category_id,
          categoryColor: suggestion.category_color,
          votes: parseInt(suggestion.vote_count),
          impactScore: parseFloat(suggestion.impact_score),
          userHasVoted: suggestion.user_has_voted,
          votedBy: votersResult.rows.map(v => v.id),
          createdBy: suggestion.created_by,
          createdByName: suggestion.created_by_name,
          createdAt: suggestion.created_at,
          requirements: suggestion.requirements,
          jiraSynced: suggestion.jira_synced,
          jiraSyncedAt: suggestion.jira_synced_at,
          externalId: suggestion.external_id,
          externalUrl: suggestion.external_url,
        };
      })
    );

    res.json(suggestions);
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// POST /api/suggestions - Create new suggestion
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, categoryId } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const id = uuidv4();
    const result = await db.query(
      `INSERT INTO suggestions (id, organization_id, category_id, created_by, title, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, req.user.organization_id, categoryId || null, req.user.id, title, description]
    );

    const suggestion = result.rows[0];

    // Notify org admins of new suggestion (fire-and-forget)
    const orgName = req.user.organization_name || 'your organization';
    const orgSlug = req.user.organization_slug;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const boardLink = `${frontendUrl}/board/${orgSlug}`;

    db.query(
      `SELECT email FROM users WHERE organization_id = $1 AND role = 'admin'`,
      [req.user.organization_id]
    ).then(adminResult => {
      if (adminResult.rows.length > 0) {
        sendTemplatedEmail({
          to: adminResult.rows.map(r => r.email),
          templateName: 'new_suggestion',
          variables: {
            org_name: orgName,
            suggestion_title: title,
            suggestion_description: description || '',
            submitter_name: req.user.name,
            board_link: boardLink,
          },
          fallbackSubject: `New suggestion submitted: ${title}`,
          fallbackHtml: `
            <h2>New Suggestion</h2>
            <p>A new suggestion has been submitted in <strong>${orgName}</strong>:</p>
            <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
              <h3 style="margin:0 0 8px;">${title}</h3>
              <p style="margin:0;color:#555;">${description || ''}</p>
            </div>
            <p><strong>Submitted by:</strong> ${req.user.name}</p>
            <p><a href="${boardLink}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">View on Board</a></p>
          `,
        });
      }
    }).catch(err => console.error('Failed to send new_suggestion notification:', err));

    res.status(201).json({
      id: suggestion.id,
      title: suggestion.title,
      description: suggestion.description,
      status: suggestion.status,
      sprint: suggestion.sprint,
      categoryId: suggestion.category_id,
      votes: 0,
      impactScore: 0,
      userHasVoted: false,
      votedBy: [],
      createdBy: suggestion.created_by,
      createdAt: suggestion.created_at,
    });
  } catch (error) {
    console.error('Create suggestion error:', error);
    res.status(500).json({ error: 'Failed to create suggestion' });
  }
});

// PATCH /api/suggestions/:id - Update suggestion (admin only for status/sprint)
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, categoryId, status, sprint, requirements } = req.body;

    // Verify suggestion belongs to organization
    const existing = await db.query(
      'SELECT * FROM suggestions WHERE id = $1 AND organization_id = $2',
      [id, req.user.organization_id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    // Only admin can change status and sprint
    if ((status || sprint !== undefined) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required to change status or sprint' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      values.push(title);
      paramIndex++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }
    if (categoryId !== undefined) {
      updates.push(`category_id = $${paramIndex}`);
      values.push(categoryId || null);
      paramIndex++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }
    if (sprint !== undefined) {
      updates.push(`sprint = $${paramIndex}`);
      values.push(sprint || null);
      paramIndex++;
    }
    if (requirements !== undefined) {
      updates.push(`requirements = $${paramIndex}`);
      values.push(requirements);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    values.push(id);
    const result = await db.query(
      `UPDATE suggestions SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update suggestion error:', error);
    res.status(500).json({ error: 'Failed to update suggestion' });
  }
});

// POST /api/suggestions/:id/vote - Toggle vote
router.post('/:id/vote', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify suggestion exists and belongs to organization
    const suggestion = await db.query(
      'SELECT id FROM suggestions WHERE id = $1 AND organization_id = $2',
      [id, req.user.organization_id]
    );

    if (suggestion.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    // Check if user already voted
    const existingVote = await db.query(
      'SELECT id FROM votes WHERE suggestion_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (existingVote.rows.length > 0) {
      // Remove vote
      await db.query(
        'DELETE FROM votes WHERE suggestion_id = $1 AND user_id = $2',
        [id, req.user.id]
      );
      res.json({ voted: false, message: 'Vote removed' });
    } else {
      // Add vote
      await db.query(
        'INSERT INTO votes (suggestion_id, user_id) VALUES ($1, $2)',
        [id, req.user.id]
      );
      res.json({ voted: true, message: 'Vote added' });
    }
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// DELETE /api/suggestions/:id - Delete suggestion (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM suggestions WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, req.user.organization_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    res.json({ message: 'Suggestion deleted' });
  } catch (error) {
    console.error('Delete suggestion error:', error);
    res.status(500).json({ error: 'Failed to delete suggestion' });
  }
});

module.exports = router;
