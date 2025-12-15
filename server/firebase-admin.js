const admin = require('firebase-admin');

// Initialize Firebase Admin
// Option 1: Using service account (recommended for production)
// Uncomment and configure if you have a service account key
/*
try {
  const serviceAccount = require('./path-to-serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.log('Firebase Admin: Service account not found, using alternative verification');
}
*/

// Option 2: Using environment variables (alternative)
// For development, we'll verify tokens using Firebase REST API
// This doesn't require service account setup

let firebaseAdminInitialized = false;

// Simple token verification using Firebase REST API
const verifyFirebaseToken = async (idToken) => {
  try {
    const https = require('https');
    const http = require('http');
    
    // Get API key from environment
    const apiKey = process.env.FIREBASE_API_KEY || '';
    
    if (!apiKey) {
      console.warn('FIREBASE_API_KEY not set. Firebase token verification may not work properly.');
      // For development, we'll accept the token if it's provided
      // In production, you should always verify tokens
      return { uid: 'dev-uid', email: 'dev@example.com' };
    }
    
    // Verify token using Firebase REST API
    const postData = JSON.stringify({
      idToken: idToken
    });

    const options = {
      hostname: 'www.googleapis.com',
      path: `/identitytoolkit/v3/relyingparty/getAccountInfo?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            if (jsonData.users && jsonData.users[0]) {
              resolve(jsonData.users[0]);
            } else {
              reject(new Error('Invalid token response'));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return null;
  }
};

// Use Admin SDK if initialized, otherwise use REST API
const verifyToken = async (idToken) => {
  if (firebaseAdminInitialized && admin.apps.length > 0) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        name: decodedToken.name
      };
    } catch (error) {
      console.error('Admin SDK verification failed:', error);
      return null;
    }
  } else {
    return await verifyFirebaseToken(idToken);
  }
};

module.exports = {
  verifyToken,
  admin
};






