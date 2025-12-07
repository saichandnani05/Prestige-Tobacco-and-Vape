import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

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

  if (loading) {
    return (
      <div className="container">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Edit Inventory Item</h1>
      
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
              {saving ? 'Saving...' : 'Update Item'}
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

export default EditInventoryItem;

