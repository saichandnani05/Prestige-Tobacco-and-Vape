/**
 * Export database to SQL dump file
 * This creates a SQL file that can be used to recreate the database on Vercel
 * 
 * Usage: node server/scripts/export-database.js
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Database path
const DB_DIR = process.env.VERCEL === '1' ? '/tmp' : path.join(__dirname, '..');
const DB_PATH = path.join(DB_DIR, 'inventory.db');
const OUTPUT_FILE = path.join(__dirname, '..', 'database-export.sql');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err);
    process.exit(1);
  }
  console.log('✅ Connected to database');
  
  // Start SQL dump
  let sqlDump = '-- Database Export\n';
  sqlDump += '-- Generated: ' + new Date().toISOString() + '\n\n';
  sqlDump += 'BEGIN TRANSACTION;\n\n';
  
  // Export schema
  db.all("SELECT sql FROM sqlite_master WHERE type='table' AND sql IS NOT NULL", [], (err, tables) => {
    if (err) {
      console.error('❌ Error getting tables:', err);
      db.close();
      process.exit(1);
    }
    
    sqlDump += '-- Table schemas\n';
    tables.forEach(table => {
      sqlDump += table.sql + ';\n\n';
    });
    
    // Export data from each table
    const tablesToExport = ['users', 'inventory_items', 'sales'];
    let tablesProcessed = 0;
    
    tablesToExport.forEach(tableName => {
      db.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
        if (err) {
          console.error(`❌ Error reading ${tableName}:`, err);
          return;
        }
        
        if (rows.length > 0) {
          sqlDump += `-- Data for ${tableName}\n`;
          
          rows.forEach(row => {
            const columns = Object.keys(row);
            const values = columns.map(col => {
              const value = row[col];
              if (value === null) return 'NULL';
              if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
              return value;
            });
            
            sqlDump += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
          });
          sqlDump += '\n';
        }
        
        tablesProcessed++;
        if (tablesProcessed === tablesToExport.length) {
          sqlDump += 'COMMIT;\n';
          
          // Write to file
          fs.writeFileSync(OUTPUT_FILE, sqlDump);
          console.log(`✅ Database exported to: ${OUTPUT_FILE}`);
          console.log(`   Tables exported: ${tablesToExport.length}`);
          
          // Count records before closing
          let totalRecords = 0;
          let countProcessed = 0;
          tablesToExport.forEach(tableName => {
            db.get(`SELECT COUNT(*) as count FROM ${tableName}`, [], (err, row) => {
              if (!err && row) {
                totalRecords += row.count;
              }
              countProcessed++;
              if (countProcessed === tablesToExport.length) {
                console.log(`   Total records: ${totalRecords}`);
                db.close((err) => {
                  if (err) {
                    console.error('⚠️ Error closing database:', err);
                  }
                  process.exit(0);
                });
              }
            });
          });
        }
      });
    });
  });
});
