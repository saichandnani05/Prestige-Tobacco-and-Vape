// API configuration for different environments
const getApiBaseUrl = () => {
  // In production (Vercel), use relative URLs
  if (process.env.NODE_ENV === 'production') {
    return '';
  }
  // In development, use proxy or localhost
  return process.env.REACT_APP_API_URL || '';
};

export const API_BASE_URL = getApiBaseUrl();

// Configure axios defaults
import axios from 'axios';

// Set base URL for API calls
if (API_BASE_URL) {
  axios.defaults.baseURL = API_BASE_URL;
}

export default axios;

