import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import ProfileSettings from './ProfileSettings';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/inventory', label: 'Inventory' },
    { path: '/add-item', label: 'Add Item' },
    ...(user?.role === 'admin' ? [{ path: '/admin', label: 'Admin Panel' }] : [])
  ];

  return (
    <motion.nav 
      className="navbar"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="navbar-container">
        <motion.div 
          className="navbar-brand"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <img 
              src="/logo.png" 
              alt="Prestige Tobacco & Vape" 
              style={{ 
                height: '45px', 
                width: 'auto',
                filter: 'drop-shadow(0 0 8px rgba(220, 20, 60, 0.5))'
              }} 
            />
            <span style={{ 
              fontFamily: "'Oswald', sans-serif",
              fontSize: '1.3rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#dc143c',
              textShadow: '0 0 10px rgba(220, 20, 60, 0.5)'
            }}>
              PRESTIGE
            </span>
          </Link>
        </motion.div>
        <div className="navbar-menu">
          {navLinks.map((link, index) => (
            <motion.div
              key={link.path}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Link 
                to={link.path} 
                className={`navbar-link ${location.pathname === link.path ? 'active' : ''}`}
              >
                {link.label}
                {location.pathname === link.path && (
                  <motion.div
                    className="navbar-link-indicator"
                    layoutId="navbar-indicator"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            </motion.div>
          ))}
          <motion.div 
            className="navbar-user"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <span 
              className="navbar-username"
              onClick={() => setShowProfileSettings(true)}
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
              title="Click to edit display name"
            >
              {user?.username}
            </span>
            <span className="navbar-role">({user?.role})</span>
            <motion.button 
              onClick={handleLogout} 
              className="btn btn-secondary btn-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              Logout
            </motion.button>
          </motion.div>
        </div>
      </div>
      <ProfileSettings 
        isOpen={showProfileSettings} 
        onClose={() => setShowProfileSettings(false)} 
      />
    </motion.nav>
  );
};

export default Navbar;
