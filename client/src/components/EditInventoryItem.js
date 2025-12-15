import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import AnimatedDropdown from './AnimatedDropdown';

const EditInventoryItem = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    product_name: '',
    category: '',
    brand: '',
    quantity: '',
    unit_price: '',
    sku: '',
    description: ''
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const autoSaveTimer = useRef(null);
  const lastSavedData = useRef(null);

  useEffect(() => {
    fetchItem();
  }, [id]);

  useEffect(() => {
    if (!loading && formData.product_name) {
      // Auto-save every 5 seconds if data has changed
      autoSaveTimer.current = setInterval(() => {
        if (hasChanged()) {
          autoSave();
        }
      }, 5000);

      return () => {
        if (autoSaveTimer.current) {
          clearInterval(autoSaveTimer.current);
        }
      };
    }
  }, [formData, loading]);

  const fetchItem = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/inventory/${id}`);
      const item = response.data;
      
      // Check permissions
      if (user?.role !== 'admin' && item.status !== 'pending' && item.created_by !== user?.id) {
        setStatus({ type: 'error', message: 'You do not have permission to edit this item' });
        setTimeout(() => navigate('/inventory'), 2000);
        return;
      }

      setFormData({
        product_name: item.product_name || '',
        category: item.category || '',
        brand: item.brand || '',
        quantity: item.quantity || '',
        unit_price: item.unit_price || '',
        sku: item.sku || '',
        description: item.description || ''
      });
      lastSavedData.current = JSON.parse(JSON.stringify({
        product_name: item.product_name || '',
        category: item.category || '',
        brand: item.brand || '',
        quantity: item.quantity || '',
        unit_price: item.unit_price || '',
        sku: item.sku || '',
        description: item.description || ''
      }));
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.response?.data?.error || 'Error loading item'
      });
    } finally {
      setLoading(false);
    }
  };

  const hasChanged = () => {
    return JSON.stringify(formData) !== JSON.stringify(lastSavedData.current);
  };

  const autoSave = async () => {
    setSaving(true);
    try {
      await axios.put(`/api/inventory/${id}`, formData);
      lastSavedData.current = JSON.parse(JSON.stringify(formData));
      setStatus({
        type: 'info',
        message: 'Auto-saved successfully!'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.response?.data?.error || 'Error auto-saving'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (!formData.product_name.trim() || !formData.quantity) {
      setStatus({ type: 'error', message: 'Product name and quantity are required' });
      return;
    }

    setSaving(true);
    try {
      await axios.put(`/api/inventory/${id}`, formData);
      setStatus({
        type: 'success',
        message: 'Item updated successfully!'
      });
      
      lastSavedData.current = JSON.parse(JSON.stringify(formData));

      setTimeout(() => {
        navigate('/inventory');
      }, 2000);
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.response?.data?.error || 'Error updating item'
      });
    } finally {
      setSaving(false);
    }
  };

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
        duration: 0.5
      }
    }
  };

  const fieldVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  if (loading) {
    return (
      <motion.div 
        className="container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            margin: '0 auto 20px'
          }}
        />
        <p>Loading...</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Edit Inventory Item
      </motion.h1>
      
      <motion.div 
        className="card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <motion.div 
          style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <motion.span 
            className={`status-indicator ${saving ? 'saving' : 'saved'}`}
            animate={saving ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 1, repeat: saving ? Infinity : 0 }}
          />
          <span style={{ fontSize: '0.9rem', color: '#e5e5e5' }}>
            {saving ? 'Auto-saving...' : 'Auto-save enabled (saves every 5 seconds)'}
          </span>
        </motion.div>

        {status.message && (
          <motion.div 
            className={`alert alert-${status.type === 'error' ? 'error' : status.type === 'success' ? 'success' : 'info'}`}
            initial={{ opacity: 0, x: -20, height: 0 }}
            animate={{ opacity: 1, x: 0, height: 'auto' }}
            exit={{ opacity: 0, x: 20, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {status.message}
          </motion.div>
        )}

        <motion.form 
          onSubmit={handleSubmit}
          variants={formVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="form-group">
            <label>Product Name *</label>
            <input
              type="text"
              name="product_name"
              value={formData.product_name}
              onChange={handleChange}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <motion.div className="form-group" variants={fieldVariants}>
              <label>Category</label>
              <AnimatedDropdown
                options={[
                  { value: '', label: 'Select Category' },
                  { value: 'Tobacco', label: 'Tobacco' },
                  { value: 'Vape', label: 'Vape' },
                  { value: 'Accessories', label: 'Accessories' },
                  { value: 'Other', label: 'Other' }
                ]}
                value={formData.category}
                onChange={(e) => handleChange({ target: { name: 'category', value: e.target.value } })}
                placeholder="Select Category"
              />
            </motion.div>

            <div className="form-group">
              <label>Brand</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
            <div className="form-group">
              <label>Quantity *</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label>Unit Price</label>
              <input
                type="number"
                name="unit_price"
                value={formData.unit_price}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label>SKU</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <motion.div 
            style={{ display: 'flex', gap: '10px' }}
            variants={fieldVariants}
          >
            <motion.button 
              type="submit" 
              className="btn btn-primary" 
              disabled={saving}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              {saving ? 'Saving...' : 'Update Item'}
            </motion.button>
            <motion.button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/inventory')}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              Cancel
            </motion.button>
          </motion.div>
        </motion.form>
      </motion.div>
    </motion.div>
  );
};

export default EditInventoryItem;

