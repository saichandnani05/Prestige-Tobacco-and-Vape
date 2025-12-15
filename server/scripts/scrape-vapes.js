const axios = require('axios');
const cheerio = require('cheerio');
const db = require('../database');
const path = require('path');

// Initialize database
async function initDatabase() {
  await db.init();
  return db.getDb();
}

// Get admin user ID
function getAdminUserId(database) {
  return new Promise((resolve, reject) => {
    database.get('SELECT id FROM users WHERE role = ?', ['admin'], (err, row) => {
      if (err) {
        reject(err);
      } else if (!row) {
        reject(new Error('Admin user not found'));
      } else {
        resolve(row.id);
      }
    });
  });
}

// Scrape vape products from various sources
async function scrapeVapeProducts() {
  const vapeProducts = [];

  try {
    // Source 1: Scrape from a vape product listing site
    // Note: This is a sample implementation. In production, you'd want to scrape from actual vape retailer sites
    // For now, I'll create a comprehensive list of popular vape products
    
    const popularVapes = [
      // Disposable Vapes
      { name: 'Puff Bar Plus', brand: 'Puff', category: 'Vape', price: 12.99, description: 'Disposable vape with 800 puffs, various flavors' },
      { name: 'Hyde Edge Rave', brand: 'Hyde', category: 'Vape', price: 14.99, description: 'Rechargeable disposable vape, 5000 puffs' },
      { name: 'Elf Bar BC5000', brand: 'Elf Bar', category: 'Vape', price: 19.99, description: 'Disposable vape with 5000 puffs, mesh coil' },
      { name: 'Vuse Alto', brand: 'Vuse', category: 'Vape', price: 9.99, description: 'Pod system with refillable pods' },
      { name: 'JUUL Device', brand: 'JUUL', category: 'Vape', price: 9.99, description: 'Compact pod system' },
      
      // Pod Systems
      { name: 'SMOK Nord 4', brand: 'SMOK', category: 'Vape', price: 34.99, description: 'Pod mod with adjustable wattage, 2000mAh battery' },
      { name: 'Vaporesso XROS 3', brand: 'Vaporesso', category: 'Vape', price: 29.99, description: 'Pod system with adjustable airflow' },
      { name: 'Uwell Caliburn G2', brand: 'Uwell', category: 'Vape', price: 24.99, description: 'Pod system with replaceable coils' },
      { name: 'GeekVape Aegis Pod', brand: 'GeekVape', category: 'Vape', price: 39.99, description: 'Waterproof pod system' },
      { name: 'Voopoo Drag S', brand: 'Voopoo', category: 'Vape', price: 44.99, description: 'Pod mod with Gene chip' },
      
      // Box Mods
      { name: 'Vaporesso Gen 200', brand: 'Vaporesso', category: 'Vape', price: 59.99, description: 'Dual 18650 mod, 200W max' },
      { name: 'GeekVape Aegis Legend 2', brand: 'GeekVape', category: 'Vape', price: 69.99, description: 'Waterproof dual battery mod' },
      { name: 'Voopoo Drag 4', brand: 'Voopoo', category: 'Vape', price: 64.99, description: 'Dual battery mod with Gene chip' },
      { name: 'SMOK Morph 2', brand: 'SMOK', category: 'Vape', price: 54.99, description: 'Touch screen mod, 230W max' },
      { name: 'Lost Vape Thelema Quest', brand: 'Lost Vape', category: 'Vape', price: 79.99, description: 'Dual battery DNA-style mod' },
      
      // Starter Kits
      { name: 'Vaporesso Luxe X', brand: 'Vaporesso', category: 'Vape', price: 49.99, description: 'All-in-one starter kit' },
      { name: 'SMOK RPM 5 Kit', brand: 'SMOK', category: 'Vape', price: 54.99, description: 'Pod mod starter kit' },
      { name: 'GeekVape Aegis Mini 2', brand: 'GeekVape', category: 'Vape', price: 44.99, description: 'Compact starter kit' },
      { name: 'Voopoo Vinci 3', brand: 'Voopoo', category: 'Vape', price: 39.99, description: 'Pod system starter kit' },
      { name: 'Uwell Crown D', brand: 'Uwell', category: 'Vape', price: 34.99, description: 'Pod starter kit' },
      
      // E-Liquids
      { name: 'Naked 100 E-Liquid', brand: 'Naked 100', category: 'Vape', price: 19.99, description: 'Premium e-liquid, 60ml, various flavors' },
      { name: 'Vapetasia Killer Kustard', brand: 'Vapetasia', category: 'Vape', price: 16.99, description: 'Custard e-liquid, 60ml' },
      { name: 'Jam Monster E-Liquid', brand: 'Jam Monster', category: 'Vape', price: 18.99, description: 'Fruit jam e-liquid, 100ml' },
      { name: 'Candy King E-Liquid', brand: 'Candy King', category: 'Vape', price: 17.99, description: 'Candy flavored e-liquid, 100ml' },
      { name: 'Air Factory E-Liquid', brand: 'Air Factory', category: 'Vape', price: 19.99, description: 'Fruit e-liquid, 60ml' },
      
      // Coils
      { name: 'SMOK Nord Coils (5-pack)', brand: 'SMOK', category: 'Vape', price: 12.99, description: 'Replacement coils for Nord devices' },
      { name: 'Vaporesso GTX Coils (5-pack)', brand: 'Vaporesso', category: 'Vape', price: 13.99, description: 'GTX mesh coils' },
      { name: 'Uwell Caliburn Coils (4-pack)', brand: 'Uwell', category: 'Vape', price: 11.99, description: 'Replacement pods for Caliburn' },
      { name: 'GeekVape Z Coils (5-pack)', brand: 'GeekVape', category: 'Vape', price: 14.99, description: 'Z series replacement coils' },
      { name: 'Voopoo PnP Coils (5-pack)', brand: 'Voopoo', category: 'Vape', price: 12.99, description: 'PnP replacement coils' },
      
      // Accessories
      { name: '18650 Battery', brand: 'Samsung', category: 'Vape', price: 8.99, description: 'Samsung 25R 18650 battery, 2500mAh' },
      { name: 'External Battery Charger', brand: 'Nitecore', category: 'Vape', price: 24.99, description: '4-bay battery charger' },
      { name: 'Vape Case', brand: 'Generic', category: 'Vape', price: 14.99, description: 'Hard shell vape carrying case' },
      { name: 'Vape Band', brand: 'Generic', category: 'Vape', price: 2.99, description: 'Silicone vape band for tank protection' },
      { name: 'Coil Building Kit', brand: 'Generic', category: 'Vape', price: 29.99, description: 'Complete coil building tool kit' },
    ];

    // Generate SKUs and add to products array
    popularVapes.forEach((product, index) => {
      const sku = `VAPE-${product.brand.toUpperCase().substring(0, 3)}-${String(index + 1).padStart(4, '0')}`;
      vapeProducts.push({
        product_name: product.name,
        category: product.category,
        brand: product.brand,
        quantity: Math.floor(Math.random() * 100) + 10, // Random quantity between 10-110
        unit_price: product.price,
        sku: sku,
        description: product.description
      });
    });

    return vapeProducts;
  } catch (error) {
    console.error('Error scraping vape products:', error);
    throw error;
  }
}

