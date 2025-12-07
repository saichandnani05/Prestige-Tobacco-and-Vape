import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [pendingItems, setPendingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchPendingItems();
    }
  }, [user]);

  const fetchPendingItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/inventory/pending');
      setPendingItems(response.data);
    } catch (error) {
      console.error('Error fetching pending items:', error);
      setMessage({ type: 'error', text: 'Error loading pending items' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await axios.post(`/api/inventory/${id}/approve`);
      setMessage({ type: 'success', text: 'Item approved successfully!' });
      fetchPendingItems();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Error approving item'
      });
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this item?')) {
      return;
    }

    try {
      await axios.post(`/api/inventory/${id}/reject`);
      setMessage({ type: 'success', text: 'Item rejected successfully!' });
      fetchPendingItems();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Error rejecting item'
      });
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

  if (user?.role !== 'admin') {
    return (
      <div className="container">
        <div className="alert alert-error">Access denied. Admin privileges required.</div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Admin Dashboard - Pending Approvals</h1>

      {message.text && (
        <div className={`alert alert-${message.type === 'error' ? 'error' : 'success'}`}>
          {message.text}
        </div>
      )}

      <div className="card">
        {loading ? (
          <p>Loading pending items...</p>
        ) : pendingItems.length === 0 ? (
          <p>No pending items to approve.</p>
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
                  <th>Description</th>
                  <th>Created By</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product_name}</td>
                    <td>{item.category || '-'}</td>
                    <td>{item.brand || '-'}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unit_price ? `$${parseFloat(item.unit_price).toFixed(2)}` : '-'}</td>
                    <td>{item.sku || '-'}</td>
                    <td>{item.description || '-'}</td>
                    <td>{item.created_by_name || '-'}</td>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => handleApprove(item.id)}
                          className="btn btn-success"
                          style={{ padding: '5px 10px', fontSize: '14px' }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(item.id)}
                          className="btn btn-danger"
                          style={{ padding: '5px 10px', fontSize: '14px' }}
                        >
                          Reject
                        </button>
                      </div>
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

export default AdminDashboard;

