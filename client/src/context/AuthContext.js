import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  getIdToken
} from 'firebase/auth';
import { auth, firebaseInitialized } from '../firebase/config';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState(null);

  // Set up axios interceptor to handle token refresh and errors
  useEffect(() => {
    // Initialize axios with token on mount
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // Request interceptor - ensure token is always included
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle 401 errors gracefully
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If we get a 401 and haven't already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          // Check if it's a token expiration error
          const errorMessage = error.response?.data?.error || '';
          if (errorMessage.includes('expired') || errorMessage.includes('Invalid token')) {
            // Token is expired or invalid - try to refresh user session
            const token = localStorage.getItem('token');
            if (token) {
              try {
                // Try to fetch user again with existing token (in case it's a temporary issue)
                const response = await axios.get('/api/users/me', {
                  headers: { Authorization: `Bearer ${token}` }
                });
                if (response.data) {
                  setUser(response.data);
                  // Retry the original request
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                  return axios(originalRequest);
                }
            } catch (refreshError) {
              // NEVER automatically clear tokens - only clear on explicit logout
              // Even if refresh fails, keep the token and let user manually logout if needed
              console.warn('Token refresh failed, but keeping session:', refreshError);
              // Don't clear tokens - preserve user session
            }
            }
          }
          // For other 401 errors, don't automatically clear tokens - might be temporary
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  useEffect(() => {
    // Check for existing token in localStorage (for legacy auth)
    const existingToken = localStorage.getItem('token');
    const existingFirebaseToken = localStorage.getItem('firebaseToken');
    
    // Set loading to true initially to prevent premature redirects
    setLoading(true);
    
    if (existingToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${existingToken}`;
      // Try to fetch user with existing token
      fetchUser();
    } else if (existingFirebaseToken) {
      // If we have Firebase token but no backend token, try to sync
      axios.defaults.headers.common['Authorization'] = `Bearer ${existingFirebaseToken}`;
      // Try to fetch user with Firebase token
      fetchUser();
    } else {
      // No tokens at all - check Firebase if available
      if (firebaseInitialized && auth) {
        // Firebase will handle auth state change and set loading to false
        // Don't set loading to false here - let Firebase listener handle it
      } else {
        // No tokens and no Firebase - stop loading
        setLoading(false);
      }
    }

    // Only set up Firebase listener if Firebase is initialized
    if (!firebaseInitialized || !auth) {
      // If no token and no Firebase, loading already handled above
      return;
    }

    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Get Firebase ID token
          const token = await getIdToken(firebaseUser);
          localStorage.setItem('firebaseToken', token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Sync user with backend
          await syncUserWithBackend(firebaseUser, token);
        } catch (error) {
          console.error('Error getting Firebase token:', error);
          setLoading(false);
        }
      } else {
        // Firebase user signed out - but keep backend token and session
        // Backend token persists independently - user stays logged in
        const existingToken = localStorage.getItem('token');
        if (existingToken) {
          // Keep backend token and user session even if Firebase session ends
          // User can still use the app with backend token
          // Only clear Firebase-specific token
          localStorage.removeItem('firebaseToken');
          // Don't clear backend token or user - preserve session
          // If user is already set from backend token, keep it
          if (!user) {
            // Try to fetch user with backend token
            fetchUser();
          } else {
            setLoading(false);
          }
        } else {
          // No backend token exists, so clear Firebase token and user
          localStorage.removeItem('firebaseToken');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const syncUserWithBackend = async (firebaseUser, firebaseToken) => {
    try {
      // Try to get user from backend using Firebase token
      const response = await axios.post('/api/auth/firebase', {
        firebaseToken,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        uid: firebaseUser.uid
      });
      
      if (response.data.user) {
        setUser(response.data.user);
      }
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      }
    } catch (error) {
      // If user doesn't exist in backend, create them
      if (error.response?.status === 404) {
        try {
          const createResponse = await axios.post('/api/auth/firebase/register', {
            firebaseToken,
            email: firebaseUser.email,
            username: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            uid: firebaseUser.uid
          });
          if (createResponse.data.user) {
            setUser(createResponse.data.user);
          }
          if (createResponse.data.token) {
            localStorage.setItem('token', createResponse.data.token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${createResponse.data.token}`;
          }
        } catch (createError) {
          console.error('Error creating user in backend:', createError);
        }
      } else {
        console.error('Error syncing user:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const response = await axios.get('/api/users/me');
      if (response.data) {
        setUser(response.data);
        // Ensure token is still stored after successful fetch
        if (!localStorage.getItem('token')) {
          localStorage.setItem('token', token);
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      // If we have a token but fetch fails, check if it's a network error or auth error
      if (error.response?.status === 401) {
        // Token is invalid - clear it
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
      } else {
        // Network or other error - keep token and try to preserve session
        // Don't clear tokens on network errors - might be temporary
        console.warn('Error fetching user (non-auth error), keeping session:', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Firebase login
  const loginWithFirebase = async (email, password) => {
    if (!firebaseInitialized || !auth) {
      return {
        success: false,
        error: 'Firebase is not configured. Please use username/password login or configure Firebase.'
      };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Auth state listener will handle the rest
      return { success: true };
    } catch (error) {
      let errorMessage = 'Login failed';
      
      // Handle API key errors specifically
      if (error.code === 'auth/api-key-not-valid' || error.message?.includes('api-key')) {
        return {
          success: false,
          error: 'Firebase API key is invalid. Please configure Firebase in your .env file or contact your administrator.'
        };
      }

      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later';
          break;
        default:
          errorMessage = error.message || 'Login failed';
      }
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  // Firebase register
  const registerWithFirebase = async (email, password, username) => {
    if (!firebaseInitialized || !auth) {
      return {
        success: false,
        error: 'Firebase is not configured. Please configure Firebase in your .env file or contact your administrator.'
      };
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Auth state listener will handle the rest
      return { success: true };
    } catch (error) {
      let errorMessage = 'Registration failed';
      
      // Handle API key errors specifically
      if (error.code === 'auth/api-key-not-valid' || error.message?.includes('api-key')) {
        return {
          success: false,
          error: 'Firebase API key is invalid. Please configure Firebase in your .env file or contact your administrator.'
        };
      }

      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak';
          break;
        default:
          errorMessage = error.message || 'Registration failed';
      }
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  // Legacy login (for backward compatibility)
  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/login', { username, password });
      const { token, user } = response.data;
      
      // Persist token to localStorage
      if (token) {
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      if (user) {
        setUser(user);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  // Legacy register (for backward compatibility)
  const register = async (username, email, password) => {
    try {
      const response = await axios.post('/api/auth/register', { username, email, password });
      const { token, user } = response.data;
      
      // Persist token to localStorage
      if (token) {
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      if (user) {
        setUser(user);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed'
      };
    }
  };

  // Google Sign In
  const signInWithGoogle = async () => {
    if (!firebaseInitialized || !auth) {
      return {
        success: false,
        error: 'Firebase is not configured. Please configure Firebase to use Google sign-in.'
      };
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      const result = await signInWithPopup(auth, provider);
      // Auth state listener will handle the rest
      return { success: true };
    } catch (error) {
      let errorMessage = 'Google sign-in failed';
      
      // Handle API key errors specifically
      if (error.code === 'auth/api-key-not-valid' || error.message?.includes('api-key')) {
        return {
          success: false,
          error: 'Firebase API key is invalid. Please configure Firebase in your .env file.'
        };
      }

      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'Sign-in popup was closed';
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = 'Sign-in was cancelled';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Popup was blocked. Please allow popups for this site';
          break;
        default:
          errorMessage = error.message || 'Google sign-in failed';
      }
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  // Apple Sign In
  const signInWithApple = async () => {
    if (!firebaseInitialized || !auth) {
      return {
        success: false,
        error: 'Firebase is not configured. Please configure Firebase to use Apple sign-in.'
      };
    }

    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      const result = await signInWithPopup(auth, provider);
      // Auth state listener will handle the rest
      return { success: true };
    } catch (error) {
      let errorMessage = 'Apple sign-in failed';
      
      // Handle API key errors specifically
      if (error.code === 'auth/api-key-not-valid' || error.message?.includes('api-key')) {
        return {
          success: false,
          error: 'Firebase API key is invalid. Please configure Firebase in your .env file.'
        };
      }

      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'Sign-in popup was closed';
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = 'Sign-in was cancelled';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Popup was blocked. Please allow popups for this site';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Apple sign-in is not enabled. Please contact support';
          break;
        default:
          errorMessage = error.message || 'Apple sign-in failed';
      }
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const logout = async () => {
    try {
      if (firebaseUser && firebaseInitialized && auth) {
        await firebaseSignOut(auth);
      }
    } catch (error) {
      console.error('Error signing out from Firebase:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('firebaseToken');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setFirebaseUser(null);
    }
  };

  const value = {
    user,
    setUser,
    loading,
    firebaseUser,
    login,
    register,
    loginWithFirebase,
    registerWithFirebase,
    signInWithGoogle,
    signInWithApple,
    logout,
    fetchUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

