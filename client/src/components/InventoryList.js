import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import EditableCell from './EditableCell';
import AnimatedDropdown from './AnimatedDropdown';

const InventoryList = () => {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    // Ensure token is set from localStorage
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    if (!authLoading && user) {
      fetchItems();
    } else if (!authLoading && !user) {
      setLoading(false);
      setError('Please log in to view inventory');
    }
  }, [statusFilter, search, user, authLoading]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      // Ensure token is included
      const token = localStorage.getItem('token');
      const config = {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      };

      const response = await axios.get('/api/inventory', config);
      setItems(response.data || []);
      
      if (response.data && response.data.length === 0) {
        setError('No items found. Try adjusting your filters.');
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      if (error.response?.status === 401) {
        setError('Authentication required. Please log in again.');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to view this inventory.');
      } else {
        setError(error.response?.data?.error || 'Failed to load inventory. Please try again.');
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-pending',
      approved: 'badge-approved',
      rejected: 'badge-rejected'
    };
    return <span className={`badge ${badges[status] || ''}`}>{status}</span>;
  };

  const handleUpdateItem = async (itemId, field, newValue) => {
    try {
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      const updateData = {
        ...item,
        [field]: newValue
      };

      const token = localStorage.getItem('token');
      const response = await axios.put(
        `/api/inventory/${itemId}`,
        updateData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Update local state
      setItems(items.map(i => i.id === itemId ? response.data : i));
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  };

  const canEdit = (item) => {
    return user?.role === 'admin' || (item.status === 'pending' && item.created_by === user?.id);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3 }
    }
  };

  // Show login prompt if not authenticated
  if (!authLoading && !user) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <h2 style={{ color: '#ffffff' }}>Authentication Required</h2>
          <p style={{ margin: '20px 0', color: '#e5e5e5' }}>
            Please log in to view the inventory.
          </p>
          <Link to="/login" className="btn btn-primary">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="container"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}
        variants={itemVariants}
      >
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          Inventory List
        </motion.h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <motion.button
            onClick={fetchItems}
            className="btn btn-secondary"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={loading}
            style={{ padding: '10px 20px' }}
          >
            {loading ? 'Loading...' : '🔄 Refresh'}
          </motion.button>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link to="/add-item" className="btn btn-primary">
              Add New Item
            </Link>
          </motion.div>
        </div>
      </motion.div>

      <div className="card">
        {items.length > 0 && (
          <div style={{ 
            marginBottom: '15px', 
            padding: '12px 16px', 
            backgroundColor: 'rgba(220, 20, 60, 0.1)', 
            borderRadius: '8px',
            borderLeft: '4px solid #dc143c'
          }}>
            <strong style={{ color: '#dc143c', fontSize: '15px' }}>📊 Total Items: {items.length}</strong>
            {user?.role === 'admin' && (
              <span style={{ marginLeft: '15px', color: '#e5e5e5', fontSize: '14px' }}>
                (All statuses visible to admin)
              </span>
            )}
            <div style={{ marginTop: '8px', fontSize: '13px', color: '#e5e5e5' }}>
              💡 <strong>Tip:</strong> Click on product name, quantity, or price to edit directly
            </div>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Search by product name, brand, or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ 
              padding: '12px 16px', 
              border: '1px solid #333333',
              backgroundColor: '#1a1a1a',
              color: '#ffffff', 
              borderRadius: '8px',
              fontSize: '15px',
              fontFamily: 'Montserrat, Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              transition: 'all 0.2s'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#dc143c';
              e.target.style.boxShadow = '0 0 0 3px rgba(220, 20, 60, 0.2), 0 0 15px rgba(220, 20, 60, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#333333';
              e.target.style.boxShadow = 'none';
            }}
          />
          <AnimatedDropdown
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' }
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="All Statuses"
          />
        </div>

        {loading || authLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#ffffff' }}>Loading inventory items...</p>
          </div>
        ) : error ? (
          <div className="alert alert-error" style={{ marginTop: '20px' }}>
            {error}
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#e5e5e5' }}>
            <p style={{ fontSize: '18px', marginBottom: '10px' }}>No items found.</p>
            <p style={{ fontSize: '14px', marginBottom: '20px' }}>
              {search || statusFilter 
                ? 'Try adjusting your search or filter criteria.' 
                : 'No inventory items available. Add your first item to get started!'}
            </p>
            {!search && !statusFilter && (
              <Link to="/add-item" className="btn btn-primary">
                Add Your First Item
              </Link>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Brand</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>SKU</th>
                  <th>Status</th>
                  <th>Created By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {items.map((item, index) => (
                    <motion.tr 
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ 
                        duration: 0.3,
                        delay: index * 0.03
                      }}
                      whileHover={{ 
                        scale: 1.01,
                        backgroundColor: '#2a2a2a',
                        transition: { duration: 0.2 }
                      }}
                    >
                    <td>
                      <EditableCell
                        value={item.product_name}
                        onSave={(newValue) => handleUpdateItem(item.id, 'product_name', newValue)}
                        disabled={!canEdit(item)}
                        style={{ fontWeight: 500, color: '#ffffff' }}
                      />
                    </td>
                    <td>{item.category || '-'}</td>
                    <td>{item.brand || '-'}</td>
                    <td>
                      <EditableCell
                        value={item.quantity}
                        onSave={(newValue) => handleUpdateItem(item.id, 'quantity', parseInt(newValue) || 0)}
                        type="number"
                        min="0"
                        disabled={!canEdit(item)}
                        style={{ fontWeight: 600, color: '#dc143c' }}
                      />
                    </td>
                    <td>
                      <EditableCell
                        value={item.unit_price}
                        onSave={(newValue) => handleUpdateItem(item.id, 'unit_price', parseFloat(newValue) || 0)}
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={!canEdit(item)}
                        style={{ fontWeight: 600, color: '#10b981' }}
                      />
                    </td>
                    <td>{item.sku || '-'}</td>
                    <td>{getStatusBadge(item.status)}</td>
                    <td>{item.created_by_name || '-'}</td>
                    <td>
                      {canEdit(item) && (
                        <Link
                          to={`/edit-item/${item.id}`}
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '14px' }}
                        >
                          Full Edit
                        </Link>
                      )}
                    </td>
                  </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default InventoryList;

