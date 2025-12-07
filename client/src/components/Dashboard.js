import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    myPending: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/inventory');
      const items = response.data;

      const total = items.length;
      const approved = items.filter(item => item.status === 'approved').length;
      const pending = items.filter(item => item.status === 'pending').length;
      const myPending = items.filter(
        item => item.status === 'pending' && item.created_by === user.id
      ).length;

      setStats({ total, approved, pending, myPending });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="container">
      <h1>Dashboard</h1>
      <p>Welcome, {user?.username}!</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '30px' }}>
        <div className="card">
          <h3>Total Items</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007bff' }}>{stats.total}</p>
        </div>
        <div className="card">
          <h3>Approved Items</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>{stats.approved}</p>
        </div>
        <div className="card">
          <h3>Pending Items</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffc107' }}>{stats.pending}</p>
        </div>
        {user?.role !== 'admin' && (
          <div className="card">
            <h3>My Pending Items</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff9800' }}>{stats.myPending}</p>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '30px' }}>
        <h2>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
          <Link to="/add-item" className="btn btn-primary">
            Add New Item
          </Link>
          <Link to="/inventory" className="btn btn-secondary">
            View All Inventory
          </Link>
          {user?.role === 'admin' && (
            <Link to="/admin" className="btn btn-success">
              Admin Panel
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

