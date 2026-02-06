require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/auth');
const suggestionsRoutes = require('./routes/suggestions');
const categoriesRoutes = require('./routes/categories');
const usersRoutes = require('./routes/users');
const embedRoutes = require('./routes/embed');

const app = express();
const PORT = process.env.BACKEND_PORT || process.env.PORT || 5000;

// Trust proxy for correct req.ip behind reverse proxies
app.set('trust proxy', 1);

// Permissive CORS for public embed routes
app.use('/api/embed', cors({ origin: true, credentials: false }));

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

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
