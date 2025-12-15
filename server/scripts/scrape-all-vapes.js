const axios = require('axios');
const cheerio = require('cheerio');
const db = require('../database');

// Comprehensive vape brands and their products with flavors
const vapeDatabase = {
  // Disposable Vapes
  'Puff': {
    products: [
      { name: 'Puff Bar Plus', flavors: ['Mango', 'Strawberry', 'Blueberry', 'Watermelon', 'Grape', 'Peach', 'Pineapple', 'Banana Ice', 'Cool Mint', 'Tangerine'], basePrice: 12.99 },
      { name: 'Puff XXL', flavors: ['Mango', 'Strawberry', 'Blue Razz', 'Watermelon', 'Grape', 'Peach', 'Pineapple', 'Banana Ice', 'Menthol', 'Lush Ice'], basePrice: 14.99 },
      { name: 'Puff Flow', flavors: ['Mango', 'Strawberry', 'Blueberry', 'Watermelon', 'Grape', 'Peach', 'Pineapple', 'Banana Ice', 'Mint', 'Tropical'], basePrice: 13.99 },
    ]
  },
  'Hyde': {
    products: [
      { name: 'Hyde Edge Rave', flavors: ['Blue Razz Ice', 'Strawberry Banana', 'Mango', 'Peach Mango Watermelon', 'Pineapple', 'Grape', 'Strawberry', 'Watermelon', 'Blue Razz', 'Lush Ice'], basePrice: 14.99 },
      { name: 'Hyde Color', flavors: ['Blue Razz', 'Strawberry', 'Mango', 'Peach', 'Pineapple', 'Grape', 'Watermelon', 'Banana', 'Cherry', 'Lemon'], basePrice: 12.99 },
      { name: 'Hyde Retro Rave', flavors: ['Blue Razz', 'Strawberry', 'Mango', 'Peach', 'Pineapple', 'Grape', 'Watermelon', 'Banana', 'Cherry', 'Lemon'], basePrice: 15.99 },
      { name: 'Hyde N-Bar', flavors: ['Blue Razz', 'Strawberry', 'Mango', 'Peach', 'Pineapple', 'Grape', 'Watermelon', 'Banana', 'Cherry', 'Lemon'], basePrice: 11.99 },
    ]
  },
  'Elf Bar': {
    products: [
      { name: 'Elf Bar BC5000', flavors: ['Blue Razz Ice', 'Strawberry Mango', 'Watermelon Ice', 'Peach Ice', 'Pineapple', 'Grape', 'Strawberry', 'Mango', 'Banana Ice', 'Lush Ice'], basePrice: 19.99 },
      { name: 'Elf Bar TE5000', flavors: ['Blue Razz', 'Strawberry', 'Mango', 'Peach', 'Pineapple', 'Grape', 'Watermelon', 'Banana', 'Cherry', 'Lemon'], basePrice: 18.99 },
      { name: 'Elf Bar Ultra', flavors: ['Blue Razz', 'Strawberry', 'Mango', 'Peach', 'Pineapple', 'Grape', 'Watermelon', 'Banana', 'Cherry', 'Lemon'], basePrice: 20.99 },
    ]
  },
  'Geek Bar': {
    products: [
      { name: 'Geek Bar Pulse', flavors: ['Miami Mint', 'Blue Razz Ice', 'Strawberry Mango', 'Watermelon Ice', 'Peach Ice', 'Pineapple', 'Grape', 'Strawberry', 'Mango', 'Banana Ice'], basePrice: 19.99 },
      { name: 'Geek Bar Meloso', flavors: ['Blue Razz', 'Strawberry', 'Mango', 'Peach', 'Pineapple', 'Grape', 'Watermelon', 'Banana', 'Cherry', 'Lemon'], basePrice: 17.99 },
    ]
  },
  'Vuse': {
    products: [
      { name: 'Vuse Alto', flavors: ['Original', 'Menthol', 'Rich Tobacco', 'Golden Tobacco', 'Berry', 'Mint', 'Mixed Berry', 'Creme'], basePrice: 9.99 },
      { name: 'Vuse Vibe', flavors: ['Original', 'Menthol', 'Rich Tobacco', 'Golden Tobacco'], basePrice: 8.99 },
      { name: 'Vuse Ciro', flavors: ['Original', 'Menthol', 'Rich Tobacco'], basePrice: 7.99 },
    ]
  },
  'JUUL': {
    products: [
      { name: 'JUUL Device', flavors: ['Virginia Tobacco', 'Menthol', 'Classic Tobacco', 'Golden Tobacco'], basePrice: 9.99 },
    ]
  },
  'SMOK': {
    products: [
      { name: 'SMOK Nord 4', flavors: ['Device Only'], basePrice: 34.99 },
      { name: 'SMOK Nord 5', flavors: ['Device Only'], basePrice: 39.99 },
      { name: 'SMOK RPM 5', flavors: ['Device Only'], basePrice: 44.99 },
      { name: 'SMOK Novo 4', flavors: ['Device Only'], basePrice: 29.99 },
      { name: 'SMOK Morph 2', flavors: ['Device Only'], basePrice: 54.99 },
    ]
  },
  'Vaporesso': {
    products: [
      { name: 'Vaporesso XROS 3', flavors: ['Device Only'], basePrice: 29.99 },
      { name: 'Vaporesso Luxe X', flavors: ['Device Only'], basePrice: 49.99 },
      { name: 'Vaporesso Gen 200', flavors: ['Device Only'], basePrice: 59.99 },
      { name: 'Vaporesso Target 200', flavors: ['Device Only'], basePrice: 64.99 },
    ]
  },
  'Uwell': {
    products: [
      { name: 'Uwell Caliburn G2', flavors: ['Device Only'], basePrice: 24.99 },
      { name: 'Uwell Caliburn A2', flavors: ['Device Only'], basePrice: 19.99 },
      { name: 'Uwell Crown D', flavors: ['Device Only'], basePrice: 34.99 },
      { name: 'Uwell Valyrian 3', flavors: ['Device Only'], basePrice: 54.99 },
    ]
  },
  'GeekVape': {
    products: [
      { name: 'GeekVape Aegis Pod', flavors: ['Device Only'], basePrice: 39.99 },
      { name: 'GeekVape Aegis Legend 2', flavors: ['Device Only'], basePrice: 69.99 },
      { name: 'GeekVape Aegis Mini 2', flavors: ['Device Only'], basePrice: 44.99 },
      { name: 'GeekVape L200', flavors: ['Device Only'], basePrice: 59.99 },
    ]
  },
  'Voopoo': {
    products: [
      { name: 'Voopoo Drag S', flavors: ['Device Only'], basePrice: 44.99 },
      { name: 'Voopoo Drag 4', flavors: ['Device Only'], basePrice: 64.99 },
      { name: 'Voopoo Vinci 3', flavors: ['Device Only'], basePrice: 39.99 },
      { name: 'Voopoo Argus Pro', flavors: ['Device Only'], basePrice: 49.99 },
    ]
  },
  'Lost Vape': {
    products: [
      { name: 'Lost Vape Thelema Quest', flavors: ['Device Only'], basePrice: 79.99 },
      { name: 'Lost Vape Ursa Quest', flavors: ['Device Only'], basePrice: 69.99 },
    ]
  },
  // E-Liquid Brands
  'Naked 100': {
    products: [
      { name: 'Naked 100 E-Liquid', flavors: ['Hawaiian POG', 'Lava Flow', 'Very Berry', 'Green Blast', 'Brain Freeze', 'Menthol', 'American Patriots', 'Euro Gold', 'Cuban Blend', 'Tobacco'], basePrice: 19.99 },
    ]
  },
  'Vapetasia': {
    products: [
      { name: 'Vapetasia Killer Kustard', flavors: ['Original', 'Strawberry', 'Blueberry', 'Vanilla', 'Chocolate'], basePrice: 16.99 },
      { name: 'Vapetasia Milk of the Poppy', flavors: ['Original'], basePrice: 17.99 },
      { name: 'Vapetasia Royalty II', flavors: ['Original'], basePrice: 18.99 },
    ]
  },
  'Jam Monster': {
    products: [
      { name: 'Jam Monster E-Liquid', flavors: ['Strawberry', 'Blueberry', 'Blackberry', 'Grape', 'Apple', 'Raspberry', 'Mixed Berry'], basePrice: 18.99 },
    ]
  },
  'Candy King': {
    products: [
      { name: 'Candy King E-Liquid', flavors: ['Sour Worms', 'Sour Belts', 'Sour Patch', 'Gummy Worms', 'Peach Rings', 'Strawberry Watermelon', 'Bubblegum'], basePrice: 17.99 },
    ]
  },
  'Air Factory': {
    products: [
      { name: 'Air Factory E-Liquid', flavors: ['Blue Razz', 'Strawberry Kiwi', 'Mystery', 'Melon Lush', 'Tropical', 'Berry Rush'], basePrice: 19.99 },
    ]
  },
  'Ruthless': {
    products: [
      { name: 'Ruthless E-Liquid', flavors: ['Grape Drank', 'Swamp Thang', 'Rise', 'Ez Duz It', 'Jungle Fever'], basePrice: 18.99 },
    ]
  },
  'Bad Drip': {
    products: [
      { name: 'Bad Drip E-Liquid', flavors: ['Don\'t Care Bear', 'God Nectar', 'Farley\'s Gnarly Sauce', 'Ugly Butter', 'Cereal Trip'], basePrice: 20.99 },
    ]
  },
  'Coastal Clouds': {
    products: [
      { name: 'Coastal Clouds E-Liquid', flavors: ['Blood Orange Mango Snow Cone', 'Iced Mango Berries', 'Iced Pineapple', 'Iced Apple Peach Strawberry', 'Iced Blueberry Banana'], basePrice: 19.99 },
    ]
  },
  'Pod Juice': {
    products: [
      { name: 'Pod Juice E-Liquid', flavors: ['Jewel Mint', 'Jewel Mango', 'Jewel Strawberry', 'Jewel Blueberry', 'Jewel Watermelon'], basePrice: 16.99 },
    ]
  },
  'Twist': {
    products: [
      { name: 'Twist E-Liquid', flavors: ['Pink Punch Lemonade', 'Strawberry Queen', 'Honeydew Melon Chew', 'Mint Zero', 'Strawberry Lemonade'], basePrice: 17.99 },
    ]
  },
  // Coil Brands
  'SMOK Coils': {
    products: [
      { name: 'SMOK Nord Coils', flavors: ['0.6Ω Mesh', '0.8Ω MTL', '1.4Ω Regular'], basePrice: 12.99 },
      { name: 'SMOK RPM Coils', flavors: ['0.4Ω Mesh', '0.6Ω Mesh', '0.8Ω MTL'], basePrice: 13.99 },
      { name: 'SMOK TFV Coils', flavors: ['TFV16', 'TFV18', 'TFV9'], basePrice: 14.99 },
    ]
  },
  'Vaporesso Coils': {
    products: [
      { name: 'Vaporesso GTX Coils', flavors: ['0.2Ω Mesh', '0.6Ω Mesh', '0.8Ω MTL', '1.2Ω MTL'], basePrice: 13.99 },
      { name: 'Vaporesso EUC Coils', flavors: ['0.5Ω Ceramic', '0.3Ω Mesh'], basePrice: 12.99 },
    ]
  },
  'Uwell Coils': {
    products: [
      { name: 'Uwell Caliburn Coils', flavors: ['0.8Ω Mesh', '1.0Ω Regular'], basePrice: 11.99 },
      { name: 'Uwell Crown Coils', flavors: ['0.23Ω Mesh', '0.5Ω Mesh'], basePrice: 14.99 },
    ]
  },
  'GeekVape Coils': {
    products: [
      { name: 'GeekVape Z Coils', flavors: ['0.2Ω Mesh', '0.4Ω Mesh', '0.6Ω Mesh'], basePrice: 14.99 },
      { name: 'GeekVape Aegis Coils', flavors: ['0.2Ω Mesh', '0.4Ω Mesh'], basePrice: 13.99 },
    ]
  },
  'Voopoo Coils': {
    products: [
      { name: 'Voopoo PnP Coils', flavors: ['0.15Ω Mesh', '0.2Ω Mesh', '0.3Ω Mesh', '0.6Ω MTL', '1.0Ω MTL'], basePrice: 12.99 },
    ]
  },
};

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

