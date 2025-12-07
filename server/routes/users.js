const express = require('express');
const db = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get current user
router.get('/me', authenticate, (req, res) => {
  const database = db.getDb();

  database.get('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [req.userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  });
});

// Get all users (admin only)
router.get('/', authenticate, requireAdmin, (req, res) => {
  const database = db.getDb();

  database.all('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC', (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(users);
  });
});

module.exports = router;

