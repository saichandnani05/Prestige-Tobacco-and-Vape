const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { verifyToken } = require('../firebase-admin');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const database = db.getDb();

    database.run(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, 'user'],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Error creating user' });
        }

        const token = jwt.sign(
          { userId: this.lastID, username, role: 'user' },
          process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
          // No expiration - token persists until explicit logout
        );

        res.status(201).json({
          message: 'User created successfully',
          token,
          user: { id: this.lastID, username, email, role: 'user' }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const database = db.getDb();

    database.get(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, username],
      async (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
          { userId: user.id, username: user.username, role: user.role },
          process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
          // No expiration - token persists until explicit logout
        );

        res.json({
          message: 'Login successful',
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Firebase authentication - verify token and get/create user
router.post('/firebase', async (req, res) => {
  try {
    const { firebaseToken, email, displayName, uid } = req.body;

    if (!firebaseToken) {
      return res.status(400).json({ error: 'Firebase token is required' });
    }

    // Verify Firebase token
    const firebaseUser = await verifyToken(firebaseToken);
    
    if (!firebaseUser) {
      return res.status(401).json({ error: 'Invalid Firebase token' });
    }

    const database = db.getDb();
    const userEmail = email || firebaseUser.email;
    const username = displayName || firebaseUser.name || userEmail.split('@')[0];

    // Check if user exists in database
    database.get(
      'SELECT * FROM users WHERE email = ? OR firebase_uid = ?',
      [userEmail, uid || firebaseUser.uid],
      async (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (user) {
          // Update firebase_uid if not set
          if (!user.firebase_uid && (uid || firebaseUser.uid)) {
            database.run(
              'UPDATE users SET firebase_uid = ? WHERE id = ?',
              [uid || firebaseUser.uid, user.id],
              (updateErr) => {
                if (updateErr) {
                  console.error('Error updating firebase_uid:', updateErr);
                }
              }
            );
          }

          // Generate JWT token for backend
          const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
            // No expiration - token persists until explicit logout
          );

          return res.json({
            message: 'Authentication successful',
            token,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role
            }
          });
        } else {
          return res.status(404).json({ error: 'User not found. Please register first.' });
        }
      }
    );
  } catch (error) {
    console.error('Firebase auth error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Firebase registration - create user in database after Firebase signup
router.post('/firebase/register', async (req, res) => {
  try {
    const { firebaseToken, email, username, uid } = req.body;

    if (!firebaseToken || !email) {
      return res.status(400).json({ error: 'Firebase token and email are required' });
    }

    // Verify Firebase token
    const firebaseUser = await verifyToken(firebaseToken);
    
    if (!firebaseUser) {
      return res.status(401).json({ error: 'Invalid Firebase token' });
    }

    const database = db.getDb();
    const userEmail = email || firebaseUser.email;
    const userUsername = username || firebaseUser.name || userEmail.split('@')[0];
    const firebaseUid = uid || firebaseUser.uid;

    // Check if user already exists
    database.get(
      'SELECT * FROM users WHERE email = ? OR firebase_uid = ?',
      [userEmail, firebaseUid],
      (err, existingUser) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (existingUser) {
          // User exists, just return them
          const token = jwt.sign(
            { userId: existingUser.id, username: existingUser.username, role: existingUser.role },
            process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
            // No expiration - token persists until explicit logout
          );

          return res.json({
            message: 'User already exists',
            token,
            user: {
              id: existingUser.id,
              username: existingUser.username,
              email: existingUser.email,
              role: existingUser.role
            }
          });
        }

        // Create new user
        database.run(
          'INSERT INTO users (username, email, password, role, firebase_uid) VALUES (?, ?, ?, ?, ?)',
          [userUsername, userEmail, '', 'user', firebaseUid],
          function(insertErr) {
            if (insertErr) {
              if (insertErr.message.includes('UNIQUE constraint')) {
                return res.status(400).json({ error: 'Username or email already exists' });
              }
              return res.status(500).json({ error: 'Error creating user' });
            }

            const token = jwt.sign(
              { userId: this.lastID, username: userUsername, role: 'user' },
              process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
              // No expiration - token persists until explicit logout
            );

            res.status(201).json({
              message: 'User created successfully',
              token,
              user: {
                id: this.lastID,
                username: userUsername,
                email: userEmail,
                role: 'user'
              }
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Firebase registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

