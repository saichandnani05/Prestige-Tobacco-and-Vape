import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import SalesTracker from './SalesTracker';
import CreateSale from './CreateSale';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    myPending: 0
  });
  const [showCreateSale, setShowCreateSale] = useState(false);
  const [salesRefreshTrigger, setSalesRefreshTrigger] = useState(0);

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

  const cardVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1]
      }
    })
  };

  return (
    <div className="dashboard-container">
      {/* Hero Section */}
      <motion.section 
        className="dashboard-hero"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div 
          className="hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.h1 
            className="hero-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Welcome back, <span className="gradient-text">{user?.username}</span>
          </motion.h1>
          <motion.p 
            className="hero-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Here's what's happening with your inventory today
          </motion.p>
        </motion.div>
        <div className="hero-decoration">
          <motion.div 
            className="floating-shape shape-1"
            animate={{
              x: [0, 30, 0],
              y: [0, -30, 0],
              rotate: [0, 120, 240, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="floating-shape shape-2"
            animate={{
              x: [0, -20, 0],
              y: [0, 20, 0],
              rotate: [0, -120, -240, -360],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 5
            }}
          />
          <motion.div 
            className="floating-shape shape-3"
            animate={{
              x: [0, 25, 0],
              y: [0, -25, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 10
            }}
          />
        </div>
      </motion.section>

      {/* Sales Tracker Section */}
      <motion.section 
        className="actions-section"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'nowrap', gap: '16px' }}>
            <h2 style={{ color: '#ffffff', margin: 0, whiteSpace: 'nowrap', fontSize: '1.5rem', flexShrink: 0 }}>SALES DASHBOARD</h2>
            <motion.button
              className="btn btn-primary"
              onClick={() => setShowCreateSale(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ 
                padding: '8px 16px', 
                fontSize: '13px',
                flexShrink: 1,
                minWidth: 'fit-content'
              }}
            >
              ➕ Create Sale
            </motion.button>
          </div>
          <SalesTracker refreshTrigger={salesRefreshTrigger} />
        </div>
      </motion.section>

      {/* Quick Actions Section */}
      <section className="actions-section">
        <div className="actions-card">
          <h2 className="section-title">
            Quick Actions
          </h2>
          <div className="actions-grid">
            <div>
              <Link to="/add-item" className="action-button action-primary">
                <div className="action-icon">
                  ➕
                </div>
                <div className="action-content">
                  <h3>Add New Item</h3>
                  <p>Create a new inventory entry</p>
                </div>
                <div className="action-arrow">
                  →
                </div>
              </Link>
            </div>
            <div>
              <Link to="/inventory" className="action-button action-secondary">
                <div className="action-icon">
                  📊
                </div>
                <div className="action-content">
                  <h3>View All Inventory</h3>
                  <p>Browse all your items</p>
                </div>
                <div className="action-arrow">
                  →
                </div>
              </Link>
            </div>
            {user?.role === 'admin' && (
              <div>
                <Link to="/admin" className="action-button action-success">
                  <div className="action-icon">
                    ⚙️
                  </div>
                  <div className="action-content">
                    <h3>Admin Panel</h3>
                    <p>Manage approvals and users</p>
                  </div>
                  <div className="action-arrow">
                    →
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <motion.div 
          className="stats-grid"
          initial="hidden"
          animate="visible"
        >
          <motion.div 
            className="stat-card"
            style={{ background: 'linear-gradient(135deg, #dc143c 0%, #b91c1c 100%)' }}
            variants={cardVariants}
            custom={0}
            whileHover={{ scale: 1.05, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              className="stat-icon"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0 }}
            >
              📦
            </motion.div>
            <div className="stat-content">
              <h3 className="stat-title">Total Items</h3>
              <motion.p 
                className="stat-number"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                {stats.total}
              </motion.p>
            </div>
          </motion.div>

          <motion.div 
            className="stat-card"
            style={{ background: 'linear-gradient(135deg, #dc143c 0%, #b91c1c 100%)' }}
            variants={cardVariants}
            custom={1}
            whileHover={{ scale: 1.05, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              className="stat-icon"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            >
              ✅
            </motion.div>
            <div className="stat-content">
              <h3 className="stat-title">Approved Items</h3>
              <motion.p 
                className="stat-number"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                {stats.approved}
              </motion.p>
            </div>
          </motion.div>

          <motion.div 
            className="stat-card"
            style={{ background: 'linear-gradient(135deg, #00bfff 0%, #0099cc 100%)' }}
            variants={cardVariants}
            custom={2}
            whileHover={{ scale: 1.05, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              className="stat-icon"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            >
              ⏳
            </motion.div>
            <div className="stat-content">
              <h3 className="stat-title">Pending Items</h3>
              <motion.p 
                className="stat-number"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                {stats.pending}
              </motion.p>
            </div>
          </motion.div>

          {user?.role !== 'admin' && (
            <motion.div 
              className="stat-card"
              style={{ background: 'linear-gradient(135deg, #dc143c 0%, #00bfff 100%)' }}
              variants={cardVariants}
              custom={3}
              whileHover={{ scale: 1.05, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div 
                className="stat-icon"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
              >
                📋
              </motion.div>
              <div className="stat-content">
                <h3 className="stat-title">My Pending Items</h3>
                <motion.p 
                  className="stat-number"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                >
                  {stats.myPending}
                </motion.p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* Create Sale Modal */}
      <AnimatePresence>
        {showCreateSale && (
          <CreateSale
            onSaleCreated={(saleData) => {
              console.log('✅ Sale created, refreshing dashboard and sales tracker...', saleData);
              
              // Refresh stats after sale
              fetchStats();
              
              // Trigger immediate refresh of SalesTracker
              // Use multiple triggers to ensure refresh happens
              console.log('🔄 Triggering SalesTracker refresh immediately...');
              setSalesRefreshTrigger(prev => prev + 1);
              
              // Additional trigger after a short delay to ensure it catches the update
              setTimeout(() => {
                console.log('🔄 Second refresh trigger...');
                setSalesRefreshTrigger(prev => prev + 1);
              }, 1500);
              
              // Don't close modal - allow user to enter more sales
            }}
            onClose={() => setShowCreateSale(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
