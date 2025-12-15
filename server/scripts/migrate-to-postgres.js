/**
 * Migrate SQLite database to PostgreSQL (Supabase)
 * 
 * Usage: 
 *   1. Set DATABASE_URL environment variable
 *   2. node server/scripts/migrate-to-postgres.js
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Database paths
const SQLITE_DB = path.join(__dirname, '..', 'inventory.db');
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('   Example: DATABASE_URL=postgresql://user:password@host:port/database');
  process.exit(1);
}

if (!fs.existsSync(SQLITE_DB)) {
  console.error(`❌ SQLite database not found: ${SQLITE_DB}`);
  process.exit(1);
}

// Connect to PostgreSQL
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Connect to SQLite
const sqliteDb = new sqlite3.Database(SQLITE_DB, (err) => {
  if (err) {
    console.error('❌ Error opening SQLite database:', err);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database');
});

// Migrate function
const migrate = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    
    // Create tables
    console.log('📋 Creating PostgreSQL tables...');
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

    console.log('✅ Tables created');

    // Migrate users
    console.log('👥 Migrating users...');
    const users = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM users', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const user of users) {
      await client.query(
        `INSERT INTO users (username, email, password, role, firebase_uid, permissions, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (username) DO NOTHING`,
        [user.username, user.email, user.password, user.role, user.firebase_uid || null, user.permissions || '{}', user.created_at]
      );
    }
    console.log(`✅ Migrated ${users.length} users`);

    // Migrate inventory items
    console.log('📦 Migrating inventory items...');
    const items = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM inventory_items', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const item of items) {
      await client.query(
        `INSERT INTO inventory_items 
         (product_name, category, brand, quantity, unit_price, sku, description, status, 
          created_by, approved_by, created_at, updated_at, approved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          item.product_name,
          item.category,
          item.brand,
          item.quantity,
          item.unit_price,
          item.sku,
          item.description,
          item.status,
          item.created_by,
          item.approved_by || null,
          item.created_at,
          item.updated_at || item.created_at,
          item.approved_at || null
        ]
      );
    }
    console.log(`✅ Migrated ${items.length} inventory items`);

    // Migrate sales
    console.log('💰 Migrating sales...');
    const sales = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM sales', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const sale of sales) {
      await client.query(
        `INSERT INTO sales 
         (inventory_item_id, quantity_sold, unit_price, total_amount, sold_by, 
          customer_name, payment_method, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          sale.inventory_item_id,
          sale.quantity_sold,
          sale.unit_price,
          sale.total_amount,
          sale.sold_by,
          sale.customer_name || null,
          sale.payment_method || null,
          sale.notes || null,
          sale.created_at
        ]
      );
    }
    console.log(`✅ Migrated ${sales.length} sales`);

    client.release();
    sqliteDb.close();
    await pool.end();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('📝 Update your server/index.js to use database-postgres.js');
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

migrate();
