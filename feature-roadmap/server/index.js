require('dotenv').config({ path: '../.env' });
require('dotenv').config(); // fallback to .env in cwd (Vercel)

const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/auth');
const suggestionsRoutes = require('./routes/suggestions');
const categoriesRoutes = require('./routes/categories');
const usersRoutes = require('./routes/users');
const embedRoutes = require('./routes/embed');
const boardRoutes = require('./routes/board');
const platformRoutes = require('./routes/platform');
const webhookRoutes = require('./routes/webhooks');
const billingRoutes = require('./routes/billing');

const app = express();
const PORT = process.env.BACKEND_PORT || process.env.PORT || 5000;

// Trust proxy for correct req.ip behind reverse proxies
app.set('trust proxy', 1);

// Stripe webhook route MUST come before express.json() — needs raw body
app.use('/api/webhooks', webhookRoutes);

// Permissive CORS for public embed and board routes
app.use('/api/embed', cors({ origin: true, credentials: false }));
app.use('/api/board', cors({ origin: true, credentials: false }));

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/suggestions', suggestionsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/embed', embedRoutes);
app.use('/api/board', boardRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/billing', billingRoutes);

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Only listen when run directly (not when imported by Vercel serverless)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;
