const express = require('express');
const db = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all sales (with optional filters)
router.get('/', authenticate, (req, res) => {
  const database = db.getDb();
  const { startDate, endDate, limit = 50 } = req.query;

  let query = `
    SELECT s.*,
           i.product_name,
           i.brand,
           i.sku,
           u.username as sold_by_name,
           datetime(s.created_at) as created_at_formatted
    FROM sales s
    JOIN inventory_items i ON s.inventory_item_id = i.id
    JOIN users u ON s.sold_by = u.id
    WHERE 1=1
  `;
  
  // Note: s.* includes payment_method, customer_name, notes, created_at, etc.
  // created_at is stored in UTC format by SQLite, datetime() ensures proper formatting
  const params = [];

  if (startDate) {
    query += ` AND DATE(s.created_at) >= DATE(?)`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND DATE(s.created_at) <= DATE(?)`;
    params.push(endDate);
  }

  query += ` ORDER BY s.id ASC LIMIT ?`;
  params.push(parseInt(limit));

  database.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching sales:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get recent sales (alias for GET / with limit)
router.get('/recent', authenticate, (req, res) => {
  const database = db.getDb();
  const { limit = 10 } = req.query;

  const query = `
    SELECT s.*,
           i.product_name,
           i.brand,
           i.sku,
           u.username as sold_by_name
    FROM sales s
    JOIN inventory_items i ON s.inventory_item_id = i.id
    JOIN users u ON s.sold_by = u.id
    ORDER BY s.created_at DESC
    LIMIT ?
  `;
  
  // Note: s.* includes payment_method, customer_name, notes, etc.

  database.all(query, [parseInt(limit)], (err, rows) => {
    if (err) {
      console.error('Error fetching recent sales:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log(`📊 Returning ${rows?.length || 0} recent sales`);
    if (rows && rows.length > 0) {
      console.log('📊 Sample sale:', {
        id: rows[0].id,
        product: rows[0].product_name,
        amount: rows[0].total_amount,
        created_at: rows[0].created_at
      });
    }
    res.json(rows || []);
  });
});

// Get sales statistics
router.get('/stats', authenticate, (req, res) => {
  const database = db.getDb();
  const { period, startDate, endDate } = req.query;

  let dateFilter = '';
  const params = [];

  // Priority: If startDate/endDate are provided, use them. Otherwise, use period.
  if (startDate || endDate) {
    // Use date range
    const conditions = [];
    if (startDate) {
      conditions.push("DATE(created_at) >= DATE(?)");
      params.push(startDate);
    }
    if (endDate) {
      conditions.push("DATE(created_at) <= DATE(?)");
      params.push(endDate);
    }
    dateFilter = conditions.join(' AND ');
    console.log(`📊 Fetching stats for date range: ${startDate || 'no start'} to ${endDate || 'no end'}`);
  } else {
    // Fallback to period-based filtering
    switch (period) {
      case 'today':
        // Use local time for today's filter - more flexible to catch all of today
        // Note: SQLite uses server's local time, but client will display in user's timezone
        dateFilter = "DATE(created_at, 'localtime') = DATE('now', 'localtime')";
        break;
      case 'yesterday':
        // Filter for yesterday's sales
        dateFilter = "DATE(created_at, 'localtime') = DATE('now', '-1 day', 'localtime')";
        break;
      case 'week':
        dateFilter = "created_at >= datetime('now', '-7 days', 'localtime')";
        break;
      case 'month':
        dateFilter = "created_at >= datetime('now', '-30 days', 'localtime')";
        break;
      case 'all':
      default:
        dateFilter = '1=1';
        break;
    }
    console.log(`📊 Fetching stats for period: ${period}, filter: ${dateFilter}`);
  }

  const query = `
    SELECT 
      COUNT(*) as total_sales,
      COALESCE(SUM(quantity_sold), 0) as total_items_sold,
      COALESCE(SUM(total_amount), 0) as total_revenue,
      COALESCE(AVG(total_amount), 0) as average_sale_amount,
      COALESCE(MAX(total_amount), 0) as largest_sale,
      COALESCE(MIN(total_amount), 0) as smallest_sale
    FROM sales
    WHERE ${dateFilter}
  `;

  database.get(query, params, (err, stats) => {
    if (err) {
      console.error('Error fetching sales stats:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Ensure stats are numbers (SQLite might return strings or null)
    // SQLite SUM/AVG return NULL when there are no rows, so handle that
    const normalizedStats = {
      total_sales: (stats?.total_sales != null) ? parseInt(stats.total_sales) : 0,
      total_items_sold: (stats?.total_items_sold != null) ? parseInt(stats.total_items_sold) : 0,
      total_revenue: (stats?.total_revenue != null) ? parseFloat(stats.total_revenue) : 0,
      average_sale_amount: (stats?.average_sale_amount != null) ? parseFloat(stats.average_sale_amount) : 0,
      largest_sale: (stats?.largest_sale != null) ? parseFloat(stats.largest_sale) : 0,
      smallest_sale: (stats?.smallest_sale != null) ? parseFloat(stats.smallest_sale) : 0
    };

    console.log('📊 Sales stats for period', period, ':', normalizedStats);

    // Get top selling products
    const topProductsQuery = `
      SELECT 
        i.product_name,
        i.brand,
        SUM(s.quantity_sold) as total_quantity,
        SUM(s.total_amount) as total_revenue,
        COUNT(s.id) as sale_count
      FROM sales s
      JOIN inventory_items i ON s.inventory_item_id = i.id
      WHERE ${dateFilter}
      GROUP BY s.inventory_item_id
      ORDER BY total_quantity DESC
      LIMIT 10
    `;

    database.all(topProductsQuery, params, (err, topProducts) => {
      if (err) {
        console.error('Error fetching top products:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      const response = {
        ...normalizedStats,
        topProducts: topProducts || []
      };

      console.log('📊 Returning stats response:', {
        total_sales: response.total_sales,
        total_revenue: response.total_revenue,
        topProductsCount: response.topProducts.length
      });

      res.json(response);
    });
  });
});


// Create a new sale
router.post('/', authenticate, (req, res) => {
  const database = db.getDb();
  let { inventory_item_id, quantity_sold, unit_price, customer_name, payment_method, notes } = req.body;

  // Validate required fields
  if (!inventory_item_id || quantity_sold === undefined || quantity_sold === null || !unit_price) {
    return res.status(400).json({ error: 'inventory_item_id, quantity_sold, and unit_price are required' });
  }

  // Convert to proper types
  inventory_item_id = parseInt(inventory_item_id);
  quantity_sold = parseInt(quantity_sold);
  unit_price = parseFloat(unit_price);

  // Validate types
  if (isNaN(inventory_item_id) || isNaN(quantity_sold) || isNaN(unit_price)) {
    return res.status(400).json({ error: 'Invalid data types. inventory_item_id and quantity_sold must be numbers, unit_price must be a valid number' });
  }

  if (quantity_sold < 1) {
    return res.status(400).json({ error: 'Quantity must be at least 1' });
  }

  if (unit_price <= 0) {
    return res.status(400).json({ error: 'Unit price must be greater than 0' });
  }

  // Check if user ID is available
  if (!req.userId) {
    return res.status(401).json({ error: 'User authentication required' });
  }

  // Check if item exists and has enough quantity (include pending items too)
  console.log('Looking for inventory item with ID:', inventory_item_id, 'Type:', typeof inventory_item_id);
  
  // Function to proceed with sale creation
  const proceedWithSale = (item) => {
    // Allow sales for both approved and pending items (pending items can be sold)
    if (item.status !== 'approved' && item.status !== 'pending') {
      return res.status(400).json({ error: `Cannot sell item with status: ${item.status}. Item must be approved or pending.` });
    }
    
    console.log('Found inventory item:', { id: item.id, name: item.product_name, quantity: item.quantity, status: item.status, unit_price: item.unit_price });

    if (item.quantity < quantity_sold) {
      return res.status(400).json({ error: `Insufficient quantity. Available: ${item.quantity}, Requested: ${quantity_sold}` });
    }

    // Use the unit_price from request, but validate it matches item's price or use default
    // If unit_price from request is invalid, use item's unit_price or default to 29.99
    let finalUnitPrice = unit_price;
    if (!finalUnitPrice || finalUnitPrice <= 0 || isNaN(finalUnitPrice)) {
      finalUnitPrice = item.unit_price || 29.99;
      console.log('Using default unit_price:', finalUnitPrice);
    }

    const total_amount = quantity_sold * finalUnitPrice;

    // Create sale
    database.run(`
      INSERT INTO sales 
      (inventory_item_id, quantity_sold, unit_price, total_amount, sold_by, customer_name, payment_method, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [inventory_item_id, quantity_sold, finalUnitPrice, total_amount, req.userId, customer_name || null, payment_method || null, notes || null], function(err) {
      if (err) {
        console.error('Error creating sale:', err);
        // Check for specific database errors
        if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
          return res.status(400).json({ error: 'Invalid inventory item or user. Please refresh and try again.' });
        }
        return res.status(500).json({ error: `Error creating sale: ${err.message || 'Database error'}` });
      }

      // Update inventory quantity
      database.run(`
        UPDATE inventory_items 
        SET quantity = quantity - ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [quantity_sold, inventory_item_id], (updateErr) => {
        if (updateErr) {
          console.error('Error updating inventory:', updateErr);
          // Sale was created but inventory update failed - this is a problem
          return res.status(500).json({ error: 'Sale created but inventory update failed' });
        }

        // Return the created sale with item details
        database.get(`
          SELECT s.*,
                 i.product_name,
                 i.brand,
                 i.sku,
                 u.username as sold_by_name
          FROM sales s
          JOIN inventory_items i ON s.inventory_item_id = i.id
          JOIN users u ON s.sold_by = u.id
          WHERE s.id = ?
        `, [this.lastID], (fetchErr, sale) => {
          if (fetchErr) {
            console.error('Error fetching created sale:', fetchErr);
            return res.status(500).json({ error: 'Error fetching created sale' });
          }
          console.log('✅ Sale created successfully:', {
            saleId: sale.id,
            productName: sale.product_name,
            quantity: sale.quantity_sold,
            totalAmount: sale.total_amount
          });
          res.status(201).json(sale);
        });
      });
    });
  };

  // Try to find the item - comprehensive search
  console.log('Searching for inventory item with ID:', inventory_item_id, 'Type:', typeof inventory_item_id);
  console.log('Request body:', req.body);
  
  // Helper function to find item with multiple fallback methods
  // This searches ALL items regardless of status (we check status in proceedWithSale)
  const findItem = (searchId, callback) => {
    console.log('findItem called with searchId:', searchId, 'Type:', typeof searchId);
    
    // Method 1: Exact match (try as integer first)
    const intSearchId = parseInt(searchId);
    if (!isNaN(intSearchId)) {
      database.get('SELECT id, quantity, product_name, status, unit_price FROM inventory_items WHERE id = ?', [intSearchId], (err1, item1) => {
        if (err1) {
          console.error('Error in exact match query:', err1);
          return callback(err1, null);
        }
        if (item1) {
          console.log('Item found with exact integer match:', item1);
          return callback(null, item1);
        }
        
        // Method 2: Try with original value (might be string)
        database.get('SELECT id, quantity, product_name, status, unit_price FROM inventory_items WHERE id = ?', [searchId], (err2, item2) => {
          if (err2) {
            console.error('Error in original value query:', err2);
            return callback(err2, null);
          }
          if (item2) {
            console.log('Item found with original value:', item2);
            return callback(null, item2);
          }
          
          // Method 3: String conversion
          database.get('SELECT id, quantity, product_name, status, unit_price FROM inventory_items WHERE CAST(id AS TEXT) = ?', [String(searchId)], (err3, item3) => {
            if (err3) {
              console.error('Error in string conversion query:', err3);
              return callback(err3, null);
            }
            if (item3) {
              console.log('Item found with string conversion:', item3);
              return callback(null, item3);
            }
            
            // Method 4: Try with string of integer
            database.get('SELECT id, quantity, product_name, status, unit_price FROM inventory_items WHERE CAST(id AS TEXT) = ?', [String(intSearchId)], (err4, item4) => {
              if (err4) {
                console.error('Error in string of integer query:', err4);
                return callback(err4, null);
              }
              if (item4) {
                console.log('Item found with string of integer:', item4);
                return callback(null, item4);
              }
              
              console.log('Item not found with any method');
              callback(null, null);
            });
          });
        });
      });
    } else {
      // If searchId is not a number, try string match
      database.get('SELECT id, quantity, product_name, status, unit_price FROM inventory_items WHERE CAST(id AS TEXT) = ?', [String(searchId)], (err, item) => {
        if (err) {
          console.error('Error in string match query:', err);
          return callback(err, null);
        }
        callback(null, item || null);
      });
    }
  };
  
  // Search for the item
  findItem(inventory_item_id, (err, item) => {
    if (err) {
      console.error('Database error checking inventory:', err);
      return res.status(500).json({ error: 'Database error while checking inventory' });
    }

    if (item) {
      // Item found - proceed with sale
      console.log('Item found:', item);
      proceedWithSale(item);
      return;
    }

    // Item not found - get debug info
    console.error(`Product with ID ${inventory_item_id} (type: ${typeof inventory_item_id}) not found`);
    
    // Get all products for debugging (including status)
    database.all('SELECT id, product_name, brand, status, quantity FROM inventory_items ORDER BY id DESC LIMIT 50', (sampleErr, samples) => {
      if (!sampleErr && samples) {
        console.log('All products in database (first 50):', samples.map(s => ({ 
          id: s.id, 
          idType: typeof s.id,
          name: s.product_name, 
          status: s.status,
          quantity: s.quantity
        })));
        
        // Check if the ID exists but with different type
        const matchingId = samples.find(s => 
          s.id == inventory_item_id || 
          String(s.id) === String(inventory_item_id) ||
          parseInt(s.id) === parseInt(inventory_item_id)
        );
        
        if (matchingId) {
          console.log('Found matching ID with different comparison:', matchingId);
          return res.status(404).json({ 
            error: `Product found but there may be a data type mismatch. ID: ${inventory_item_id}, Found: ${matchingId.id}. Please refresh and try again.` 
          });
        }
      }
      
      return res.status(404).json({ 
        error: `Product with ID ${inventory_item_id} not found in database. Please refresh the page and select a product again.`,
        debug: {
          requestedId: inventory_item_id,
          requestedIdType: typeof inventory_item_id,
          availableIds: samples ? samples.slice(0, 10).map(s => s.id) : []
        }
      });
    });
  });
});

// Get single sale
router.get('/:id', authenticate, (req, res) => {
  const database = db.getDb();
  const { id } = req.params;

  database.get(`
    SELECT s.*,
           i.product_name,
           i.brand,
           i.sku,
           u.username as sold_by_name
    FROM sales s
    JOIN inventory_items i ON s.inventory_item_id = i.id
    JOIN users u ON s.sold_by = u.id
    WHERE s.id = ?
  `, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    res.json(row);
  });
});

// Delete multiple sales (admin only)
router.delete('/bulk', authenticate, requireAdmin, (req, res) => {
  const database = db.getDb();
  
  // Handle both body and query parameters for DELETE requests
  const ids = req.body?.ids || req.query?.ids;
  
  console.log('🗑️ Bulk delete request received:', { ids, body: req.body, query: req.query });

  if (!ids) {
    return res.status(400).json({ error: 'Invalid request. IDs array is required.' });
  }

  // Parse IDs - handle both array and comma-separated string
  let idArray = [];
  if (Array.isArray(ids)) {
    idArray = ids;
  } else if (typeof ids === 'string') {
    idArray = ids.split(',').map(id => id.trim());
  } else {
    return res.status(400).json({ error: 'IDs must be an array or comma-separated string.' });
  }

  // Validate all IDs are numbers - be more lenient with conversion
  const saleIds = idArray
    .map(id => {
      // Try multiple conversion methods
      if (typeof id === 'number') return id;
      if (typeof id === 'string') {
        const parsed = parseInt(id.trim(), 10);
        return isNaN(parsed) ? null : parsed;
      }
      const parsed = parseInt(String(id), 10);
      return isNaN(parsed) ? null : parsed;
    })
    .filter(id => id !== null && !isNaN(id) && id > 0);
    
  if (saleIds.length === 0) {
    console.error('❌ No valid sale IDs after parsing:', { idArray, saleIds });
    return res.status(400).json({ error: 'Invalid sale IDs provided. All IDs must be valid numbers.' });
  }

  console.log('🗑️ Processing bulk delete for sale IDs:', saleIds, 'Count:', saleIds.length);

  // Get all sales to restore inventory
  const placeholders = saleIds.map(() => '?').join(',');
  console.log('🔍 Querying sales with IDs:', saleIds, 'Placeholders:', placeholders);
  
  database.all(`SELECT * FROM sales WHERE id IN (${placeholders})`, saleIds, (err, sales) => {
    if (err) {
      console.error('❌ Error fetching sales for bulk delete:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    console.log(`📊 Found ${sales?.length || 0} sales matching IDs`);
    if (sales && sales.length > 0) {
      console.log(`📊 Found sale IDs:`, sales.map(s => ({ id: s.id, type: typeof s.id })));
    }
    console.log(`📊 Requested IDs:`, saleIds.map(id => ({ id, type: typeof id })));
    
    if (!sales || sales.length === 0) {
      console.log('⚠️ No sales found with provided IDs');
      console.log('⚠️ Requested IDs:', saleIds);
      // Check if any sales exist at all and what IDs are available
      database.all('SELECT id FROM sales ORDER BY id ASC LIMIT 20', [], (checkErr, allSales) => {
        if (!checkErr && allSales) {
          console.log('📊 Available sale IDs in database (first 20):', allSales.map(s => ({ id: s.id, type: typeof s.id })));
          // Check for type mismatches
          const requestedSet = new Set(saleIds);
          const availableSet = new Set(allSales.map(s => s.id));
          const missingIds = saleIds.filter(id => !availableSet.has(id));
          if (missingIds.length > 0) {
            console.log('❌ Missing IDs:', missingIds);
          }
        }
      });
      return res.status(404).json({ 
        error: `No sales found with provided IDs. Requested: ${saleIds.join(', ')}. Please refresh and try again.` 
      });
    }
    
    // Check if all requested IDs were found
    const foundIds = new Set(sales.map(s => s.id));
    const missingIds = saleIds.filter(id => !foundIds.has(id));
    if (missingIds.length > 0) {
      console.warn('⚠️ Some requested IDs were not found:', missingIds);
      console.warn('⚠️ Found IDs:', Array.from(foundIds));
    }

    console.log(`📦 Found ${sales.length} sales to delete. Restoring inventory...`);

    // Restore inventory for all sales first, then delete
    // Use counter pattern to wait for all inventory updates
    let completed = 0;
    let errors = [];
    const totalSales = sales.length;

    // If no sales to process, return early
    if (totalSales === 0) {
      return res.status(404).json({ error: 'No sales found with provided IDs' });
    }

    // Restore inventory for all sales
    sales.forEach((sale) => {
      database.run(`
        UPDATE inventory_items 
        SET quantity = quantity + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [sale.quantity_sold, sale.inventory_item_id], (updateErr) => {
        completed++;
        if (updateErr) {
          console.error(`❌ Error restoring inventory for sale ${sale.id}:`, updateErr);
          errors.push(`Failed to restore inventory for sale ${sale.id}`);
        } else {
          console.log(`✅ Restored inventory for sale ${sale.id}`);
        }

        // Once all inventory updates are complete, delete the sales
        if (completed === totalSales) {
          console.log(`🗑️ All inventory restored. Deleting ${totalSales} sales...`);
          
          // Delete all sales
          database.run(`DELETE FROM sales WHERE id IN (${placeholders})`, saleIds, function(deleteErr) {
            if (deleteErr) {
              console.error('❌ Error deleting sales:', deleteErr);
              return res.status(500).json({ error: 'Error deleting sales' });
            }

            console.log(`✅ Successfully deleted ${this.changes} sale(s)`);

            res.json({ 
              message: `Successfully deleted ${this.changes} sale(s)`,
              deletedCount: this.changes,
              errors: errors.length > 0 ? errors : undefined
            });
          });
        }
      });
    });
  });
});

// Delete sale (admin only)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const database = db.getDb();
  const { id } = req.params;

  // Get sale details first
  database.get('SELECT * FROM sales WHERE id = ?', [id], (err, sale) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    // Only admins can delete (requireAdmin middleware already checked)

    // Restore inventory quantity
    database.run(`
      UPDATE inventory_items 
      SET quantity = quantity + ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [sale.quantity_sold, sale.inventory_item_id], (updateErr) => {
      if (updateErr) {
        console.error('Error restoring inventory:', updateErr);
      }

      // Delete sale
      database.run('DELETE FROM sales WHERE id = ?', [id], function(deleteErr) {
        if (deleteErr) {
          return res.status(500).json({ error: 'Error deleting sale' });
        }

        res.json({ message: 'Sale deleted successfully' });
      });
    });
  });
});

module.exports = router;



