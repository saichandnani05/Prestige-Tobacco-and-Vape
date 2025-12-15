# ⚡ Quick Firebase Setup (5 Minutes)

## 🎯 Fast Track Setup

### 1️⃣ Create Firebase Project (2 min)
- Visit: https://console.firebase.google.com/
- Click **"Add project"**
- Name it: **"Prestige Inventory"**
- Click through the setup (skip Analytics)
- Click **"Create project"**

### 2️⃣ Enable Authentication (1 min)
- Click **"Authentication"** → **"Get started"**
- Go to **"Sign-in method"** tab
- Enable **"Email/Password"** → Toggle ON → Save
- Enable **"Google"** → Toggle ON → Save (enter your email)

### 3️⃣ Get Config (1 min)
- Click **⚙️ Settings** → **Project settings**
- Scroll to **"Your apps"**
- Click **web icon `</>`**
- Click **"Register app"**
- **Copy the config values** (you'll see them on screen)

### 4️⃣ Create .env File (30 sec)
In `client` directory, create `.env` file:

```bash
cd client
touch .env
```

Paste this (replace with YOUR values from step 3):

```env
REACT_APP_FIREBASE_API_KEY=AIzaSy...
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abcdef
```

### 5️⃣ Restart Server (30 sec)
```bash
# Stop current server (Ctrl+C)
# Then restart:
cd client
npm start
```

## ✅ Done!

Now you can:
- ✅ Sign up with email/password
- ✅ Sign in with Google
- ✅ All authentication works!

## 🆘 Still Not Working?

1. Check `.env` file is in `client/` directory (not root)
2. Verify all values start with `REACT_APP_`
3. Make sure you copied the EXACT values from Firebase
4. Restart server completely (close terminal and reopen)
5. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)

## 📝 Need More Help?

See `FIREBASE_CONNECTION_GUIDE.md` for detailed instructions.