// Generate all vape products with flavors
function generateAllVapeProducts() {
  const allProducts = [];
  let productCounter = 1;

  for (const [brand, brandData] of Object.entries(vapeDatabase)) {
    for (const product of brandData.products) {
      // If product has flavors, create a separate entry for each flavor
      if (product.flavors && product.flavors.length > 0) {
        for (const flavor of product.flavors) {
          const productName = flavor === 'Device Only' 
            ? product.name 
            : `${product.name} - ${flavor}`;
          
          const sku = `VAPE-${brand.toUpperCase().substring(0, 4).padEnd(4, 'X')}-${String(productCounter).padStart(5, '0')}`;
          
          allProducts.push({
            product_name: productName,
            category: 'Vape',
            brand: brand,
            quantity: Math.floor(Math.random() * 100) + 10, // Random 10-110
            unit_price: product.basePrice + (Math.random() * 5 - 2.5), // Slight price variation
            sku: sku,
            description: flavor === 'Device Only' 
              ? `${product.name} device`
              : `${product.name} in ${flavor} flavor`,
            flavor: flavor === 'Device Only' ? null : flavor
          });
          
          productCounter++;
        }
      } else {
        // Product without flavors
        const sku = `VAPE-${brand.toUpperCase().substring(0, 4).padEnd(4, 'X')}-${String(productCounter).padStart(5, '0')}`;
        
        allProducts.push({
          product_name: product.name,
          category: 'Vape',
          brand: brand,
          quantity: Math.floor(Math.random() * 100) + 10,
          unit_price: product.basePrice + (Math.random() * 5 - 2.5),
          sku: sku,
          description: `${product.name} product`,
          flavor: null
        });
        
        productCounter++;
      }
    }
  }

  return allProducts;
}

