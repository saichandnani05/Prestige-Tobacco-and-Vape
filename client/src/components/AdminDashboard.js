import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import AnimatedDropdown from './AnimatedDropdown';
import { formatDateTime } from '../utils/dateUtils';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [pendingItems, setPendingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'employees'
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [editingPermissions, setEditingPermissions] = useState(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      if (activeTab === 'pending') {
        fetchPendingItems();
      } else if (activeTab === 'employees') {
        fetchEmployees();
      }
    }
  }, [user, activeTab]);

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

  const fetchEmployees = async () => {
    try {
      setEmployeesLoading(true);
      const response = await axios.get('/api/users');
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setMessage({ type: 'error', text: 'Error loading employees' });
    } finally {
      setEmployeesLoading(false);
    }
  };

  const handleUpdatePermissions = async (userId, permissions) => {
    try {
      const response = await axios.put(`/api/users/${userId}/permissions`, { permissions });
      setEmployees(employees.map(emp => emp.id === userId ? response.data : emp));
      setEditingPermissions(null);
      setMessage({ type: 'success', text: 'Permissions updated successfully!' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Error updating permissions'
      });
    }
  };

  const handleUpdateRole = async (userId, newRole, currentRole) => {
    // Prevent changing your own role from admin
    if (userId === user?.id && currentRole === 'admin' && newRole !== 'admin') {
      setMessage({ type: 'error', text: 'You cannot change your own admin role' });
      return;
    }

    try {
      const response = await axios.put(`/api/users/${userId}/role`, { role: newRole });
      const updatedEmployee = response.data;
      
      // Auto-apply role-based permissions when role changes
      const rolePermissions = getRolePermissions(newRole);
      if (rolePermissions && Object.keys(rolePermissions).length > 0) {
        try {
          await axios.put(`/api/users/${userId}/permissions`, { permissions: rolePermissions });
          updatedEmployee.permissions = rolePermissions;
        } catch (permError) {
          console.warn('Could not auto-apply permissions:', permError);
        }
      }
      
      setEmployees(employees.map(emp => emp.id === userId ? updatedEmployee : emp));
      setMessage({ type: 'success', text: `Role updated to ${newRole} successfully!` });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Error updating role'
      });
    }
  };

  // Get default permissions for a role
  const getRolePermissions = (role) => {
    const rolePermissionMap = {
      admin: {
        canViewInventory: true,
        canAddInventory: true,
        canEditInventory: true,
        canDeleteInventory: true,
        canApproveInventory: true,
        canViewReports: true,
        canManageUsers: true
      },
      manager: {
        canViewInventory: true,
        canAddInventory: true,
        canEditInventory: true,
        canDeleteInventory: false,
        canApproveInventory: true,
        canViewReports: true,
        canManageUsers: false
      },
      user: {
        canViewInventory: true,
        canAddInventory: true,
        canEditInventory: false,
        canDeleteInventory: false,
        canApproveInventory: false,
        canViewReports: false,
        canManageUsers: false
      }
    };
    return rolePermissionMap[role] || defaultPermissions;
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-pending',
      approved: 'badge-approved',
      rejected: 'badge-rejected'
    };
    return <span className={`badge ${badges[status] || ''}`}>{status}</span>;
  };

  const getRoleBadge = (role) => {
    const roleColors = {
      admin: { bg: '#fee2e2', color: '#991b1b', border: '#ef4444' },
      manager: { bg: '#dbeafe', color: '#1e40af', border: '#2563eb' },
      user: { bg: '#f1f5f9', color: '#475569', border: '#64748b' }
    };
    const style = roleColors[role] || roleColors.user;
    return (
      <span 
        className="badge"
        style={{
          backgroundColor: style.bg,
          color: style.color,
          border: `1px solid ${style.border}`
        }}
      >
        {role}
      </span>
    );
  };

  // Default permissions structure
  const defaultPermissions = {
    canViewInventory: true,
    canAddInventory: true,
    canEditInventory: false,
    canDeleteInventory: false,
    canApproveInventory: false,
    canViewReports: false,
    canManageUsers: false
  };

  if (user?.role !== 'admin') {
    return (
      <div className="container">
        <div className="alert alert-error">Access denied. Admin privileges required.</div>
      </div>
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
        style={{ color: '#ffffff' }}
      >
        Admin Dashboard
      </motion.h1>

      {message.text && (
        <motion.div 
          className={`alert alert-${message.type === 'error' ? 'error' : 'success'}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          {message.text}
        </motion.div>
      )}

      {/* Tab Navigation */}
      <div className="card" style={{ marginBottom: '24px', padding: '0' }}>
        <div style={{ 
          display: 'flex', 
          borderBottom: '2px solid #e2e8f0',
          backgroundColor: '#f8f9fa',
          borderRadius: '12px 12px 0 0'
        }}>
          <motion.button
            onClick={() => setActiveTab('pending')}
            style={{
              flex: 1,
              padding: '16px 24px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 500,
              color: activeTab === 'pending' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'pending' ? '3px solid #2563eb' : '3px solid transparent',
              transition: 'all 0.2s',
              borderRadius: '12px 0 0 0'
            }}
            whileHover={{ backgroundColor: activeTab === 'pending' ? 'transparent' : '#f1f5f9' }}
          >
            📋 Pending Approvals
          </motion.button>
          <motion.button
            onClick={() => setActiveTab('employees')}
            style={{
              flex: 1,
              padding: '16px 24px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 500,
              color: activeTab === 'employees' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'employees' ? '3px solid #2563eb' : '3px solid transparent',
              transition: 'all 0.2s',
              borderRadius: '0 12px 0 0'
            }}
            whileHover={{ backgroundColor: activeTab === 'employees' ? 'transparent' : '#f1f5f9' }}
          >
            👥 Employee Management
          </motion.button>
        </div>
      </div>

      {/* Pending Approvals Tab */}
      {activeTab === 'pending' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="card">
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ marginBottom: '8px', color: '#ffffff' }}>Pending Inventory Approvals</h2>
              <p style={{ color: '#e5e5e5', fontSize: '14px' }}>
                Review and approve or reject pending inventory items.
              </p>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: '#ffffff' }}>Loading pending items...</p>
              </div>
            ) : pendingItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#e5e5e5' }}>
                <p>No pending items to approve.</p>
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
                      <th>Description</th>
                      <th>Created By</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {pendingItems.map((item, index) => (
                        <motion.tr 
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ 
                            duration: 0.3,
                            delay: index * 0.05
                          }}
                          whileHover={{ 
                            scale: 1.01,
                            backgroundColor: '#f8f9fa',
                            transition: { duration: 0.2 }
                          }}
                        >
                          <td>{item.product_name}</td>
                          <td>{item.category || '-'}</td>
                          <td>{item.brand || '-'}</td>
                          <td>{item.quantity}</td>
                          <td>{item.unit_price ? `$${parseFloat(item.unit_price).toFixed(2)}` : '-'}</td>
                          <td>{item.sku || '-'}</td>
                          <td>{item.description || '-'}</td>
                          <td>{item.created_by_name || '-'}</td>
                          <td>{formatDateTime(item.created_at)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <motion.button
                                onClick={() => handleApprove(item.id)}
                                className="btn btn-success"
                                style={{ padding: '5px 10px', fontSize: '14px' }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                              >
                                Approve
                              </motion.button>
                              <motion.button
                                onClick={() => handleReject(item.id)}
                                className="btn btn-danger"
                                style={{ padding: '5px 10px', fontSize: '14px' }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                              >
                                Reject
                              </motion.button>
                            </div>
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
      )}

      {/* Employee Management Tab */}
      {activeTab === 'employees' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="card">
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ marginBottom: '8px', color: '#ffffff' }}>Employee List</h2>
              <p style={{ color: '#e5e5e5', fontSize: '14px' }}>
                Manage employee roles and permissions. Use the dropdown to change roles (permissions auto-update), or click "Edit Permissions" for custom settings.
              </p>
            </div>

            {employeesLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: '#ffffff' }}>Loading employees...</p>
              </div>
            ) : employees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#e5e5e5' }}>
                <p>No employees found.</p>
              </div>
            ) : (
              <>
                <div style={{ 
                  marginBottom: '20px', 
                  padding: '12px 16px', 
                  backgroundColor: '#dbeafe', 
                  borderRadius: '8px',
                  borderLeft: '4px solid #2563eb'
                }}>
                  <strong style={{ color: '#1e40af', fontSize: '15px' }}>
                    👥 Total Employees: {employees.length}
                  </strong>
                  <div style={{ marginTop: '8px', fontSize: '13px', color: '#64748b' }}>
                    💡 <strong>Tip:</strong> Click "Edit Permissions" to customize access for each employee
                  </div>
                </div>
              <div style={{ overflowX: 'auto', position: 'relative', overflowY: 'visible' }}>
                <table className="table" style={{ position: 'relative', tableLayout: 'auto' }}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Permissions</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {employees.map((employee, index) => {
                        const employeePermissions = employee.permissions || defaultPermissions;
                        const isEditing = editingPermissions === employee.id;
                        
                        return (
                          <motion.tr
                            key={employee.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            whileHover={{ 
                              scale: 1.01,
                              backgroundColor: '#f8f9fa',
                              transition: { duration: 0.2 }
                            }}
                          >
                            <td style={{ fontWeight: 600, color: '#ffffff' }}>
                              {employee.username}
                            </td>
                            <td style={{ color: '#ffffff' }}>{employee.email}</td>
                            <td style={{ position: 'relative', overflow: 'visible' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flexWrap: 'nowrap', position: 'relative' }}>
                                <div style={{ flexShrink: 0 }}>
                                  {getRoleBadge(employee.role)}
                                </div>
                                <div style={{ minWidth: '140px', position: 'relative', zIndex: 10001, flexShrink: 0 }}>
                                  <AnimatedDropdown
                                    options={[
                                      { value: 'user', label: '👤 User' },
                                      { value: 'manager', label: '👔 Manager' },
                                      { value: 'admin', label: '👑 Admin' }
                                    ]}
                                    value={employee.role}
                                    onChange={(e) => {
                                      const newRole = e.target.value;
                                      const currentRole = employee.role;
                                      
                                      // Special warning for admin role changes
                                      let confirmMessage = `Change ${employee.username}'s role from ${currentRole} to ${newRole}?`;
                                      if (currentRole === 'admin' && newRole !== 'admin') {
                                        confirmMessage = `⚠️ WARNING: You are removing admin privileges from ${employee.username}. This action cannot be undone easily. Continue?`;
                                      } else if (newRole === 'admin') {
                                        confirmMessage = `⚠️ Grant admin privileges to ${employee.username}? This will give them full access to the system.`;
                                      }
                                      
                                      if (window.confirm(confirmMessage)) {
                                        handleUpdateRole(employee.id, newRole, currentRole);
                                      } else {
                                        // Reset dropdown to original value if cancelled
                                        e.target.value = currentRole;
                                      }
                                    }}
                                    style={{ width: '100%' }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td>
                              {isEditing ? (
                                <div style={{ 
                                  padding: '12px', 
                                  backgroundColor: '#f8f9fa', 
                                  borderRadius: '8px',
                                  border: '2px solid #2563eb',
                                  minWidth: '300px'
                                }}>
                                  <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: '1fr', 
                                    gap: '10px',
                                    marginBottom: '12px'
                                  }}>
                                    {Object.entries(defaultPermissions).map(([key, defaultValue]) => {
                                      const permissionLabels = {
                                        canViewInventory: 'View Inventory',
                                        canAddInventory: 'Add Inventory Items',
                                        canEditInventory: 'Edit Inventory Items',
                                        canDeleteInventory: 'Delete Inventory Items',
                                        canApproveInventory: 'Approve/Reject Items',
                                        canViewReports: 'View Reports',
                                        canManageUsers: 'Manage Users'
                                      };
                                      
                                      return (
                                        <motion.label 
                                          key={key}
                                          style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '10px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            color: '#0f172a',
                                            padding: '8px',
                                            borderRadius: '6px',
                                            backgroundColor: employeePermissions[key] ? '#dbeafe' : 'transparent',
                                            transition: 'background-color 0.2s'
                                          }}
                                          whileHover={{ backgroundColor: '#f1f5f9' }}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={employeePermissions[key] || false}
                                            onChange={(e) => {
                                              const newPermissions = {
                                                ...employeePermissions,
                                                [key]: e.target.checked
                                              };
                                              handleUpdatePermissions(employee.id, newPermissions);
                                            }}
                                            style={{ 
                                              cursor: 'pointer',
                                              width: '18px',
                                              height: '18px',
                                              accentColor: '#2563eb'
                                            }}
                                          />
                                          <span style={{ 
                                            fontWeight: 500,
                                            flex: 1
                                          }}>
                                            {permissionLabels[key] || key.replace(/([A-Z])/g, ' $1').trim()}
                                          </span>
                                        </motion.label>
                                      );
                                    })}
                                  </div>
                                  <motion.button
                                    onClick={() => setEditingPermissions(null)}
                                    className="btn btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    Done
                                  </motion.button>
                                </div>
                              ) : (
                                <div>
                                  <motion.button
                                    onClick={() => setEditingPermissions(employee.id)}
                                    className="btn btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '12px' }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    {Object.values(employeePermissions).filter(Boolean).length} Permissions
                                  </motion.button>
                                  <div style={{ 
                                    marginTop: '6px', 
                                    fontSize: '11px', 
                                    color: '#ffffff',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '4px'
                                  }}>
                                    {Object.entries(employeePermissions)
                                      .filter(([_, value]) => value)
                                      .slice(0, 3)
                                      .map(([key]) => (
                                        <span 
                                          key={key}
                                          style={{
                                            padding: '2px 6px',
                                            backgroundColor: '#e2e8f0',
                                            borderRadius: '4px',
                                            color: '#1e293b'
                                          }}
                                        >
                                          {key.replace(/([A-Z])/g, ' $1').trim().split(' ')[0]}
                                        </span>
                                      ))}
                                    {Object.values(employeePermissions).filter(Boolean).length > 3 && (
                                      <span>+{Object.values(employeePermissions).filter(Boolean).length - 3} more</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td style={{ color: '#ffffff', fontSize: '13px' }}>
                              {formatDateTime(employee.created_at)}
                            </td>
                            <td>
                              {!isEditing && (
                                <motion.button
                                  onClick={() => setEditingPermissions(employee.id)}
                                  className="btn btn-primary"
                                  style={{ padding: '6px 12px', fontSize: '12px' }}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  {editingPermissions === employee.id ? 'Cancel' : 'Edit Permissions'}
                                </motion.button>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AdminDashboard;

