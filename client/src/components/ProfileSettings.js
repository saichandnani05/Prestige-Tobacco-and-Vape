import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './ProfileSettings.css';

const ProfileSettings = ({ isOpen, onClose }) => {
  const { user, setUser, fetchUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user && isOpen) {
      setDisplayName(user.username || '');
      setError('');
      setSuccess('');
    }
  }, [user, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const trimmedName = displayName.trim();
      console.log('📝 Updating display name:', trimmedName);
      console.log('📝 API URL:', '/api/users/me/display-name');
      console.log('📝 Request payload:', { displayName: trimmedName });
      
      const response = await axios.post('/api/users/me/display-name', {
        displayName: trimmedName
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Response received:', response.data);
      console.log('✅ Response status:', response.status);

      if (response.data && response.data.user) {
        // Update user in context
        try {
          // Use setUser if available
          if (typeof setUser === 'function') {
            console.log('✅ Using setUser to update context');
            setUser(response.data.user);
          } else if (typeof fetchUser === 'function') {
            // Fallback: use fetchUser to refresh user data from server
            console.log('⚠️ setUser not available, using fetchUser to refresh user data');
            await fetchUser();
          } else {
            console.warn('⚠️ Neither setUser nor fetchUser available. User context may not update.');
            // The update was successful on server, so show success anyway
          }
        } catch (updateError) {
          console.error('❌ Error updating user context:', updateError);
          // Continue anyway - the update was successful on the server
        }
        setSuccess('Display name updated successfully!');
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      } else {
        console.error('❌ Invalid response structure:', response.data);
        setError('Invalid response from server. Please try again.');
      }
    } catch (err) {
      console.error('❌ Error updating display name:', err);
      console.error('❌ Error response:', err.response);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update display name. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="profile-settings-overlay" onClick={onClose}>
      <div className="profile-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-settings-header">
          <h2>Profile Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="profile-settings-content">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="displayName">Display Name</label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                minLength={3}
                maxLength={50}
                required
                disabled={loading}
              />
              <small>Your display name will be visible to other users. Must be 3-50 characters.</small>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {success && (
              <div className="success-message">
                {success}
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={onClose}
                className="btn-cancel"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-save"
                disabled={loading || displayName.trim() === (user?.username || '')}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>

          <div className="profile-info">
            <div className="info-item">
              <span className="info-label">Email:</span>
              <span className="info-value">{user?.email || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Role:</span>
              <span className="info-value">{user?.role || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;

