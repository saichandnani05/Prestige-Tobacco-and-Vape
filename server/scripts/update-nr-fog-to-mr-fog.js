const db = require('../database');

// Update NR Fog to Mr Fog in database
async function updateBrandName() {
  try {
    console.log('🔄 Updating brand name from "NR Fog" to "Mr Fog"...\n');
    
    // Initialize database
    console.log('📦 Connecting to database...');
    await db.init();
    const database = db.getDb();
    console.log('✅ Database connected\n');

    // Update brand name in inventory_items
    await new Promise((resolve, reject) => {
      database.run(
        `UPDATE inventory_items 
         SET brand = 'Mr Fog', 
             updated_at = CURRENT_TIMESTAMP
         WHERE brand = 'NR Fog'`,
        function(err) {
          if (err) {
            reject(err);
          } else {
            console.log(`✅ Updated ${this.changes} inventory items`);
            resolve();
          }
        }
      );
    });

    // Also update product names that contain "NR Fog"
    await new Promise((resolve, reject) => {
      database.run(
        `UPDATE inventory_items 
         SET product_name = REPLACE(product_name, 'NR Fog', 'Mr Fog'),
             updated_at = CURRENT_TIMESTAMP
         WHERE product_name LIKE '%NR Fog%'`,
        function(err) {
          if (err) {
            reject(err);
          } else {
            console.log(`✅ Updated ${this.changes} product names`);
            resolve();
          }
        }
      );
    });

    // Update descriptions
    await new Promise((resolve, reject) => {
      database.run(
        `UPDATE inventory_items 
         SET description = REPLACE(description, 'NR Fog', 'Mr Fog'),
             updated_at = CURRENT_TIMESTAMP
         WHERE description LIKE '%NR Fog%'`,
        function(err) {
          if (err) {
            reject(err);
          } else {
            console.log(`✅ Updated ${this.changes} descriptions`);
            resolve();
          }
        }
      );
    });

    console.log('\n✨ Brand name update complete!');
    
    // Close database
    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await db.close();
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  updateBrandName();
}

module.exports = { updateBrandName };




