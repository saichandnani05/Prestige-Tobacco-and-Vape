/**
 * Seed database for Vercel deployment
 * This script initializes the database with data from the exported SQL file
 * Can be run as a Vercel serverless function or during build
 * 
 * Usage: node server/scripts/seed-vercel-database.js
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Database path - Vercel uses /tmp
const DB_DIR = process.env.VERCEL === '1' ? '/tmp' : path.join(__dirname, '..');
const DB_PATH = path.join(DB_DIR, 'inventory.db');

// SQL export file path
const SQL_EXPORT = path.join(__dirname, '..', 'database-export.sql');

const initDatabase = () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      // If SQL export exists, import it
      if (fs.existsSync(SQL_EXPORT)) {
        console.log('📦 Found database export, importing...');
        const sql = fs.readFileSync(SQL_EXPORT, 'utf8');
        db.exec(sql, (err) => {
          if (err) {
            console.error('⚠️ Error importing database, will create fresh:', err.message);
            // Continue with fresh database
            createFreshDatabase(db).then(resolve).catch(reject);
          } else {
            console.log('✅ Database imported from export file');
            db.close();
            resolve();
          }
        });
      } else {
        console.log('📝 No export file found, creating fresh database...');
        createFreshDatabase(db).then(resolve).catch(reject);
      }
    });
  });
};

const createFreshDatabase = (db) => {
  return new Promise((resolve, reject) => {
    // Create tables (same as database.js)
    db.serialize(() => {
      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        firebase_uid TEXT,
        permissions TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Inventory items table
        db.run(`CREATE TABLE IF NOT EXISTS inventory_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_name TEXT NOT NULL,
          category TEXT,
          brand TEXT,
          quantity INTEGER NOT NULL DEFAULT 0,
          unit_price REAL,
          sku TEXT,
          description TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          created_by INTEGER NOT NULL,
          approved_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          approved_at DATETIME,
          FOREIGN KEY (created_by) REFERENCES users(id),
          FOREIGN KEY (approved_by) REFERENCES users(id)
        )`, (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Sales table
          db.run(`CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            inventory_item_id INTEGER NOT NULL,
            quantity_sold INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            total_amount REAL NOT NULL,
            sold_by INTEGER NOT NULL,
            customer_name TEXT,
            payment_method TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id),
            FOREIGN KEY (sold_by) REFERENCES users(id)
          )`, (err) => {
            if (err) {
              reject(err);
              return;
            }
            
            // Create default admin user
            const defaultPassword = bcrypt.hashSync('Mautaz123', 10);
            db.run(
              'INSERT OR IGNORE INTO users (username, email, password, role, firebase_uid) VALUES (?, ?, ?, ?, ?)',
              ['mautaz', 'mautaz@prestige.com', defaultPassword, 'admin', null],
              (err) => {
                if (err) {
                  reject(err);
                  return;
                }
                console.log('✅ Fresh database created with default admin user');
                db.close();
                resolve();
              }
            );
          });
        });
      });
    });
  });
};

// Run if called directly
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('✅ Database seeding completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error seeding database:', err);
      process.exit(1);
    });
}

module.exports = { initDatabase };
