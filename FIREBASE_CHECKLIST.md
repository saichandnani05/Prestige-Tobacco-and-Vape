# ✅ Firebase Connection Checklist

Use this checklist to ensure Firebase is properly connected:

## Pre-Setup
- [ ] Have a Google account (for Firebase Console access)
- [ ] Node.js and npm installed
- [ ] Project dependencies installed (`npm install` and `cd client && npm install`)

## Firebase Console Setup
- [ ] Created a Firebase project at https://console.firebase.google.com/
- [ ] Project is active and ready
- [ ] Navigated to Authentication section
- [ ] Enabled "Email/Password" sign-in method
- [ ] Enabled "Google" sign-in method
- [ ] (Optional) Enabled "Apple" sign-in method

## Get Configuration
- [ ] Opened Project Settings (gear icon ⚙️)
- [ ] Scrolled to "Your apps" section
- [ ] Added a web app (clicked `</>` icon)
- [ ] Registered the app with a nickname
- [ ] Copied all 6 configuration values:
  - [ ] apiKey
  - [ ] authDomain
  - [ ] projectId
  - [ ] storageBucket
  - [ ] messagingSenderId
  - [ ] appId

## Environment File Setup
- [ ] Created `client/.env` file
- [ ] Added all 6 REACT_APP_ variables
- [ ] Verified all values are correct (no typos)
- [ ] No quotes around values in .env file
- [ ] File is in `client/` directory (not root)

## Server Configuration (Optional)
- [ ] Created `.env` file in root directory
- [ ] Added FIREBASE_API_KEY
- [ ] Added FIREBASE_PROJECT_ID
- [ ] Added JWT_SECRET
- [ ] Added PORT=5001

## Testing
- [ ] Restarted development server completely
- [ ] Opened app in browser
- [ ] No "Firebase not configured" warning
- [ ] Google sign-in button is visible (if enabled)
- [ ] Can register with email/password
- [ ] Can login with email/password
- [ ] Can sign in with Google (if enabled)
- [ ] User is created in Firebase Console > Authentication > Users

## Troubleshooting Checklist
If something doesn't work:

- [ ] Checked browser console for errors
- [ ] Verified .env file location (must be in `client/` directory)
- [ ] Verified all environment variables start with `REACT_APP_`
- [ ] Restarted server completely (closed terminal and reopened)
- [ ] Cleared browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- [ ] Verified Firebase project is active
- [ ] Checked that sign-in methods are enabled in Firebase Console
- [ ] Verified API key is correct (no extra spaces or characters)

## Success Indicators
✅ No warning messages on login/register pages
✅ Google/Apple buttons visible (if enabled)
✅ Can create account successfully
✅ Can login successfully
✅ User appears in Firebase Console > Authentication > Users

---

**Need help?** Check:
- [QUICK_FIREBASE_SETUP.md](./QUICK_FIREBASE_SETUP.md) - 5 minute quick guide
- [FIREBASE_CONNECTION_GUIDE.md](./FIREBASE_CONNECTION_GUIDE.md) - Detailed instructions
- Browser console for error messages
- Firebase Console for user management