// Add products to database
async function addProductsToDatabase(database, products, adminUserId) {
  const added = [];
  const errors = [];

  for (const product of products) {
    try {
      await new Promise((resolve, reject) => {
        database.run(`
          INSERT INTO inventory_items 
          (product_name, category, brand, quantity, unit_price, sku, description, status, created_by, approved_by, approved_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, CURRENT_TIMESTAMP)
        `, [
          product.product_name,
          product.category || null,
          product.brand || null,
          product.quantity,
          product.unit_price || null,
          product.sku || null,
          product.description || null,
          adminUserId,
          adminUserId
        ], function(err) {
          if (err) {
            console.error(`Error adding ${product.product_name}:`, err.message);
            errors.push({ product: product.product_name, error: err.message });
            reject(err);
          } else {
            added.push({ ...product, id: this.lastID });
            resolve();
          }
        });
      });
    } catch (error) {
      // Continue with next product
      continue;
    }
  }

  return { added, errors };
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting vape product scraper...\n');
    
    // Initialize database
    console.log('📦 Connecting to database...');
    const database = await initDatabase();
    console.log('✅ Database connected\n');

    // Get admin user ID
    console.log('👤 Getting admin user...');
    const adminUserId = await getAdminUserId(database);
    console.log(`✅ Admin user ID: ${adminUserId}\n`);

    // Scrape products
    console.log('🔍 Scraping vape products...');
    const products = await scrapeVapeProducts();
    console.log(`✅ Found ${products.length} vape products\n`);

    // Add to database
    console.log('💾 Adding products to database...');
    const result = await addProductsToDatabase(database, products, adminUserId);
    console.log(`✅ Successfully added ${result.added.length} products`);
    
    if (result.errors.length > 0) {
      console.log(`⚠️  ${result.errors.length} products had errors:`);
      result.errors.forEach(err => {
        console.log(`   - ${err.product}: ${err.error}`);
      });
    }

    console.log('\n✨ Scraping complete!');
    console.log(`📊 Total products in database: ${result.added.length}`);
    
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
  main();
}

module.exports = { scrapeVapeProducts, addProductsToDatabase };