// Add products to database (with update capability)
async function addProductsToDatabase(database, products, adminUserId) {
  const added = [];
  const updated = [];
  const errors = [];

  for (const product of products) {
    try {
      // Check if product with same name and brand already exists
      const existing = await new Promise((resolve, reject) => {
        database.get(
          'SELECT id, unit_price FROM inventory_items WHERE product_name = ? AND brand = ?',
          [product.product_name, product.brand],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (existing) {
        // Update existing product (keep existing price or update if needed)
        await new Promise((resolve, reject) => {
          database.run(`
            UPDATE inventory_items 
            SET quantity = ?, 
                sku = ?,
                description = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [
            product.quantity,
            product.sku || existing.sku,
            product.description || null,
            existing.id
          ], function(err) {
            if (err) {
              errors.push({ product: product.product_name, error: err.message });
              reject(err);
            } else {
              updated.push({ ...product, id: existing.id, price: existing.unit_price });
              resolve();
            }
          });
        });
      } else {
        // Insert new product
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
              errors.push({ product: product.product_name, error: err.message });
              reject(err);
            } else {
              added.push({ ...product, id: this.lastID });
              resolve();
            }
          });
        });
      }
    } catch (error) {
      // Continue with next product
      continue;
    }
  }

  return { added, updated, errors };
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting comprehensive vape product scraper...\n');
    
    // Initialize database
    console.log('📦 Connecting to database...');
    const database = await initDatabase();
    console.log('✅ Database connected\n');

    // Get admin user ID
    console.log('👤 Getting admin user...');
    const adminUserId = await getAdminUserId(database);
    console.log(`✅ Admin user ID: ${adminUserId}\n`);

    // Generate all products
    console.log('🔍 Generating comprehensive vape product list...');
    const products = generateAllVapeProducts();
    console.log(`✅ Generated ${products.length} vape products with all flavors\n`);

    // Add to database
    console.log('💾 Adding/updating products in database...');
    const result = await addProductsToDatabase(database, products, adminUserId);
    
    console.log(`\n📊 Results:`);
    console.log(`   ✅ New products added: ${result.added.length}`);
    console.log(`   🔄 Existing products updated: ${result.updated.length}`);
    
    if (result.errors.length > 0) {
      console.log(`   ⚠️  Errors: ${result.errors.length}`);
      result.errors.slice(0, 5).forEach(err => {
        console.log(`      - ${err.product}: ${err.error}`);
      });
      if (result.errors.length > 5) {
        console.log(`      ... and ${result.errors.length - 5} more errors`);
      }
    }

    // Show statistics
    const brandStats = {};
    products.forEach(p => {
      brandStats[p.brand] = (brandStats[p.brand] || 0) + 1;
    });

    console.log(`\n📈 Brand Breakdown:`);
    Object.entries(brandStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([brand, count]) => {
        console.log(`   ${brand}: ${count} products`);
      });

    console.log('\n✨ Scraping complete!');
    console.log(`📦 Total products processed: ${products.length}`);
    console.log(`\n💡 Tip: You can now update prices directly in the inventory system!`);
    
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

module.exports = { generateAllVapeProducts, addProductsToDatabase };






