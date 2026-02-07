const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { generateToken } = require('../middleware/auth');
const { sendTemplatedEmail } = require('../email');

const router = express.Router();

// --- Helpers ---

async function getOrgBySlug(slug) {
  const result = await db.query(
    'SELECT * FROM organizations WHERE slug = $1 AND is_active = true',
    [slug]
  );
  return result.rows[0] || null;
}

function authenticateBoard(req, orgId) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.organizationId !== orgId) return null;
    return decoded;
  } catch {
    return null;
  }
}

// --- Board Auth ---

// POST /:slug/auth/signup — Lightweight commenter signup
router.post('/:slug/auth/signup', async (req, res) => {
  try {
    const org = await getOrgBySlug(req.params.slug);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists in this org
    const existing = await db.query(
      'SELECT id FROM users WHERE email = $1 AND organization_id = $2',
      [email.toLowerCase(), org.id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    await db.query(
      `INSERT INTO users (id, name, email, password_hash, role, organization_id)
       VALUES ($1, $2, $3, $4, 'commenter', $5)`,
      [userId, name.trim(), email.toLowerCase(), hashedPassword, org.id]
    );

    const token = generateToken(userId, org.id);
    res.status(201).json({
      token,
      user: { id: userId, name: name.trim(), email: email.toLowerCase() },
    });
  } catch (error) {
    console.error('Board signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// POST /:slug/auth/login — Login any user on this org
router.post('/:slug/auth/login', async (req, res) => {
  try {
    const org = await getOrgBySlug(req.params.slug);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await db.query(
      'SELECT id, name, email, password_hash, avatar_url FROM users WHERE email = $1 AND organization_id = $2',
      [email.toLowerCase(), org.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id, org.id);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatar_url },
    });
  } catch (error) {
    console.error('Board login error:', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// GET /:slug/auth/me — Validate board token
router.get('/:slug/auth/me', async (req, res) => {
  try {
    const org = await getOrgBySlug(req.params.slug);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const decoded = authenticateBoard(req, org.id);
    if (!decoded) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await db.query(
      'SELECT id, name, email, avatar_url FROM users WHERE id = $1 AND organization_id = $2',
      [decoded.userId, org.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatar_url },
    });
  } catch (error) {
    console.error('Board auth/me error:', error);
    res.status(500).json({ error: 'Failed to validate session' });
  }
});

// --- Comments ---

// GET /:slug/suggestions/:id/comments — List comments for a suggestion
router.get('/:slug/suggestions/:id/comments', async (req, res) => {
  try {
    const org = await getOrgBySlug(req.params.slug);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Verify suggestion belongs to this org
    const suggestion = await db.query(
      'SELECT id FROM suggestions WHERE id = $1 AND organization_id = $2',
      [req.params.id, org.id]
    );
    if (suggestion.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    const result = await db.query(
      `SELECT c.id, c.content, c.created_at, c.updated_at,
              u.id as user_id, u.name as user_name, u.avatar_url
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.suggestion_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.id]
    );

    const comments = result.rows.map(r => ({
      id: r.id,
      content: r.content,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      user: {
        id: r.user_id,
        name: r.user_name,
        avatarUrl: r.avatar_url,
      },
    }));

    res.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /:slug/suggestions/:id/comments — Post a comment (auth required)
router.post('/:slug/suggestions/:id/comments', async (req, res) => {
  try {
    const org = await getOrgBySlug(req.params.slug);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const decoded = authenticateBoard(req, org.id);
    if (!decoded) {
      return res.status(401).json({ error: 'Authentication required to comment' });
    }

    const { content } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    if (content.length > 2000) {
      return res.status(400).json({ error: 'Comment must be 2000 characters or less' });
    }

    // Verify suggestion belongs to this org
    const suggestion = await db.query(
      'SELECT id FROM suggestions WHERE id = $1 AND organization_id = $2',
      [req.params.id, org.id]
    );
    if (suggestion.rows.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    const commentId = uuidv4();
    await db.query(
      `INSERT INTO comments (id, suggestion_id, user_id, content)
       VALUES ($1, $2, $3, $4)`,
      [commentId, req.params.id, decoded.userId, content.trim()]
    );

    // Return the comment with user info
    const result = await db.query(
      `SELECT c.id, c.content, c.created_at, c.updated_at,
              u.id as user_id, u.name as user_name, u.avatar_url
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [commentId]
    );

    const comment = result.rows[0];

    // Notify suggestion creator + org admins of new comment (fire-and-forget)
    const slug = req.params.slug;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const boardLink = `${frontendUrl}/board/${slug}`;
    const commenterName = comment.user_name;
    const commentContent = content.trim();

    Promise.all([
      db.query(
        `SELECT s.title, u.email, u.id as creator_id
         FROM suggestions s
         LEFT JOIN users u ON s.created_by = u.id
         WHERE s.id = $1`,
        [req.params.id]
      ),
      db.query(
        `SELECT email, id FROM users WHERE organization_id = $1 AND role = 'admin'`,
        [org.id]
      ),
    ]).then(([suggestionResult, adminResult]) => {
      if (suggestionResult.rows.length === 0) return;

      const suggestionTitle = suggestionResult.rows[0].title;
      const creatorEmail = suggestionResult.rows[0].email;
      const creatorId = suggestionResult.rows[0].creator_id;

      // Collect unique recipients, excluding the commenter
      const recipientSet = new Map();
      if (creatorEmail && creatorId !== decoded.userId) {
        recipientSet.set(creatorEmail, true);
      }
      for (const admin of adminResult.rows) {
        if (admin.id !== decoded.userId) {
          recipientSet.set(admin.email, true);
        }
      }

      const recipients = Array.from(recipientSet.keys());
      if (recipients.length === 0) return;

      sendTemplatedEmail({
        to: recipients,
        templateName: 'new_comment',
        variables: {
          org_name: org.name,
          suggestion_title: suggestionTitle,
          commenter_name: commenterName,
          comment_content: commentContent,
          board_link: boardLink,
        },
        fallbackSubject: `New comment on: ${suggestionTitle}`,
        fallbackHtml: `
          <h2>New Comment</h2>
          <p>A new comment was posted on a suggestion in <strong>${org.name}</strong>:</p>
          <p><strong>Suggestion:</strong> ${suggestionTitle}</p>
          <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
            <p style="margin:0;"><strong>${commenterName}</strong> commented:</p>
            <p style="margin:8px 0 0;color:#555;">${commentContent}</p>
          </div>
          <p><a href="${boardLink}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">View on Board</a></p>
        `,
      });
    }).catch(err => console.error('Failed to send new_comment notification:', err));

    res.status(201).json({
      id: comment.id,
      content: comment.content,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      user: {
        id: comment.user_id,
        name: comment.user_name,
        avatarUrl: comment.avatar_url,
      },
    });
  } catch (error) {
    console.error('Post comment error:', error);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

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
        COUNT(DISTINCT v.id) + COUNT(DISTINCT av.id) as vote_count,
        (SELECT COUNT(*) FROM comments cm WHERE cm.suggestion_id = s.id) as comment_count
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
      commentCount: parseInt(s.comment_count),
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
