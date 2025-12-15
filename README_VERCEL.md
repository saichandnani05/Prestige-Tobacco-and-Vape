# Vercel Deployment Guide

This guide explains how to deploy the Prestige Inventory Management System to Vercel.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. GitHub account with the repository pushed
3. Node.js installed locally (for testing)

## Deployment Steps

### 1. Connect Repository to Vercel

1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository: `saichandnani05/Prestige-Tobacco-and-Vape`
4. Vercel will automatically detect the project settings

### 2. Configure Environment Variables

In Vercel project settings, add the following environment variables:

**Required:**
- `JWT_SECRET` - Your JWT secret key (use a strong random string)
- `NODE_ENV` - Set to `production`

**Optional (if using Firebase):**
- `FIREBASE_PROJECT_ID` - Your Firebase project ID
- `FIREBASE_PRIVATE_KEY` - Your Firebase private key
- `FIREBASE_CLIENT_EMAIL` - Your Firebase client email

### 3. Build Settings

Vercel will automatically detect:
- **Framework Preset**: Other
- **Root Directory**: `./` (root)
- **Build Command**: `cd client && npm install && npm run build`
- **Output Directory**: `client/build`
- **Install Command**: `npm install && cd client && npm install`

### 4. Important Notes

#### Database
- SQLite database will be stored in `/tmp` directory on Vercel
- **Note**: `/tmp` is ephemeral - data will be lost on serverless function cold starts
- **Recommendation**: Use a cloud database (PostgreSQL, MongoDB, etc.) for production

#### API Routes
- All API routes are accessible at `/api/*`
- The Express server runs as Vercel serverless functions
- Routes are automatically configured in `vercel.json`

#### Frontend
- React app is built and served as static files
- All routes are handled by the React app (client-side routing)
- API calls use relative URLs (no proxy needed)

### 5. Deployment

1. Click "Deploy" in Vercel
2. Wait for the build to complete
3. Your app will be available at `https://your-project.vercel.app`

## Post-Deployment

### Database Migration
Since SQLite on Vercel is ephemeral, you should:
1. Set up a cloud database (recommended: PostgreSQL on Supabase, Railway, or Render)
2. Update `server/database.js` to use the cloud database
3. Run migrations to create tables

### Environment Variables
Make sure all environment variables are set in Vercel dashboard:
- Project Settings → Environment Variables

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### API Routes Not Working
- Check that `vercel.json` is correctly configured
- Verify API routes are in `/api` directory or configured in `vercel.json`
- Check server logs in Vercel dashboard

### Database Issues
- Remember that `/tmp` is ephemeral on Vercel
- Consider migrating to a cloud database for production use

### Firebase: Error (auth/unauthorized-domain)
This error occurs when your Vercel domain is not authorized in Firebase Console.

**To fix this:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (e.g., `prestige-vape`)
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Click **Add domain**
5. Add your Vercel domain(s):
   - `your-project.vercel.app` (your main Vercel domain)
   - `your-project-*.vercel.app` (preview deployments - optional)
   - Your custom domain if you have one
6. Click **Add**
7. Wait a few minutes for changes to propagate
8. Refresh your Vercel deployment

**Note:** By default, Firebase allows:
- `localhost` (for development)
- `*.firebaseapp.com` (Firebase hosting)

You must manually add Vercel domains for production use.

## Alternative: Separate Deployments

If you prefer to deploy frontend and backend separately:

1. **Frontend (Vercel)**:
   - Deploy only the `client` directory
   - Set `REACT_APP_API_URL` to your backend URL

2. **Backend (Railway/Render/Heroku)**:
   - Deploy the `server` directory
   - Use a persistent database
   - Update CORS settings to allow Vercel domain

## Support

For issues, check:
- Vercel documentation: https://vercel.com/docs
- Project README.md for local setup instructions
