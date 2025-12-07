import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AddInventoryItem = () => {
  const navigate = useNavigate();
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
  const autoSaveTimer = useRef(null);
  const lastSavedData = useRef(null);

  useEffect(() => {
    // Auto-save every 5 seconds if data has changed
    autoSaveTimer.current = setInterval(() => {
      if (hasFormData() && hasChanged()) {
        autoSave();
      }
    }, 5000);

    return () => {
      if (autoSaveTimer.current) {
        clearInterval(autoSaveTimer.current);
      }
    };
  }, [formData]);

  const hasFormData = () => {
    return formData.product_name.trim() !== '' && formData.quantity !== '';
  };

  const hasChanged = () => {
    return JSON.stringify(formData) !== JSON.stringify(lastSavedData.current);
  };

  const autoSave = async () => {
    if (!hasFormData()) return;

    setSaving(true);
    try {
      const response = await axios.post('/api/inventory', formData);
      lastSavedData.current = JSON.parse(JSON.stringify(formData));
      setStatus({
        type: 'info',
        message: 'Auto-saved successfully! Item is pending approval.'
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
      const response = await axios.post('/api/inventory', formData);
      setStatus({
        type: 'success',
        message: 'Item added successfully! It is now pending admin approval.'
      });
      
      // Reset form
      setFormData({
        product_name: '',
        category: '',
        brand: '',
        quantity: '',
        unit_price: '',
        sku: '',
        description: ''
      });
      lastSavedData.current = null;

      // Navigate after 2 seconds
      setTimeout(() => {
        navigate('/inventory');
      }, 2000);
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.response?.data?.error || 'Error adding item'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container">
      <h1>Add Inventory Item</h1>
      
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <span className={`status-indicator ${saving ? 'saving' : 'saved'}`}></span>
          <span style={{ fontSize: '0.9rem', color: '#666' }}>
            {saving ? 'Auto-saving...' : 'Auto-save enabled (saves every 5 seconds)'}
          </span>
        </div>

        {status.message && (
          <div className={`alert alert-${status.type === 'error' ? 'error' : status.type === 'success' ? 'success' : 'info'}`}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
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
            <div className="form-group">
              <label>Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                <option value="">Select Category</option>
                <option value="Tobacco">Tobacco</option>
                <option value="Vape">Vape</option>
                <option value="Accessories">Accessories</option>
                <option value="Other">Other</option>
              </select>
            </div>

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

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Item'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/inventory')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddInventoryItem;

