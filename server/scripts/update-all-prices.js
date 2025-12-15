const db = require('../database');

const updateAllPrices = async () => {
  try {
    await db.init();
    const database = db.getDb();

    console.log('🔄 Updating all prices to $29.99...\n');

    database.run(
      'UPDATE inventory_items SET unit_price = 29.99 WHERE unit_price IS NOT NULL',
      function(err) {
        if (err) {
          console.error('❌ Error updating prices:', err);
          process.exit(1);
        }

        console.log(`✅ Successfully updated ${this.changes} inventory items to $29.99`);
        
        // Also update sales unit_price if needed (optional - you might want to keep historical sales prices)
        database.run(
          'UPDATE sales SET unit_price = 29.99 WHERE unit_price IS NOT NULL',
          function(salesErr) {
            if (salesErr) {
              console.warn('⚠️  Warning: Could not update sales prices:', salesErr.message);
            } else {
              console.log(`✅ Successfully updated ${this.changes} sales records to $29.99`);
            }
            
            console.log('\n✨ All prices have been updated to $29.99!');
            process.exit(0);
          }
        );
      }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

updateAllPrices();




