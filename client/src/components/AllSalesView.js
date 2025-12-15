import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { formatDateTime, formatDateShort, getTimezoneInfo } from '../utils/dateUtils';
import './AllSalesView.css';

const AllSalesView = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [allSales, setAllSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [selectedSales, setSelectedSales] = useState(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    limit: 1000
  });
  
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isOpen) {
      fetchAllSales();
    }
  }, [isOpen, filters]);

  const fetchAllSales = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('limit', filters.limit);

      const response = await axios.get(`/api/sales?${params.toString()}`);
      // Ensure data is in chronological order (oldest first, newest last)
      // Server already returns ASC order, but ensure proper client-side sorting
      const salesData = response.data || [];
      
      // Normalize IDs to numbers and sort by created_at ascending
      const normalizedSales = salesData.map(sale => ({
        ...sale,
        id: typeof sale.id === 'string' ? parseInt(sale.id, 10) : sale.id
      })).filter(sale => !isNaN(sale.id) && sale.id > 0);
      
      // Sort by ID ascending to ensure records are displayed in ID order
      // After deletion, remaining records will be sorted by ID (1, 2, 3, etc.)
      const sortedSales = [...normalizedSales].sort((a, b) => {
        // Primary sort: by ID (ascending - lowest ID first)
        const idDiff = (a.id || 0) - (b.id || 0);
        if (idDiff !== 0) {
          return idDiff;
        }
        
        // Secondary sort: by created_at (ascending) if IDs are equal (shouldn't happen)
        if (a.created_at && b.created_at) {
          let dateA, dateB;
          const dateStrA = a.created_at;
          const dateStrB = b.created_at;
          
          if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStrA)) {
            dateA = new Date(dateStrA.replace(' ', 'T') + 'Z');
          } else {
            dateA = new Date(dateStrA);
          }
          
          if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStrB)) {
            dateB = new Date(dateStrB.replace(' ', 'T') + 'Z');
          } else {
            dateB = new Date(dateStrB);
          }
          
          return dateA.getTime() - dateB.getTime();
        }
        
        return 0;
      });
      
      setAllSales(sortedSales);
      console.log('📊 Loaded sales:', sortedSales.length, 'IDs:', sortedSales.map(s => s.id), 'First date:', sortedSales[0]?.created_at, 'Last date:', sortedSales[sortedSales.length - 1]?.created_at);
    } catch (err) {
      console.error('Error fetching all sales:', err);
      setError('Failed to load sales. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Use timezone-aware date formatting (CST)
  const formatDate = (dateString) => {
    // Use the utility function which handles CST conversion properly
    return formatDateTime(dateString);
  };

  const formatPaymentMethod = (method) => {
    if (!method) return 'N/A';
    const lowerMethod = method.toLowerCase();
    if (lowerMethod === 'cash') {
      return '$ Cash';
    }
    return method.charAt(0).toUpperCase() + method.slice(1);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Sales Report', 14, 22);
    
    // Date range info
    doc.setFontSize(10);
    const dateRange = filters.startDate || filters.endDate
      ? `Period: ${filters.startDate || 'All'} to ${filters.endDate || 'All'}`
      : 'All Sales';
    doc.text(dateRange, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);
    doc.text(`Total Sales: ${allSales.length}`, 14, 42);
    doc.text(`Order: Sequential (Auto-adjusting row numbers)`, 14, 48);

    // Prepare table data - sort by ID ascending (lowest ID first)
    // After deletion, remaining records are sorted by ID in ascending order
    const sortedSales = [...allSales].sort((a, b) => {
      // Primary sort: by ID (ascending)
      return (a.id || 0) - (b.id || 0);
    });
    
    const tableData = sortedSales.map((sale, index) => [
      index + 1, // Sequential row number (1, 2, 3...) that auto-adjusts
      sale.product_name || 'N/A',
      sale.brand || 'N/A',
      sale.quantity_sold || 0,
      formatCurrency(sale.unit_price),
      formatCurrency(sale.total_amount),
      formatPaymentMethod(sale.payment_method),
      sale.customer_name || 'N/A',
      sale.sold_by_name || 'N/A',
      formatDate(sale.created_at)
    ]);

    // Add table
    doc.autoTable({
      startY: 54,
      head: [['ID', 'Product', 'Brand', 'Qty', 'Unit Price', 'Total', 'Payment', 'Customer', 'Sold By', 'Date']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [220, 20, 60] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 48 }
    });

    // Calculate totals
    const totalRevenue = allSales.reduce((sum, sale) => sum + (parseFloat(sale.total_amount) || 0), 0);
    const totalItems = allSales.reduce((sum, sale) => sum + (parseInt(sale.quantity_sold) || 0), 0);

    // Add totals at bottom
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(`Total Revenue: ${formatCurrency(totalRevenue)}`, 14, finalY);
    doc.text(`Total Items Sold: ${totalItems}`, 14, finalY + 6);

    // Save PDF
    doc.save(`sales-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    // Prepare data for Excel - sort by ID ascending (lowest ID first)
    // After deletion, remaining records are sorted by ID in ascending order
    const sortedSales = [...allSales].sort((a, b) => {
      // Primary sort: by ID (ascending)
      return (a.id || 0) - (b.id || 0);
    });
    
    const excelData = sortedSales.map((sale, index) => ({
      'ID': index + 1, // Sequential row number (1, 2, 3...) that auto-adjusts
      'Date': formatDateTime(sale.created_at),
      'Product Name': sale.product_name || 'N/A',
      'Brand': sale.brand || 'N/A',
      'SKU': sale.sku || 'N/A',
      'Quantity': sale.quantity_sold || 0,
      'Unit Price': parseFloat(sale.unit_price) || 0,
      'Total Amount': parseFloat(sale.total_amount) || 0,
      'Payment Method': formatPaymentMethod(sale.payment_method),
      'Customer Name': sale.customer_name || 'N/A',
      'Sold By': sale.sold_by_name || 'N/A',
      'Notes': sale.notes || ''
    }));

    // Calculate totals
    const totalRevenue = sortedSales.reduce((sum, sale) => sum + (parseFloat(sale.total_amount) || 0), 0);
    const totalItems = sortedSales.reduce((sum, sale) => sum + (parseInt(sale.quantity_sold) || 0), 0);
    const totalSales = sortedSales.length;

    // Add summary row
    excelData.push({
      'ID': '',
      'Date': '',
      'Product Name': '',
      'Brand': '',
      'SKU': '',
      'Quantity': totalItems,
      'Unit Price': '',
      'Total Amount': totalRevenue,
      'Payment Method': 'SUMMARY',
      'Customer Name': '',
      'Sold By': `Total Sales: ${totalSales}`,
      'Notes': ''
    });

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');

    // Save file
    XLSX.writeFile(wb, `sales-report-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDeleteSale = async (saleId) => {
    if (!window.confirm('Are you sure you want to delete this sale? This action cannot be undone and will restore inventory quantity.')) {
      return;
    }

    setDeletingId(saleId);
    try {
      await axios.delete(`/api/sales/${saleId}`);
      // Remove from selected if it was selected
      setSelectedSales(prev => {
        const newSet = new Set(prev);
        newSet.delete(saleId);
        return newSet;
      });
      
      // Refresh to get updated data - this will re-sort remaining sales chronologically
      // The fetchAllSales function will sort by created_at ASC (oldest first, newest last)
      await fetchAllSales();
      
      console.log('✅ Sale deleted. Remaining sales re-sorted chronologically.');
    } catch (err) {
      console.error('Error deleting sale:', err);
      setError(err.response?.data?.error || 'Failed to delete sale. Please try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelectSale = (saleId) => {
    setSelectedSales(prev => {
      const newSet = new Set(prev);
      // Ensure ID is a number for consistency
      const numId = typeof saleId === 'string' ? parseInt(saleId, 10) : saleId;
      if (isNaN(numId) || numId <= 0) {
        console.warn('Invalid sale ID:', saleId);
        return newSet;
      }
      if (newSet.has(numId)) {
        newSet.delete(numId);
      } else {
        newSet.add(numId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    // Normalize all sales IDs first
    const normalizedSales = allSales.map(sale => ({
      ...sale,
      normalizedId: typeof sale.id === 'string' ? parseInt(sale.id, 10) : sale.id
    })).filter(sale => !isNaN(sale.normalizedId) && sale.normalizedId > 0);
    
    // Check if all normalized sales are selected
    const allNormalizedIds = new Set(normalizedSales.map(s => s.normalizedId));
    const allSelected = normalizedSales.length > 0 && 
                        selectedSales.size === normalizedSales.length &&
                        normalizedSales.every(sale => selectedSales.has(sale.normalizedId));
    
    if (allSelected) {
      // Deselect all
      setSelectedSales(new Set());
      console.log('☐ Deselected all sales');
    } else {
      // Select all - use normalized IDs
      const allIds = normalizedSales.map(sale => sale.normalizedId);
      
      if (allIds.length === 0) {
        console.warn('⚠️ No valid IDs found in allSales');
        setError('No valid sales to select.');
        setTimeout(() => setError(''), 3000);
        return;
      }
      
      setSelectedSales(new Set(allIds));
      console.log('✅ Selected all sales:', {
        count: allIds.length,
        ids: allIds,
        types: allIds.map(id => typeof id),
        allSalesCount: allSales.length
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSales.size === 0) {
      setError('Please select at least one sale to delete.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const count = selectedSales.size;
    if (!window.confirm(`Are you sure you want to delete ${count} sale(s)? This action cannot be undone and will restore inventory quantities.`)) {
      return;
    }

    setIsDeletingBulk(true);
    setError('');
    try {
      // Ensure all IDs are numbers - convert Set to Array and normalize
      const saleIds = Array.from(selectedSales)
        .map(id => {
          // Convert to number - handle string, number, or other types
          if (typeof id === 'number') {
            return id;
          } else if (typeof id === 'string') {
            const parsed = parseInt(id, 10);
            return isNaN(parsed) ? null : parsed;
          } else {
            const parsed = parseInt(String(id), 10);
            return isNaN(parsed) ? null : parsed;
          }
        })
        .filter(id => id !== null && !isNaN(id) && id > 0);
      
      if (saleIds.length === 0) {
        setError('❌ No valid sale IDs selected. Please select sales to delete.');
        setIsDeletingBulk(false);
        return;
      }
      
      console.log('🗑️ Deleting sales:', {
        count: saleIds.length,
        ids: saleIds,
        types: saleIds.map(id => typeof id),
        selectedSalesSize: selectedSales.size,
        allSalesCount: allSales.length,
        allSalesIds: allSales.map(s => s.id)
      });
      
      // Use DELETE method with proper body
      const response = await axios({
        method: 'delete',
        url: '/api/sales/bulk',
        data: { ids: saleIds },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Bulk delete response:', response.data);
      
      // Clear selection
      setSelectedSales(new Set());
      
      // Refresh data to get updated list with remaining sales in chronological order
      // Sales are permanently deleted and remaining records are re-sorted by created_at ASC
      await fetchAllSales();
      
      console.log('✅ Bulk delete completed. Remaining sales re-sorted chronologically.');
      
      // Show success message
      const successMsg = response.data?.message || `✅ Successfully deleted ${response.data?.deletedCount || count} sale(s).`;
      setError(successMsg);
      setTimeout(() => setError(''), 5000);
    } catch (err) {
      console.error('❌ Error deleting sales:', err);
      console.error('Error response:', err.response?.data);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to delete sales. Please try again.';
      setError(`❌ ${errorMsg}`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const totalRevenue = allSales.reduce((sum, sale) => sum + (parseFloat(sale.total_amount) || 0), 0);
  const totalItems = allSales.reduce((sum, sale) => sum + (parseInt(sale.quantity_sold) || 0), 0);

  if (!isOpen) return null;

  return (
    <motion.div
      className="all-sales-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="all-sales-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="all-sales-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ color: '#ffffff', margin: 0 }}>All Sales</h2>
            <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0 0' }}>
              Timezone: {getTimezoneInfo().timezone} ({getTimezoneInfo().offsetString})
            </p>
          </div>
          <button
            onClick={onClose}
            className="close-button"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        {/* Filters */}
        <div className="all-sales-filters">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
            <div>
              <label style={{ color: '#e5e5e5', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#2a2a2a',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ color: '#e5e5e5', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#2a2a2a',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ color: '#e5e5e5', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                Limit
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                value={filters.limit}
                onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) || 1000 })}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#2a2a2a',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '14px'
                }}
              />
            </div>
            <button
              onClick={fetchAllSales}
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: '#dc143c',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                fontSize: '14px',
                fontWeight: 600
              }}
            >
              {loading ? 'Loading...' : 'Apply'}
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="all-sales-summary">
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ padding: '12px 16px', background: 'rgba(220, 20, 60, 0.1)', borderRadius: '8px', border: '1px solid rgba(220, 20, 60, 0.3)' }}>
              <div style={{ color: '#64748b', fontSize: '12px' }}>Total Sales</div>
              <div style={{ color: '#ffffff', fontSize: '18px', fontWeight: 600 }}>{allSales.length}</div>
            </div>
            <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div style={{ color: '#64748b', fontSize: '12px' }}>Total Revenue</div>
              <div style={{ color: '#10b981', fontSize: '18px', fontWeight: 600 }}>{formatCurrency(totalRevenue)}</div>
            </div>
            <div style={{ padding: '12px 16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <div style={{ color: '#64748b', fontSize: '12px' }}>Total Items</div>
              <div style={{ color: '#3b82f6', fontSize: '18px', fontWeight: 600 }}>{totalItems}</div>
            </div>
          </div>
        </div>

        {/* Export and Bulk Actions */}
        <div className="all-sales-export" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {isAdmin && selectedSales.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={loading || isDeletingBulk || selectedSales.size === 0}
              style={{
                padding: '10px 20px',
                background: '#ef4444',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                cursor: (loading || isDeletingBulk || selectedSales.size === 0) ? 'not-allowed' : 'pointer',
                opacity: (loading || isDeletingBulk || selectedSales.size === 0) ? 0.5 : 1,
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isDeletingBulk ? '⏳ Deleting...' : `🗑️ Delete Selected (${selectedSales.size})`}
            </button>
          )}
          {isAdmin && (
            <button
              onClick={handleSelectAll}
              disabled={loading || allSales.length === 0}
              style={{
                padding: '10px 20px',
                background: selectedSales.size === allSales.length ? '#3b82f6' : '#64748b',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                cursor: (loading || allSales.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (loading || allSales.length === 0) ? 0.5 : 1,
                fontSize: '14px',
                fontWeight: 600
              }}
            >
              {selectedSales.size === allSales.length ? '☑️ Deselect All' : '☐ Select All'}
            </button>
          )}
          <button
            onClick={exportToPDF}
            disabled={loading || allSales.length === 0}
            style={{
              padding: '10px 20px',
              background: '#ef4444',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              cursor: (loading || allSales.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (loading || allSales.length === 0) ? 0.5 : 1,
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            📄 Export PDF
          </button>
          <button
            onClick={exportToExcel}
            disabled={loading || allSales.length === 0}
            style={{
              padding: '10px 20px',
              background: '#10b981',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              cursor: (loading || allSales.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (loading || allSales.length === 0) ? 0.5 : 1,
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            📊 Export Excel
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '6px',
            color: '#ef4444',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        {/* Sales Table */}
        <div className="all-sales-table-container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#e5e5e5' }}>
              Loading sales...
            </div>
          ) : allSales.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#e5e5e5' }}>
              No sales found
            </div>
          ) : (
            <table className="all-sales-table">
              <thead>
                <tr>
                  {isAdmin && (
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={(() => {
                          // Normalize all sales IDs for comparison
                          const normalizedSales = allSales
                            .map(sale => typeof sale.id === 'string' ? parseInt(sale.id, 10) : sale.id)
                            .filter(id => !isNaN(id) && id > 0);
                          const allNormalizedIds = new Set(normalizedSales);
                          return normalizedSales.length > 0 && 
                                 selectedSales.size === normalizedSales.length &&
                                 normalizedSales.every(id => selectedSales.has(id));
                        })()}
                        onChange={handleSelectAll}
                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                        title={selectedSales.size === allSales.length ? 'Deselect all' : 'Select all'}
                      />
                    </th>
                  )}
                  <th>ID</th>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Brand</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Customer</th>
                  <th>Sold By</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {allSales.map((sale, index) => {
                  // Normalize sale ID for comparison
                  const saleId = typeof sale.id === 'string' ? parseInt(sale.id, 10) : sale.id;
                  const isSelected = selectedSales.has(saleId);
                  // Display sequential row number (1, 2, 3...) that auto-adjusts when records are added/deleted
                  const displayId = index + 1;
                  
                  return (
                  <tr key={sale.id} style={{ backgroundColor: isSelected ? 'rgba(220, 20, 60, 0.1)' : 'transparent' }}>
                    {isAdmin && (
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectSale(saleId)}
                          style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                        />
                      </td>
                    )}
                    <td>{displayId}</td>
                    <td>{formatDate(sale.created_at)}</td>
                    <td>{sale.product_name || 'N/A'}</td>
                    <td>{sale.brand || 'N/A'}</td>
                    <td>{sale.quantity_sold || 0}</td>
                    <td>{formatCurrency(sale.unit_price)}</td>
                    <td style={{ color: '#10b981', fontWeight: 600 }}>
                      {formatCurrency(sale.total_amount)}
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        background: sale.payment_method?.toLowerCase() === 'cash' 
                          ? 'rgba(16, 185, 129, 0.2)' 
                          : 'rgba(59, 130, 246, 0.2)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: sale.payment_method?.toLowerCase() === 'cash' 
                          ? '#10b981' 
                          : '#3b82f6'
                      }}>
                        {formatPaymentMethod(sale.payment_method)}
                      </span>
                    </td>
                    <td>{sale.customer_name || 'N/A'}</td>
                    <td>{sale.sold_by_name || 'N/A'}</td>
                    {isAdmin && (
                      <td>
                        <button
                          onClick={() => handleDeleteSale(saleId)}
                          disabled={deletingId === saleId}
                          style={{
                            padding: '6px 12px',
                            background: deletingId === saleId ? '#333' : '#ef4444',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#ffffff',
                            fontSize: '12px',
                            cursor: deletingId === saleId ? 'not-allowed' : 'pointer',
                            opacity: deletingId === saleId ? 0.6 : 1,
                            fontWeight: 500
                          }}
                        >
                          {deletingId === saleId ? 'Deleting...' : '🗑️ Delete'}
                        </button>
                      </td>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AllSalesView;



