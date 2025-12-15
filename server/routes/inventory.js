const express = require('express');
const db = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all inventory items (users see pending + approved, admins see all)
router.get('/', authenticate, (req, res) => {
  const database = db.getDb();
  const { status, search } = req.query;

  let query = `
    SELECT i.*, 
           u1.username as created_by_name,
           u2.username as approved_by_name
    FROM inventory_items i
    LEFT JOIN users u1 ON i.created_by = u1.id
    LEFT JOIN users u2 ON i.approved_by = u2.id
    WHERE 1=1
  `;
  const params = [];

  // Users can only see approved items and their own pending items
  if (req.userRole !== 'admin') {
    query += ` AND (i.status = 'approved' OR (i.status = 'pending' AND i.created_by = ?))`;
    params.push(req.userId);
  }

  if (status) {
    query += ` AND i.status = ?`;
    params.push(status);
  }

  if (search) {
    query += ` AND (i.product_name LIKE ? OR i.brand LIKE ? OR i.sku LIKE ?)`;
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  query += ` ORDER BY i.created_at DESC`;

  database.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get pending items (for admin approval)
router.get('/pending', authenticate, requireAdmin, (req, res) => {
  const database = db.getDb();

  database.all(`
    SELECT i.*, 
           u1.username as created_by_name
    FROM inventory_items i
    LEFT JOIN users u1 ON i.created_by = u1.id
    WHERE i.status = 'pending'
    ORDER BY i.created_at DESC
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get single item
router.get('/:id', authenticate, (req, res) => {
  const database = db.getDb();
  const { id } = req.params;

  database.get(`
    SELECT i.*, 
           u1.username as created_by_name,
           u2.username as approved_by_name
    FROM inventory_items i
    LEFT JOIN users u1 ON i.created_by = u1.id
    LEFT JOIN users u2 ON i.approved_by = u2.id
    WHERE i.id = ?
  `, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Users can only see approved items or their own pending items
    if (req.userRole !== 'admin' && row.status !== 'approved' && row.created_by !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(row);
  });
});

// Create new inventory item (status: pending)
router.post('/', authenticate, (req, res) => {
  const database = db.getDb();
  const { product_name, category, brand, quantity, unit_price, sku, description } = req.body;

  if (!product_name || quantity === undefined) {
    return res.status(400).json({ error: 'Product name and quantity are required' });
  }

  database.run(`
    INSERT INTO inventory_items 
    (product_name, category, brand, quantity, unit_price, sku, description, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `, [product_name, category || null, brand || null, quantity, unit_price || null, sku || null, description || null, req.userId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error creating item' });
    }

    // Return the created item
    database.get(`
      SELECT i.*, 
             u1.username as created_by_name
      FROM inventory_items i
      LEFT JOIN users u1 ON i.created_by = u1.id
      WHERE i.id = ?
    `, [this.lastID], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching created item' });
      }
      res.status(201).json(row);
    });
  });
});

// Update inventory item (users can only update their own pending items, admins can update any)
router.put('/:id', authenticate, (req, res) => {
  const database = db.getDb();
  const { id } = req.params;
  const { product_name, category, brand, quantity, unit_price, sku, description } = req.body;

  // First check if item exists and user has permission
  database.get('SELECT * FROM inventory_items WHERE id = ?', [id], (err, item) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Users can only edit their own pending items
    if (req.userRole !== 'admin' && (item.created_by !== req.userId || item.status !== 'pending')) {
      return res.status(403).json({ error: 'You can only edit your own pending items' });
    }

    // Admins can edit any item and keep the status (no need to revert to pending)
    let newStatus = item.status;
    // Only change status if explicitly provided, otherwise keep current status
    if (req.body.status !== undefined) {
      newStatus = req.body.status;
    }

    database.run(`
      UPDATE inventory_items 
      SET product_name = ?, category = ?, brand = ?, quantity = ?, 
          unit_price = ?, sku = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [product_name, category || null, brand || null, quantity, unit_price || null, sku || null, description || null, newStatus, id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error updating item' });
      }

      // Return updated item
      database.get(`
        SELECT i.*, 
               u1.username as created_by_name,
               u2.username as approved_by_name
        FROM inventory_items i
        LEFT JOIN users u1 ON i.created_by = u1.id
        LEFT JOIN users u2 ON i.approved_by = u2.id
        WHERE i.id = ?
      `, [id], (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Error fetching updated item' });
        }
        res.json(row);
      });
    });
  });
});

// Approve item (admin only)
router.post('/:id/approve', authenticate, requireAdmin, (req, res) => {
  const database = db.getDb();
  const { id } = req.params;

  database.run(`
    UPDATE inventory_items 
    SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [req.userId, id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error approving item' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Return updated item
    database.get(`
      SELECT i.*, 
             u1.username as created_by_name,
             u2.username as approved_by_name
      FROM inventory_items i
      LEFT JOIN users u1 ON i.created_by = u1.id
      LEFT JOIN users u2 ON i.approved_by = u2.id
      WHERE i.id = ?
    `, [id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Error fetching approved item' });
      }
      res.json(row);
    });
  });
});

// Reject item (admin only)
router.post('/:id/reject', authenticate, requireAdmin, (req, res) => {
  const database = db.getDb();
  const { id } = req.params;

  database.run(`
    UPDATE inventory_items 
    SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error rejecting item' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item rejected successfully' });
  });
});

// Delete item (admin only, or user can delete their own pending items)
router.delete('/:id', authenticate, (req, res) => {
  const database = db.getDb();
  const { id } = req.params;

  // Check if item exists and user has permission
  database.get('SELECT * FROM inventory_items WHERE id = ?', [id], (err, item) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Users can only delete their own pending items
    if (req.userRole !== 'admin' && (item.created_by !== req.userId || item.status !== 'pending')) {
      return res.status(403).json({ error: 'You can only delete your own pending items' });
    }

    database.run('DELETE FROM inventory_items WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error deleting item' });
      }

      res.json({ message: 'Item deleted successfully' });
    });
  });
});

module.exports = router;

