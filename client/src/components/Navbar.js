import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link to="/dashboard">Prestige Inventory</Link>
        </div>
        <div className="navbar-menu">
          <Link to="/dashboard" className="navbar-link">Dashboard</Link>
          <Link to="/inventory" className="navbar-link">Inventory</Link>
          <Link to="/add-item" className="navbar-link">Add Item</Link>
          {user?.role === 'admin' && (
            <Link to="/admin" className="navbar-link">Admin Panel</Link>
          )}
          <div className="navbar-user">
            <span className="navbar-username">{user?.username}</span>
            <span className="navbar-role">({user?.role})</span>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

