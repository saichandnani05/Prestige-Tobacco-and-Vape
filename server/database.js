const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// For Vercel, use /tmp directory (writable filesystem)
// For local development, use project directory
const DB_DIR = process.env.VERCEL === '1' 
  ? '/tmp' 
  : __dirname;
const DB_PATH = path.join(DB_DIR, 'inventory.db');

// Ensure directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db;

const init = () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
      
      // On Vercel, try to import existing database if available
      if (process.env.VERCEL === '1') {
        const fs = require('fs');
        const path = require('path');
        const sqlExport = path.join(__dirname, 'database-export.sql');
        
        if (fs.existsSync(sqlExport)) {
          console.log('📦 Found database export on Vercel, importing...');
          const sql = fs.readFileSync(sqlExport, 'utf8');
          db.exec(sql, (err) => {
            if (err) {
              console.log('⚠️ Could not import database export, creating fresh database');
              createTables().then(resolve).catch(reject);
            } else {
              console.log('✅ Database imported successfully on Vercel');
              resolve();
            }
          });
        } else {
          createTables().then(resolve).catch(reject);
        }
      } else {
        createTables().then(resolve).catch(reject);
      }
    });
  });
};

const createTables = () => {
  return new Promise((resolve, reject) => {
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
          console.error('Error creating users table:', err);
          reject(err);
          return;
        }
        
        // Add firebase_uid column if it doesn't exist (migration)
        db.run(`ALTER TABLE users ADD COLUMN firebase_uid TEXT`, (alterErr) => {
          // Ignore error if column already exists
          if (alterErr && !alterErr.message.includes('duplicate column name')) {
            console.log('Note: firebase_uid column may already exist');
          }
        });
        
        // Add permissions column if it doesn't exist (migration)
        db.run(`ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '{}'`, (alterErr) => {
          // Ignore error if column already exists
          if (alterErr && !alterErr.message.includes('duplicate column name')) {
            console.log('Note: permissions column may already exist');
          }
        });
      });

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
          console.error('Error creating inventory_items table:', err);
          reject(err);
          return;
        }
      });

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
          console.error('Error creating sales table:', err);
          reject(err);
          return;
        }
      });

      // Create default admin user if it doesn't exist
      db.get('SELECT * FROM users WHERE role = ?', ['admin'], (err, row) => {
        if (err) {
          console.error('Error checking admin user:', err);
          reject(err);
          return;
        }
        
        if (!row) {
          const defaultPassword = bcrypt.hashSync('Mautaz123', 10);
          db.run(
            'INSERT INTO users (username, email, password, role, firebase_uid) VALUES (?, ?, ?, ?, ?)',
            ['mautaz', 'mautaz@prestige.com', defaultPassword, 'admin', null],
            (err) => {
              if (err) {
                console.error('Error creating default admin:', err);
                reject(err);
                return;
              }
              console.log('Default admin user created: username=mautaz, password=Mautaz123');
              resolve();
            }
          );
        } else {
          resolve();
        }
      });
    });
  });
};

const getDb = () => db;

const close = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database connection closed');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
};

module.exports = {
  init,
  getDb,
  close
};

