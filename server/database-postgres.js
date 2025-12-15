/**
 * PostgreSQL Database Connection for Vercel
 * Uses Supabase (PostgreSQL) for production
 * Falls back to SQLite for local development
 */

const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Check if PostgreSQL connection string is available
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
const USE_POSTGRES = !!DATABASE_URL;

let db; // SQLite connection
let pool; // PostgreSQL connection pool

// Initialize database connection
const init = async () => {
  if (USE_POSTGRES) {
    return initPostgres();
  } else {
    return initSQLite();
  }
};

// Initialize PostgreSQL connection
const initPostgres = async () => {
  try {
    // Parse connection string
    const connectionString = DATABASE_URL;
    
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    
    // Create tables if they don't exist
    await createPostgresTables(client);
    
    // Create default admin user if it doesn't exist
    await createDefaultAdminPostgres(client);
    
    client.release();
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Error connecting to PostgreSQL:', error);
    throw error;
  }
};

// Create PostgreSQL tables
const createPostgresTables = async (client) => {
  try {
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        firebase_uid VARCHAR(255),
        permissions TEXT DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inventory items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        product_name VARCHAR(255) NOT NULL,
        category VARCHAR(255),
        brand VARCHAR(255),
        quantity INTEGER NOT NULL DEFAULT 0,
        unit_price DECIMAL(10, 2),
        sku VARCHAR(255),
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_by INTEGER NOT NULL REFERENCES users(id),
        approved_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approved_at TIMESTAMP
      )
    `);

    // Sales table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
        quantity_sold INTEGER NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        sold_by INTEGER NOT NULL REFERENCES users(id),
        customer_name VARCHAR(255),
        payment_method VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_items(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at)`);

    console.log('✅ PostgreSQL tables created/verified');
  } catch (error) {
    console.error('❌ Error creating PostgreSQL tables:', error);
    throw error;
  }
};

// Create default admin user (PostgreSQL)
const createDefaultAdminPostgres = async (client) => {
  try {
    const result = await client.query('SELECT * FROM users WHERE role = $1', ['admin']);
    
    if (result.rows.length === 0) {
      const defaultPassword = await bcrypt.hash('Mautaz123', 10);
      await client.query(
        'INSERT INTO users (username, email, password, role, firebase_uid) VALUES ($1, $2, $3, $4, $5)',
        ['mautaz', 'mautaz@prestige.com', defaultPassword, 'admin', null]
      );
      console.log('✅ Default admin user created: username=mautaz, password=Mautaz123');
    }
  } catch (error) {
    console.error('❌ Error creating default admin:', error);
    throw error;
  }
};

// Initialize SQLite connection (fallback for local development)
const initSQLite = () => {
  return new Promise((resolve, reject) => {
    const DB_DIR = process.env.VERCEL === '1' ? '/tmp' : __dirname;
    const DB_PATH = path.join(DB_DIR, 'inventory.db');

    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening SQLite database:', err);
        reject(err);
        return;
      }
      console.log('✅ Connected to SQLite database');
      createSQLiteTables().then(resolve).catch(reject);
    });
  });
};

// Create SQLite tables (existing code)
const createSQLiteTables = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
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
        
        db.run(`ALTER TABLE users ADD COLUMN firebase_uid TEXT`, () => {});
        db.run(`ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '{}'`, () => {});
      });

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
      });

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
      });

      db.get('SELECT * FROM users WHERE role = ?', ['admin'], (err, row) => {
        if (err) {
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

// Get database connection (PostgreSQL or SQLite)
const getDb = () => {
  if (USE_POSTGRES) {
    return pool;
  } else {
    return db;
  }
};

// Query helper for PostgreSQL
const query = async (text, params) => {
  if (USE_POSTGRES) {
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      return result.rows;
    } finally {
      client.release();
    }
  } else {
    return new Promise((resolve, reject) => {
      db.all(text, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// Close database connection
const close = async () => {
  if (USE_POSTGRES) {
    if (pool) {
      await pool.end();
      console.log('PostgreSQL connection pool closed');
    }
  } else {
    return new Promise((resolve, reject) => {
      if (db) {
        db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('SQLite database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
};

module.exports = {
  init,
  getDb,
  query,
  close,
  USE_POSTGRES
};
