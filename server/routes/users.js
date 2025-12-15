const express = require('express');
const db = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Log router initialization
console.log('✅ Users router initialized');

// Test route to verify router is working
router.get('/test', (req, res) => {
  console.log('✅ Test route /test hit!');
  res.json({ message: 'Users router is working!', timestamp: new Date().toISOString() });
});

// Test route for display-name (no auth) to verify routing works
router.post('/test-display-name', (req, res) => {
  console.log('✅ Test route POST /test-display-name hit!');
  console.log('📋 Request body:', req.body);
  res.json({ 
    message: 'Display name test route is working!', 
    received: req.body,
    timestamp: new Date().toISOString() 
  });
});

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

// Update user display name (username) - users can update their own
// CRITICAL: This route MUST come before /:id routes to prevent Express from matching /me as :id
console.log('🔧 Registering POST /me/display-name route...');
router.post('/me/display-name', authenticate, (req, res) => {
  console.log('✅✅✅✅✅ Route POST /me/display-name is being called! ✅✅✅✅✅');
  console.log('✅ Route handler executed successfully!');
  console.log('📋 Request details:', {
    method: req.method,
    path: req.path,
    url: req.url,
    originalUrl: req.originalUrl,
    body: req.body,
    userId: req.userId
  });
  
  const database = db.getDb();
  const { displayName } = req.body;
  const userId = req.userId;

  if (!userId) {
    console.error('❌ No userId found in request');
    return res.status(401).json({ error: 'Authentication required' });
  }

  console.log('📝 Update display name request:', { userId, displayName, body: req.body });

  if (!displayName || displayName.trim().length === 0) {
    console.log('❌ Validation failed: Display name is empty');
    return res.status(400).json({ error: 'Display name is required' });
  }

  if (displayName.trim().length < 3) {
    console.log('❌ Validation failed: Display name too short');
    return res.status(400).json({ error: 'Display name must be at least 3 characters long' });
  }

  if (displayName.trim().length > 50) {
    console.log('❌ Validation failed: Display name too long');
    return res.status(400).json({ error: 'Display name must be less than 50 characters' });
  }

  const trimmedDisplayName = displayName.trim();

  // Check if username already exists (excluding current user)
  database.get(
    'SELECT id FROM users WHERE username = ? AND id != ?',
    [trimmedDisplayName, userId],
    (checkErr, existingUser) => {
      if (checkErr) {
        console.error('❌ Database error checking username:', checkErr);
        return res.status(500).json({ error: 'Database error' });
      }

      if (existingUser) {
        console.log('❌ Username already taken');
        return res.status(400).json({ error: 'Display name already taken. Please choose another one.' });
      }

      // Update username
      database.run(
        'UPDATE users SET username = ? WHERE id = ?',
        [trimmedDisplayName, userId],
        function(updateErr) {
          if (updateErr) {
            console.error('❌ Error updating username:', updateErr);
            if (updateErr.message.includes('UNIQUE constraint')) {
              return res.status(400).json({ error: 'Display name already taken. Please choose another one.' });
            }
            return res.status(500).json({ error: 'Error updating display name' });
          }

          console.log('✅ Username updated successfully:', { userId, newUsername: trimmedDisplayName, changes: this.changes });

          // Return updated user
          database.get(
            'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
            [userId],
            (getErr, updatedUser) => {
              if (getErr) {
                console.error('❌ Error fetching updated user:', getErr);
                return res.status(500).json({ error: 'Error fetching updated user' });
              }

              console.log('✅ Returning updated user:', updatedUser);
              res.json({
                message: 'Display name updated successfully',
                user: updatedUser
              });
            }
          );
        }
      );
    }
  );
});

// Also support PUT method for compatibility
router.put('/me/display-name', authenticate, (req, res) => {
  // Reuse the same handler logic
  const database = db.getDb();
  const { displayName } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!displayName || displayName.trim().length === 0) {
    return res.status(400).json({ error: 'Display name is required' });
  }

  if (displayName.trim().length < 3) {
    return res.status(400).json({ error: 'Display name must be at least 3 characters long' });
  }

  if (displayName.trim().length > 50) {
    return res.status(400).json({ error: 'Display name must be less than 50 characters' });
  }

  const trimmedDisplayName = displayName.trim();

  database.get(
    'SELECT id FROM users WHERE username = ? AND id != ?',
    [trimmedDisplayName, userId],
    (checkErr, existingUser) => {
      if (checkErr) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (existingUser) {
        return res.status(400).json({ error: 'Display name already taken. Please choose another one.' });
      }

      database.run(
        'UPDATE users SET username = ? WHERE id = ?',
        [trimmedDisplayName, userId],
        function(updateErr) {
          if (updateErr) {
            if (updateErr.message.includes('UNIQUE constraint')) {
              return res.status(400).json({ error: 'Display name already taken. Please choose another one.' });
            }
            return res.status(500).json({ error: 'Error updating display name' });
          }

          database.get(
            'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
            [userId],
            (getErr, updatedUser) => {
              if (getErr) {
                return res.status(500).json({ error: 'Error fetching updated user' });
              }

              res.json({
                message: 'Display name updated successfully',
                user: updatedUser
              });
            }
          );
        }
      );
    }
  );
});

