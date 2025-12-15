/**
 * Script to update admin credentials
 * This script updates the existing admin user's username and password
 * 
 * Usage: node server/scripts/update-admin-credentials.js
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Database path
const DB_DIR = process.env.VERCEL === '1' ? '/tmp' : path.join(__dirname, '..');
const DB_PATH = path.join(DB_DIR, 'inventory.db');

// New admin credentials
const NEW_USERNAME = 'mautaz';
const NEW_PASSWORD = 'Mautaz123';
const NEW_EMAIL = 'mautaz@prestige.com';

// Open database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err);
    process.exit(1);
  }
  console.log('✅ Connected to database');
  
  // Check if admin exists
  db.get('SELECT * FROM users WHERE role = ?', ['admin'], (err, admin) => {
    if (err) {
      console.error('❌ Error checking admin user:', err);
      db.close();
      process.exit(1);
    }
    
    if (!admin) {
      // Create new admin user
      console.log('📝 No admin user found. Creating new admin...');
      const hashedPassword = bcrypt.hashSync(NEW_PASSWORD, 10);
      
      db.run(
        'INSERT INTO users (username, email, password, role, firebase_uid) VALUES (?, ?, ?, ?, ?)',
        [NEW_USERNAME, NEW_EMAIL, hashedPassword, 'admin', null],
        function(err) {
          if (err) {
            console.error('❌ Error creating admin user:', err);
            db.close();
            process.exit(1);
          }
          console.log('✅ Admin user created successfully!');
          console.log(`   Username: ${NEW_USERNAME}`);
          console.log(`   Password: ${NEW_PASSWORD}`);
          console.log(`   Email: ${NEW_EMAIL}`);
          db.close();
        }
      );
    } else {
      // Update existing admin
      console.log(`📝 Found existing admin user: ${admin.username}`);
      console.log('🔄 Updating admin credentials...');
      
      const hashedPassword = bcrypt.hashSync(NEW_PASSWORD, 10);
      
      // Check if username needs to be updated
      if (admin.username !== NEW_USERNAME) {
        // Check if new username already exists
        db.get('SELECT * FROM users WHERE username = ? AND id != ?', [NEW_USERNAME, admin.id], (err, existing) => {
          if (err) {
            console.error('❌ Error checking username:', err);
            db.close();
            process.exit(1);
          }
          
          if (existing) {
            console.error(`❌ Username "${NEW_USERNAME}" already exists. Cannot update.`);
            db.close();
            process.exit(1);
          }
          
          // Update username, email, and password
          db.run(
            'UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?',
            [NEW_USERNAME, NEW_EMAIL, hashedPassword, admin.id],
            function(err) {
              if (err) {
                console.error('❌ Error updating admin:', err);
                db.close();
                process.exit(1);
              }
              console.log('✅ Admin credentials updated successfully!');
              console.log(`   Old Username: ${admin.username}`);
              console.log(`   New Username: ${NEW_USERNAME}`);
              console.log(`   New Password: ${NEW_PASSWORD}`);
              console.log(`   New Email: ${NEW_EMAIL}`);
              db.close();
            }
          );
        });
      } else {
        // Only update password and email
        db.run(
          'UPDATE users SET email = ?, password = ? WHERE id = ?',
          [NEW_EMAIL, hashedPassword, admin.id],
          function(err) {
            if (err) {
              console.error('❌ Error updating admin:', err);
              db.close();
              process.exit(1);
            }
            console.log('✅ Admin credentials updated successfully!');
            console.log(`   Username: ${NEW_USERNAME} (unchanged)`);
            console.log(`   New Password: ${NEW_PASSWORD}`);
            console.log(`   New Email: ${NEW_EMAIL}`);
            db.close();
          }
        );
      }
    }
  });
});
