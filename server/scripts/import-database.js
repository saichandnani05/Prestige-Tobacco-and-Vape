/**
 * Import database from SQL dump file
 * This can be used to initialize the database on Vercel with existing data
 * 
 * Usage: node server/scripts/import-database.js [path-to-sql-file]
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Database path
const DB_DIR = process.env.VERCEL === '1' ? '/tmp' : path.join(__dirname, '..');
const DB_PATH = path.join(DB_DIR, 'inventory.db');

// SQL file path
const SQL_FILE = process.argv[2] || path.join(__dirname, '..', 'database-export.sql');

if (!fs.existsSync(SQL_FILE)) {
  console.error(`❌ SQL file not found: ${SQL_FILE}`);
  process.exit(1);
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err);
    process.exit(1);
  }
  console.log('✅ Connected to database');
  
  // Read SQL file
  const sql = fs.readFileSync(SQL_FILE, 'utf8');
  
  // Execute SQL
  db.exec(sql, (err) => {
    if (err) {
      console.error('❌ Error importing database:', err);
      db.close();
      process.exit(1);
    }
    
    console.log('✅ Database imported successfully!');
    console.log(`   SQL file: ${SQL_FILE}`);
    
    // Verify import
    db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
      if (!err && row) {
        console.log(`   Users imported: ${row.count}`);
      }
      db.get('SELECT COUNT(*) as count FROM inventory_items', [], (err, row) => {
        if (!err && row) {
          console.log(`   Inventory items imported: ${row.count}`);
        }
        db.get('SELECT COUNT(*) as count FROM sales', [], (err, row) => {
          if (!err && row) {
            console.log(`   Sales imported: ${row.count}`);
          }
          db.close();
        });
      });
    });
  });
});
