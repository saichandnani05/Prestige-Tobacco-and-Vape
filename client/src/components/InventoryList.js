import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const InventoryList = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchItems();
  }, [statusFilter, search]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const response = await axios.get('/api/inventory', { params });
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
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

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Inventory List</h1>
        <Link to="/add-item" className="btn btn-primary">
          Add New Item
        </Link>
      </div>

      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Search by product name, brand, or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : items.length === 0 ? (
          <p>No items found.</p>
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
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product_name}</td>
                    <td>{item.category || '-'}</td>
                    <td>{item.brand || '-'}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unit_price ? `$${parseFloat(item.unit_price).toFixed(2)}` : '-'}</td>
                    <td>{item.sku || '-'}</td>
                    <td>{getStatusBadge(item.status)}</td>
                    <td>{item.created_by_name || '-'}</td>
                    <td>
                      {(user?.role === 'admin' || (item.status === 'pending' && item.created_by === user?.id)) && (
                        <Link
                          to={`/edit-item/${item.id}`}
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '14px' }}
                        >
                          Edit
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryList;

