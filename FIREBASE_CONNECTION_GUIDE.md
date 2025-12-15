# 🔥 Firebase Authentication Connection Guide

## Step-by-Step Setup Instructions

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or select an existing project
3. Enter a project name (e.g., "Prestige Inventory")
4. Follow the setup wizard (you can skip Google Analytics for now)
5. Click **"Create project"**

### Step 2: Enable Authentication

1. In your Firebase project, click **"Authentication"** in the left sidebar
2. Click **"Get started"** if you see it
3. Go to the **"Sign-in method"** tab
4. Enable the following providers:

   **Email/Password:**
   - Click on "Email/Password"
   - Toggle **"Enable"** to ON
   - Click **"Save"**

   **Google:**
   - Click on "Google"
   - Toggle **"Enable"** to ON
   - Enter a project support email (your email)
   - Click **"Save"**

   **Apple (Optional):**
   - Click on "Apple"
   - Toggle **"Enable"** to ON
   - Configure if needed (requires Apple Developer account)
   - Click **"Save"**

### Step 3: Get Your Firebase Configuration

1. In Firebase Console, click the **gear icon ⚙️** next to "Project Overview"
2. Select **"Project settings"**
3. Scroll down to **"Your apps"** section
4. If you don't have a web app yet:
   - Click the **web icon `</>`**
   - Register your app with a nickname (e.g., "Prestige Inventory Web")
   - Click **"Register app"**
5. You'll see your Firebase configuration object. It looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

### Step 4: Create Environment File

1. In your project, navigate to the `client` directory
2. Create a file named `.env` (no extension, starts with a dot)
3. Copy the following template and fill in your values:

```env
REACT_APP_FIREBASE_API_KEY=AIzaSyC...
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

**Important:** Replace all the placeholder values with your actual Firebase config values!

### Step 5: Configure Server-Side (Optional but Recommended)

1. In the root directory, create or update `.env` file
2. Add your Firebase API key:

```env
FIREBASE_API_KEY=AIzaSyC...
FIREBASE_PROJECT_ID=your-project-id
JWT_SECRET=your-secret-key-change-this
PORT=5001
```

### Step 6: Restart Your Development Server

1. Stop your current server (Ctrl+C)
2. Restart the client:
   ```bash
   cd client
   npm start
   ```

3. Restart the server (in a new terminal):
   ```bash
   npm run dev
   ```

### Step 7: Verify Connection

1. Open your app in the browser
2. Go to the Register or Login page
3. You should see:
   - ✅ Google sign-in button (if enabled)
   - ✅ Apple sign-in button (if enabled)
   - ✅ No warning messages about Firebase
4. Try registering with email/password
5. Try signing in with Google (if enabled)

## Troubleshooting

### Issue: "Firebase API key is invalid"

**Solution:**
- Double-check your `.env` file is in the `client` directory
- Make sure all values start with `REACT_APP_`
- Verify you copied the correct values from Firebase Console
- Restart your development server completely

### Issue: "Firebase not configured" warning still shows

**Solution:**
- Make sure the `.env` file is in `client/.env` (not root)
- Check that environment variables are correct
- Restart the development server
- Clear browser cache and reload

### Issue: Google/Apple sign-in doesn't work

**Solution:**
- Verify the providers are enabled in Firebase Console
- Check browser console for errors
- Make sure popups are not blocked
- Verify your Firebase project is active

### Issue: Can't find Firebase Console

**Solution:**
- Go to: https://console.firebase.google.com/
- Make sure you're logged in with your Google account
- Create a new project if you don't have one

## Quick Reference

### File Locations:
- Client `.env`: `/client/.env`
- Server `.env`: `/.env` (root directory)
- Firebase config: `/client/src/firebase/config.js`

### Required Environment Variables (Client):
```
REACT_APP_FIREBASE_API_KEY
REACT_APP_FIREBASE_AUTH_DOMAIN
REACT_APP_FIREBASE_PROJECT_ID
REACT_APP_FIREBASE_STORAGE_BUCKET
REACT_APP_FIREBASE_MESSAGING_SENDER_ID
REACT_APP_FIREBASE_APP_ID
```

### Required Environment Variables (Server):
```
FIREBASE_API_KEY
FIREBASE_PROJECT_ID
JWT_SECRET
PORT
```

## Need Help?

- Firebase Documentation: https://firebase.google.com/docs/auth
- Firebase Console: https://console.firebase.google.com/
- Check the browser console for detailed error messages