// Get all users (admin only) - must come after /me routes
// Note: This route comes after /me routes to ensure /me routes are matched first
router.get('/', authenticate, requireAdmin, (req, res) => {
  const database = db.getDb();

  database.all('SELECT id, username, email, role, permissions, created_at FROM users ORDER BY created_at DESC', (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Parse permissions JSON for each user
    const usersWithPermissions = users.map(user => ({
      ...user,
      permissions: user.permissions ? JSON.parse(user.permissions) : {}
    }));
    
    res.json(usersWithPermissions);
  });
});

// Update user permissions (admin only)
router.put('/:id/permissions', authenticate, requireAdmin, (req, res) => {
  const database = db.getDb();
  const { id } = req.params;
  const { permissions } = req.body;
  const currentUserId = req.userId; // The admin making the change

  if (!permissions || typeof permissions !== 'object') {
    return res.status(400).json({ error: 'Invalid permissions format' });
  }

  // Don't allow users to modify their own permissions if they're admin
  database.get('SELECT role FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Allow modifying admin permissions, but warn if removing critical permissions from admin
    if (user.role === 'admin' && parseInt(id) === currentUserId) {
      // Prevent admins from removing their own critical permissions
      if (!permissions.canManageUsers || !permissions.canApproveInventory) {
        return res.status(403).json({ error: 'You cannot remove critical permissions from your own account' });
      }
    }

    const permissionsJson = JSON.stringify(permissions);

    database.run(
      'UPDATE users SET permissions = ? WHERE id = ?',
      [permissionsJson, id],
      function(updateErr) {
        if (updateErr) {
          return res.status(500).json({ error: 'Error updating permissions' });
        }

        // Return updated user
        database.get(
          'SELECT id, username, email, role, permissions, created_at FROM users WHERE id = ?',
          [id],
          (getErr, updatedUser) => {
            if (getErr) {
              return res.status(500).json({ error: 'Error fetching updated user' });
            }

            updatedUser.permissions = JSON.parse(updatedUser.permissions || '{}');
            res.json(updatedUser);
          }
        );
      }
    );
  });
});

// Update user role (admin only)
router.put('/:id/role', authenticate, requireAdmin, (req, res) => {
  const database = db.getDb();
  const { id } = req.params;
  const { role } = req.body;
  const currentUserId = req.userId; // The admin making the change

  if (!role || !['admin', 'user', 'manager'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be admin, user, or manager' });
  }

  // Don't allow users to change their own role from admin
  if (parseInt(id) === currentUserId) {
    database.get('SELECT role FROM users WHERE id = ?', [id], (selfCheckErr, selfUser) => {
      if (selfCheckErr) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (selfUser && selfUser.role === 'admin' && role !== 'admin') {
        return res.status(403).json({ error: 'You cannot change your own admin role' });
      }
      proceedWithRoleUpdate();
    });
  } else {
    proceedWithRoleUpdate();
  }

  function proceedWithRoleUpdate() {
    database.get('SELECT role FROM users WHERE id = ?', [id], (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.role === 'admin' && role !== 'admin') {
        // Check if this is the last admin
        database.get('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin'], (countErr, result) => {
          if (countErr) {
            return res.status(500).json({ error: 'Database error' });
          }

          if (result.count <= 1) {
            return res.status(403).json({ error: 'Cannot remove the last admin. At least one admin must exist.' });
          }

          updateRole();
        });
      } else {
        updateRole();
      }
    });
  }

  function updateRole() {
    database.run(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, id],
      function(updateErr) {
        if (updateErr) {
          return res.status(500).json({ error: 'Error updating role' });
        }

        // Return updated user
        database.get(
          'SELECT id, username, email, role, permissions, created_at FROM users WHERE id = ?',
          [id],
          (getErr, updatedUser) => {
            if (getErr) {
              return res.status(500).json({ error: 'Error fetching updated user' });
            }

            updatedUser.permissions = JSON.parse(updatedUser.permissions || '{}');
            res.json(updatedUser);
          }
        );
      }
    );
  }
});

console.log('✅ Users router setup complete. Routes registered:');
console.log('  - GET /test');
console.log('  - GET /me');
console.log('  - POST /me/display-name');
console.log('  - PUT /me/display-name');
console.log('  - GET / (admin only)');
console.log('  - PUT /:id/permissions (admin only)');
console.log('  - PUT /:id/role (admin only)');

module.exports = router;

