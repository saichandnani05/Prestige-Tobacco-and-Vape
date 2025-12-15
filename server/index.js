const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database');
const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const userRoutes = require('./routes/users');
const salesRoutes = require('./routes/sales');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Debug middleware - log all requests to help diagnose routing issues (BEFORE routes)
app.use((req, res, next) => {
  if (req.path.includes('/api/users') && req.path.includes('display-name')) {
    console.log('🔍 [DEBUG] Incoming request BEFORE routes:', {
      method: req.method,
      path: req.path,
      url: req.url,
      originalUrl: req.originalUrl
    });
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sales', salesRoutes);

// Log all registered routes for debugging
console.log('📋 Registered routes:');
console.log('  - POST /api/users/me/display-name');
console.log('  - PUT /api/users/me/display-name');
console.log('  - GET /api/users/me');
console.log('  - GET /api/users/test (test route)');

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Global 404 handler - must be last
app.use((req, res) => {
  console.log('❌ [404] Route not found:', {
    method: req.method,
    path: req.path,
    url: req.url,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl
  });
  res.status(404).json({ 
    error: 'Route not found', 
    path: req.path, 
    method: req.method,
    url: req.url,
    availableRoutes: [
      'POST /api/users/me/display-name',
      'PUT /api/users/me/display-name',
      'GET /api/users/me',
      'GET /api/users/test'
    ]
  });
});

// Initialize database and start server
db.init()
  .then(() => {
    // Log all registered routes
    console.log('\n📋 ========== REGISTERED ROUTES ==========');
    console.log('✅ POST /api/users/me/display-name - Update display name');
    console.log('✅ PUT /api/users/me/display-name - Update display name (alternative)');
    console.log('✅ GET /api/users/me - Get current user');
    console.log('✅ GET /api/users/test - Test route');
    console.log('==========================================\n');
    
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ Ready to accept requests at http://localhost:${PORT}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please kill the process using that port or use a different port.`);
        console.error(`To find and kill the process: lsof -ti:${PORT} | xargs kill -9`);
        process.exit(1);
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please kill the process using that port or use a different port.`);
    console.error(`To find and kill the process: lsof -ti:${PORT} | xargs kill -9`);
  } else {
    console.error('Uncaught exception:', err);
  }
  process.exit(1);
});

