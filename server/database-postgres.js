/**
 * PostgreSQL Database Connection for Vercel
 * Provides SQLite-compatible API for seamless migration
 * Uses Supabase (PostgreSQL) for production
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Check if PostgreSQL connection string is available
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
const USE_POSTGRES = !!DATABASE_URL;

let pool; // PostgreSQL connection pool

// Initialize PostgreSQL connection
const init = async () => {
  if (!USE_POSTGRES) {
    throw new Error('PostgreSQL database URL not configured');
  }

  try {
    pool = new Pool({
      connectionString: DATABASE_URL,
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
      const insertResult = await client.query(
        'INSERT INTO users (username, email, password, role, firebase_uid) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        ['mautaz', 'mautaz@prestige.com', defaultPassword, 'admin', null]
      );
      console.log('✅ Default admin user created: username=mautaz, password=Mautaz123');
    }
  } catch (error) {
    console.error('❌ Error creating default admin:', error);
    throw error;
  }
};

// SQLite-compatible database adapter
class PostgresAdapter {
  constructor(pool) {
    this.pool = pool;
  }

  // Convert SQLite parameter placeholders (?) to PostgreSQL ($1, $2, ...)
  convertQuery(sql, params = []) {
    let paramIndex = 1;
    const convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    return { sql: convertedSql, params };
  }

  // SQLite .run() equivalent - for INSERT, UPDATE, DELETE
  run(sql, params, callback) {
    const { sql: pgSql, params: pgParams } = this.convertQuery(sql, params);
    
    // Check if this is an INSERT statement that needs RETURNING id
    const isInsert = /^\s*INSERT\s+INTO/i.test(sql.trim());
    const finalSql = isInsert && !pgSql.includes('RETURNING') 
      ? pgSql.replace(/;?\s*$/, '') + ' RETURNING id'
      : pgSql;
    
    this.pool.query(finalSql, pgParams)
      .then(result => {
        // Create a mock 'this' object with lastID for SQLite compatibility
        const mockThis = {
          lastID: result.rows[0]?.id || null,
          changes: result.rowCount || 0
        };
        
        if (callback) {
          callback.call(mockThis, null);
        }
      })
      .catch(error => {
        if (callback) {
          callback(error);
        }
      });
  }

  // SQLite .get() equivalent - returns first row
  get(sql, params, callback) {
    const { sql: pgSql, params: pgParams } = this.convertQuery(sql, params);
    
    this.pool.query(pgSql, pgParams)
      .then(result => {
        const row = result.rows[0] || null;
        if (callback) {
          callback(null, row);
        }
      })
      .catch(error => {
        if (callback) {
          callback(error, null);
        }
      });
  }

  // SQLite .all() equivalent - returns all rows
  all(sql, params, callback) {
    const { sql: pgSql, params: pgParams } = this.convertQuery(sql, params);
    
    this.pool.query(pgSql, pgParams)
      .then(result => {
        if (callback) {
          callback(null, result.rows);
        }
      })
      .catch(error => {
        if (callback) {
          callback(error, []);
        }
      });
  }

  // Async versions for modern code
  async runAsync(sql, params) {
    const { sql: pgSql, params: pgParams } = this.convertQuery(sql, params);
    const isInsert = /^\s*INSERT\s+INTO/i.test(sql.trim());
    const finalSql = isInsert && !pgSql.includes('RETURNING') 
      ? pgSql.replace(/;?\s*$/, '') + ' RETURNING id'
      : pgSql;
    const result = await this.pool.query(finalSql, pgParams);
    return {
      lastID: result.rows[0]?.id || null,
      changes: result.rowCount || 0
    };
  }

  async getAsync(sql, params) {
    const { sql: pgSql, params: pgParams } = this.convertQuery(sql, params);
    const result = await this.pool.query(pgSql, pgParams);
    return result.rows[0] || null;
  }

  async allAsync(sql, params) {
    const { sql: pgSql, params: pgParams } = this.convertQuery(sql, params);
    const result = await this.pool.query(pgSql, pgParams);
    return result.rows;
  }
}

// Get database adapter (SQLite-compatible interface)
const getDb = () => {
  if (!USE_POSTGRES) {
    throw new Error('PostgreSQL not configured');
  }
  if (!pool) {
    throw new Error('Database not initialized. Call init() first.');
  }
  return new PostgresAdapter(pool);
};

// Close database connection
const close = async () => {
  if (pool) {
    await pool.end();
    console.log('PostgreSQL connection pool closed');
  }
};

module.exports = {
  init,
  getDb,
  close,
  USE_POSTGRES
};
