import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import AllSalesView from './AllSalesView';
import { formatRelativeTime, formatDateTime, getTimezoneInfo } from '../utils/dateUtils';
import './SalesTracker.css';

const SalesTracker = ({ refreshTrigger }) => {
  const { user } = useAuth();
  const [recentSales, setRecentSales] = useState([]);
  const [stats, setStats] = useState({
    total_sales: 0,
    total_items_sold: 0,
    total_revenue: 0,
    average_sale_amount: 0,
    topProducts: []
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');
  const [autoRefresh, setAutoRefresh] = useState(false); // Changed to false by default
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  const refreshAttemptsRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const lastRefreshTriggerRef = useRef(0);
  const [showAllSales, setShowAllSales] = useState(false);

  // Robust fetchData with retry logic
  const fetchData = useCallback(async (retryCount = 0) => {
    // Prevent multiple simultaneous fetches (only on first attempt)
    if (isRefreshingRef.current && retryCount === 0) {
      console.log('⏸️ SalesTracker: Already refreshing, skipping...');
      return;
    }

    const maxRetries = 2;
    const retryDelay = 800; // 0.8 seconds

    try {
      if (retryCount === 0) {
        isRefreshingRef.current = true;
        setLoading(true);
      }
      
      console.log(`📊 SalesTracker: Fetching data for period: ${period}${retryCount > 0 ? ` (retry ${retryCount}/${maxRetries})` : ''}`);
      
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const [salesRes, statsRes] = await Promise.all([
        axios.get(`/api/sales/recent?limit=10&_t=${timestamp}`),
        axios.get(`/api/sales/stats?period=${period}&_t=${timestamp}`)
      ]);

      // Validate and normalize data
      const recentSalesData = Array.isArray(salesRes.data) ? salesRes.data : [];
      const statsData = statsRes.data || {};
      
      // Ensure stats have all required fields with proper defaults and type conversion
      // Handle null/undefined values from SQLite
      const normalizedStats = {
        total_sales: statsData.total_sales != null ? parseInt(statsData.total_sales) : 0,
        total_items_sold: statsData.total_items_sold != null ? parseInt(statsData.total_items_sold) : 0,
        total_revenue: statsData.total_revenue != null ? parseFloat(statsData.total_revenue) : 0,
        average_sale_amount: statsData.average_sale_amount != null ? parseFloat(statsData.average_sale_amount) : 0,
        topProducts: Array.isArray(statsData.topProducts) ? statsData.topProducts : []
      };

      console.log('✅ SalesTracker: Data fetched successfully', {
        recentSalesCount: recentSalesData.length,
        recentSales: recentSalesData.slice(0, 3).map(s => ({ 
          id: s?.id, 
          product: s?.product_name, 
          amount: s?.total_amount,
          created_at: s?.created_at
        })),
        totalRevenue: normalizedStats.total_revenue,
        totalSales: normalizedStats.total_sales,
        itemsSold: normalizedStats.total_items_sold,
        rawStatsData: statsData,
        normalizedStats: normalizedStats,
        period: period,
        timestamp: new Date().toISOString()
      });
      
      // Debug: Log if we have data but it's not showing
      if (recentSalesData.length > 0 && normalizedStats.total_sales === 0 && period === 'today') {
        console.warn('⚠️ Warning: Found recent sales but stats show 0 for today period. Sales might be from different day.');
        console.warn('Recent sales dates:', recentSalesData.slice(0, 3).map(s => s.created_at));
        console.warn('💡 Tip: Try switching period to "All Time" to see all sales');
      }
      
      // Additional debug: Check if data is actually different
      console.log('🔍 Data comparison:', {
        hasRecentSales: recentSalesData.length > 0,
        hasStats: normalizedStats.total_sales > 0 || normalizedStats.total_revenue > 0,
        period: period
      });

      // Force state update - always set new data to trigger re-render
      // Use spread operator to create new array/object references for React to detect changes
      const newRecentSales = recentSalesData.length > 0 ? [...recentSalesData] : [];
      const newStats = {...normalizedStats};
      
      setRecentSales(newRecentSales);
      setStats(newStats);
      
      console.log('📊 State updated:', {
        recentSalesCount: newRecentSales.length,
        recentSalesIds: newRecentSales.slice(0, 3).map(s => s?.id),
        stats: newStats,
        willRender: newRecentSales.length > 0
      });
      
      setLastRefreshTime(Date.now());
      refreshAttemptsRef.current = 0;
      isRefreshingRef.current = false;
      setLoading(false);
    } catch (error) {
      console.error(`❌ Error fetching sales data (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
      
      // Retry logic
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying in ${retryDelay}ms...`);
        setTimeout(() => {
          fetchData(retryCount + 1);
        }, retryDelay);
      } else {
        // Max retries reached - don't clear data, just log error
        console.error('❌ Max retries reached. Keeping existing data.');
        isRefreshingRef.current = false;
        setLoading(false);
      }
    }
  }, [period]);

  // Refresh immediately when refreshTrigger changes (after a sale is created)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger !== null && refreshTrigger > 0) {
      // Only refresh if trigger actually changed
      if (refreshTrigger !== lastRefreshTriggerRef.current) {
        lastRefreshTriggerRef.current = refreshTrigger;
        console.log('🔄 SalesTracker: Refresh triggered by sale creation, fetching latest data...', refreshTrigger);
        
        // Progressive refresh: multiple attempts to ensure data is fetched
        // First attempt after short delay
        const timeout1 = setTimeout(() => {
          console.log('🔄 Attempt 1: Fetching data...');
          fetchData(0);
        }, 300);
        
        // Second attempt after longer delay (in case DB transaction not complete)
        const timeout2 = setTimeout(() => {
          console.log('🔄 Attempt 2: Fetching data...');
          fetchData(0);
        }, 1200);
        
        // Third attempt as final check
        const timeout3 = setTimeout(() => {
          console.log('🔄 Attempt 3: Final fetch attempt...');
          fetchData(0);
        }, 2500);
        
        return () => {
          clearTimeout(timeout1);
          clearTimeout(timeout2);
          clearTimeout(timeout3);
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // Initial load and auto-refresh
  useEffect(() => {
    fetchData(0);
    
    // Auto-refresh every 5 seconds if enabled
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        // Only auto-refresh if not manually refreshing
        if (!isRefreshingRef.current) {
          console.log('🔄 Auto-refresh triggered');
          fetchData(0);
        }
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, autoRefresh]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Use timezone-aware date formatting
  const formatDate = (dateString) => {
    return formatRelativeTime(dateString);
  };

  return (
    <div className="sales-tracker-container">
      <div className="sales-tracker-header">
        <div>
          <h2 style={{ color: '#ffffff', marginBottom: '8px' }}>💰 Live Sales Tracker</h2>
          <p style={{ color: '#e5e5e5', fontSize: '14px' }}>
            Real-time sales monitoring and analytics
            {loading && <span style={{ marginLeft: '8px', color: '#10b981' }}>🔄 Updating...</span>}
            <span style={{ marginLeft: '8px', color: '#64748b', fontSize: '12px' }}>
              (Timezone: {getTimezoneInfo().timezone})
            </span>
          </p>
        </div>
        <div className="sales-controls">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #333',
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
              fontSize: '14px',
              marginRight: '10px',
              cursor: 'pointer'
            }}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
          <button
            onClick={() => {
              console.log('🔄 Manual refresh triggered');
              fetchData(0);
            }}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #333',
              backgroundColor: loading ? '#333' : '#dc143c',
              color: '#ffffff',
              fontSize: '14px',
              marginRight: '10px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '🔄' : '↻'} Refresh
          </button>
          <button
            onClick={() => setShowAllSales(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #333',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              fontSize: '14px',
              marginRight: '10px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            📋 View All Sales
          </button>
          <label style={{ color: '#e5e5e5', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Auto-refresh
          </label>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="sales-stats-grid">
        <div 
          className="sales-stat-card revenue"
          onClick={() => setShowAllSales(true)}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-icon">💵</div>
          <div className="stat-content">
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value">{formatCurrency(parseFloat(stats.total_revenue) || 0)}</div>
          </div>
        </div>

        <div className="sales-stat-card sales">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">Total Sales</div>
            <div className="stat-value">{parseInt(stats.total_sales) || 0}</div>
          </div>
        </div>

        <div className="sales-stat-card items">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-label">Items Sold</div>
            <div className="stat-value">{parseInt(stats.total_items_sold) || 0}</div>
          </div>
        </div>

        <div className="sales-stat-card average">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-label">Avg Sale</div>
            <div className="stat-value">{formatCurrency(parseFloat(stats.average_sale_amount) || 0)}</div>
          </div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="sales-sections">
        <div className="recent-sales-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: '#ffffff', margin: 0 }}>Recent Sales</h3>
            <span style={{ 
              color: '#64748b', 
              fontSize: '12px',
              fontStyle: 'italic'
            }}>
              Last refreshed: {new Date(lastRefreshTime).toLocaleTimeString()}
            </span>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#e5e5e5' }}>
              Loading sales...
            </div>
          ) : !Array.isArray(recentSales) || recentSales.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#e5e5e5' }}>
              No sales yet. Start selling to see live updates!
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
                Period: {period} | Last refresh: {new Date(lastRefreshTime).toLocaleTimeString()}
                <br />
                <button 
                  onClick={() => {
                    console.log('🔄 Switching to "all" period');
                    setPeriod('all');
                    setTimeout(() => {
                      isRefreshingRef.current = false;
                      fetchData(0);
                    }, 100);
                  }}
                  style={{
                    marginTop: '4px',
                    padding: '6px 12px',
                    background: '#dc143c',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Show All Sales
                </button>
              </div>
            </div>
          ) : (
            <div className="recent-sales-list">
              <AnimatePresence mode="wait">
                {Array.isArray(recentSales) && recentSales.map((sale, index) => {
                  if (!sale || !sale.id) {
                    console.warn('Invalid sale item:', sale);
                    return null;
                  }
                  return (
                    <motion.div
                      key={sale.id || `sale-${index}`}
                      className="sale-item"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="sale-item-main">
                        <div className="sale-product">
                          <strong style={{ color: '#ffffff' }}>{sale.product_name || 'Unknown Product'}</strong>
                          {sale.brand && (
                            <span style={{ color: '#e5e5e5', fontSize: '12px', marginLeft: '8px' }}>
                              {sale.brand}
                            </span>
                          )}
                        </div>
                        <div className="sale-details">
                          <span style={{ color: '#e5e5e5' }}>
                            {sale.quantity_sold || 0} × {formatCurrency(parseFloat(sale.unit_price) || 0)}
                          </span>
                          <strong style={{ color: '#10b981', fontSize: '16px', marginLeft: '12px' }}>
                            {formatCurrency(parseFloat(sale.total_amount) || 0)}
                          </strong>
                        </div>
                      </div>
                      <div className="sale-item-meta">
                        <span style={{ color: '#64748b', fontSize: '12px' }}>
                          by {sale.sold_by_name || 'Unknown'} • {formatDate(sale.created_at)}
                        </span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                          {sale.payment_method && (
                            <span style={{
                              padding: '2px 8px',
                              background: sale.payment_method.toLowerCase() === 'cash' 
                                ? 'rgba(16, 185, 129, 0.2)' 
                                : 'rgba(59, 130, 246, 0.2)',
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: sale.payment_method.toLowerCase() === 'cash' 
                                ? '#10b981' 
                                : '#3b82f6',
                              fontWeight: 500
                            }}>
                              {sale.payment_method.toLowerCase() === 'cash' 
                                ? '$ Cash' 
                                : `💳 ${sale.payment_method.charAt(0).toUpperCase() + sale.payment_method.slice(1)}`}
                            </span>
                          )}
                          {sale.customer_name && (
                            <span style={{ color: '#64748b', fontSize: '12px' }}>
                              Customer: {sale.customer_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Top Products */}
        {stats.topProducts && stats.topProducts.length > 0 && (
          <div className="top-products-section">
            <h3 style={{ color: '#ffffff', marginBottom: '16px' }}>Top Selling Products</h3>
            <div className="top-products-list">
              {stats.topProducts.slice(0, 5).map((product, index) => (
                <motion.div
                  key={index}
                  className="top-product-item"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="product-rank">#{index + 1}</div>
                  <div className="product-info">
                    <div style={{ color: '#ffffff', fontWeight: 600 }}>
                      {product.product_name}
                    </div>
                    {product.brand && (
                      <div style={{ color: '#64748b', fontSize: '12px' }}>
                        {product.brand}
                      </div>
                    )}
                  </div>
                  <div className="product-stats">
                    <div style={{ color: '#10b981', fontSize: '14px', fontWeight: 600 }}>
                      {product.total_quantity} sold
                    </div>
                    <div style={{ color: '#e5e5e5', fontSize: '12px' }}>
                      {formatCurrency(product.total_revenue)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* All Sales View Modal */}
      <AllSalesView
        isOpen={showAllSales}
        onClose={() => setShowAllSales(false)}
      />
    </div>
  );
};

export default SalesTracker;




