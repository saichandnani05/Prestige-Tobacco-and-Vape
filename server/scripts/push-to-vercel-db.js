/**
 * Push all data from local SQLite database to Vercel PostgreSQL database
 * 
 * Usage: 
 *   1. Set DATABASE_URL environment variable to your Vercel/Supabase connection string
 *   2. node server/scripts/push-to-vercel-db.js
 * 
 * Example:
 *   DATABASE_URL="postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:5432/postgres" node server/scripts/push-to-vercel-db.js
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
  console.error('   Or set it in Vercel dashboard: Settings → Environment Variables');
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

// Helper to convert SQLite query to Promise
const sqliteQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Helper to get single row from SQLite
const sqliteGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Push data function
const pushData = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    
    // Ensure tables exist and allow manual ID insertion
    console.log('📋 Ensuring tables exist...');
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
    
    console.log('✅ Tables verified\n');
    
    // Start transaction
    await client.query('BEGIN');
    console.log('📦 Starting data migration...\n');
    
    // 1. Push Users
    console.log('👥 Migrating users...');
    const users = await sqliteQuery('SELECT * FROM users ORDER BY id');
    
    // First, ensure users table allows manual ID insertion
    await client.query('ALTER TABLE users ALTER COLUMN id DROP DEFAULT');
    
    for (const user of users) {
      await client.query(
        `INSERT INTO users (id, username, email, password, role, firebase_uid, permissions, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           username = EXCLUDED.username,
           email = EXCLUDED.email,
           password = EXCLUDED.password,
           role = EXCLUDED.role,
           firebase_uid = EXCLUDED.firebase_uid,
           permissions = EXCLUDED.permissions`,
        [
          user.id,
          user.username,
          user.email,
          user.password,
          user.role,
          user.firebase_uid || null,
          user.permissions || '{}',
          user.created_at
        ]
      );
    }
    console.log(`   ✅ Migrated ${users.length} users`);
    
    // Reset sequence for users table
    const maxUserId = await client.query('SELECT MAX(id) as max_id FROM users');
    if (maxUserId.rows[0]?.max_id) {
      await client.query(`SELECT setval('users_id_seq', $1, true)`, [maxUserId.rows[0].max_id]);
    }
    await client.query('ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval(\'users_id_seq\')');
    
    // 2. Push Inventory Items
    console.log('📦 Migrating inventory items...');
    const items = await sqliteQuery('SELECT * FROM inventory_items ORDER BY id');
    
    // Ensure inventory_items table allows manual ID insertion
    await client.query('ALTER TABLE inventory_items ALTER COLUMN id DROP DEFAULT');
    
    for (const item of items) {
      await client.query(
        `INSERT INTO inventory_items 
         (id, product_name, category, brand, quantity, unit_price, sku, description, status, 
          created_by, approved_by, created_at, updated_at, approved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO UPDATE SET
           product_name = EXCLUDED.product_name,
           category = EXCLUDED.category,
           brand = EXCLUDED.brand,
           quantity = EXCLUDED.quantity,
           unit_price = EXCLUDED.unit_price,
           sku = EXCLUDED.sku,
           description = EXCLUDED.description,
           status = EXCLUDED.status,
           created_by = EXCLUDED.created_by,
           approved_by = EXCLUDED.approved_by,
           updated_at = EXCLUDED.updated_at,
           approved_at = EXCLUDED.approved_at`,
        [
          item.id,
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
    console.log(`   ✅ Migrated ${items.length} inventory items`);
    
    // Reset sequence for inventory_items table
    const maxItemId = await client.query('SELECT MAX(id) as max_id FROM inventory_items');
    if (maxItemId.rows[0]?.max_id) {
      await client.query(`SELECT setval('inventory_items_id_seq', $1, true)`, [maxItemId.rows[0].max_id]);
    }
    await client.query('ALTER TABLE inventory_items ALTER COLUMN id SET DEFAULT nextval(\'inventory_items_id_seq\')');
    
    // 3. Push Sales
    console.log('💰 Migrating sales...');
    const sales = await sqliteQuery('SELECT * FROM sales ORDER BY id');
    
    // Ensure sales table allows manual ID insertion
    await client.query('ALTER TABLE sales ALTER COLUMN id DROP DEFAULT');
    
    for (const sale of sales) {
      await client.query(
        `INSERT INTO sales 
         (id, inventory_item_id, quantity_sold, unit_price, total_amount, sold_by, 
          customer_name, payment_method, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           inventory_item_id = EXCLUDED.inventory_item_id,
           quantity_sold = EXCLUDED.quantity_sold,
           unit_price = EXCLUDED.unit_price,
           total_amount = EXCLUDED.total_amount,
           sold_by = EXCLUDED.sold_by,
           customer_name = EXCLUDED.customer_name,
           payment_method = EXCLUDED.payment_method,
           notes = EXCLUDED.notes`,
        [
          sale.id,
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
    console.log(`   ✅ Migrated ${sales.length} sales`);
    
    // Reset sequence for sales table
    const maxSaleId = await client.query('SELECT MAX(id) as max_id FROM sales');
    if (maxSaleId.rows[0]?.max_id) {
      await client.query(`SELECT setval('sales_id_seq', $1, true)`, [maxSaleId.rows[0].max_id]);
    }
    await client.query('ALTER TABLE sales ALTER COLUMN id SET DEFAULT nextval(\'sales_id_seq\')');
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\n✅ Data migration completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Inventory Items: ${items.length}`);
    console.log(`   - Sales: ${sales.length}`);
    console.log(`   - Total Records: ${users.length + items.length + sales.length}`);
    
    sqliteDb.close();
    client.release();
    await pool.end();
    
    console.log('\n✅ All data has been pushed to Vercel database!');
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
    }
    console.error('❌ Migration error:', error);
    sqliteDb.close();
    await pool.end();
    process.exit(1);
  }
};

// Run migration
pushData();
