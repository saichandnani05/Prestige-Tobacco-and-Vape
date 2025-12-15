import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
// 
// SETUP INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project or select an existing one
// 3. Enable Authentication > Sign-in method:
//    - Enable "Email/Password" provider
//    - Enable "Google" provider (for Google sign-in)
//    - Enable "Apple" provider (for Apple sign-in)
// 4. For Google: No additional setup needed
// 5. For Apple: Configure Apple Sign-In with your Apple Developer account
// 6. Go to Project Settings > General > Your apps
// 7. Click the web icon (</>) to add a web app
// 8. Copy the config values below OR use environment variables
//
// To use environment variables, create a .env file in the client directory with:
// REACT_APP_FIREBASE_API_KEY=your-api-key
// REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
// REACT_APP_FIREBASE_PROJECT_ID=your-project-id
// REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
// REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
// REACT_APP_FIREBASE_APP_ID=your-app-id

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAP6xbtFGbPLqhAGyPJHjOhzw8pW4WhO6Q",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "prestige-vape.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "prestige-vape",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "prestige-vape.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "209564399440",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:209564399440:web:ad57e90d044e014d089e55",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-TLJL7QCHBN"
};

// Check if Firebase is properly configured
const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey && 
         firebaseConfig.apiKey !== "your-api-key" &&
         firebaseConfig.apiKey.startsWith("AIza") && // Firebase API keys start with AIza
         firebaseConfig.projectId && 
         firebaseConfig.projectId !== "your-project-id" &&
         firebaseConfig.authDomain && 
         firebaseConfig.authDomain !== "your-project.firebaseapp.com";
};

// Initialize Firebase only if properly configured
let app = null;
let auth = null;
let firebaseInitialized = false;

try {
  if (isFirebaseConfigured()) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    firebaseInitialized = true;
    console.log('Firebase initialized successfully');
  } else {
    console.warn('Firebase not configured. Using legacy authentication only.');
    console.warn('To enable Firebase:');
    console.warn('1. Create a .env file in the client directory');
    console.warn('2. Add your Firebase config values (see firebase/config.js for details)');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  console.warn('Falling back to legacy authentication');
}

// Export auth with error handling
export const getAuthInstance = () => {
  if (!firebaseInitialized) {
    throw new Error('Firebase is not configured. Please set up your Firebase credentials in .env file or firebase/config.js');
  }
  return auth;
};

export { auth, firebaseInitialized };
export default app;






