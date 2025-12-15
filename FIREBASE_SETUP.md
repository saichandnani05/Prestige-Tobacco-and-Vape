# Firebase Setup Guide

## Quick Fix for "API Key Not Valid" Error

If you're seeing the error: `Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.)`, follow these steps:

## Option 1: Configure Firebase (Recommended)

### Step 1: Get Your Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Click on the gear icon ⚙️ next to "Project Overview"
4. Select "Project settings"
5. Scroll down to "Your apps" section
6. Click the web icon `</>` to add a web app
7. Register your app with a nickname (e.g., "Prestige Inventory")
8. Copy the Firebase configuration object

### Step 2: Create Environment File

Create a file named `.env` in the `client` directory with the following content:

```env
REACT_APP_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

Replace the values with your actual Firebase configuration values.

### Step 3: Enable Authentication Providers

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable the following providers:
   - **Email/Password** - Click "Enable" and save
   - **Google** - Click "Enable" and save (no additional setup needed)
   - **Apple** - Click "Enable" and configure if needed (requires Apple Developer account)

### Step 4: Restart Your Development Server

After creating the `.env` file:

```bash
# Stop your current server (Ctrl+C)
# Then restart:
cd client
npm start
```

## Option 2: Use Legacy Authentication (No Firebase)

If you don't want to set up Firebase right now, the app will automatically use legacy authentication:

- **Login with username/password** (e.g., admin/admin123)
- Google and Apple sign-in buttons will be hidden
- All other features work normally

## Troubleshooting

### Error persists after adding .env file?

1. Make sure the `.env` file is in the `client` directory (not the root)
2. Restart your development server completely
3. Check that all environment variables start with `REACT_APP_`
4. Verify your Firebase API key is correct in Firebase Console

### Still having issues?

1. Check the browser console for detailed error messages
2. Verify your Firebase project has Authentication enabled
3. Make sure you've enabled the sign-in methods you want to use
4. Check that your Firebase project is not on the Blaze (paid) plan if you're using the free tier

## Example Firebase Config Values

Your Firebase config should look something like this (from Firebase Console):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",  // Your actual API key
  authDomain: "myproject.firebaseapp.com",
  projectId: "myproject-12345",
  storageBucket: "myproject-12345.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

Copy these exact values into your `.env` file.

## Need Help?

- Check the main README.md for more setup instructions
- Firebase Documentation: https://firebase.google.com/docs
- Firebase Console: https://console.firebase.google.com/







