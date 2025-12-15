# Firebase Setup for Vercel Deployment

## Fix: Firebase Error (auth/unauthorized-domain)

If you're seeing the error `Firebase: Error (auth/unauthorized-domain)` after deploying to Vercel, your Vercel domain needs to be authorized in Firebase Console.

## Step-by-Step Fix

### 1. Get Your Vercel Domain

After deploying to Vercel, you'll have a domain like:
- `your-project.vercel.app` (main domain)
- Or your custom domain if configured

### 2. Add Domain to Firebase

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Sign in with your Google account

2. **Select Your Project**
   - Click on your Firebase project (e.g., `prestige-vape`)

3. **Navigate to Authentication Settings**
   - Click **Authentication** in the left sidebar
   - Click the **Settings** tab
   - Scroll down to **Authorized domains**

4. **Add Your Vercel Domain**
   - Click **Add domain** button
   - Enter your Vercel domain (e.g., `your-project.vercel.app`)
   - Click **Add**

5. **Add Preview Domains (Optional)**
   - Vercel creates preview deployments with random subdomains
   - If you want preview deployments to work, you can add:
     - `*.vercel.app` (wildcard for all Vercel previews)
   - Or add specific preview domains as needed

6. **Wait for Propagation**
   - Changes may take 1-5 minutes to propagate
   - Refresh your Vercel deployment after adding the domain

### 3. Verify the Fix

1. Go to your Vercel deployment URL
2. Try to sign in with Firebase authentication
3. The error should be resolved

## Default Authorized Domains

Firebase automatically authorizes:
- ✅ `localhost` (for local development)
- ✅ `*.firebaseapp.com` (Firebase hosting domains)

You must manually add:
- ❌ Vercel domains (`*.vercel.app`)
- ❌ Custom domains
- ❌ Other hosting platforms

## Example: Authorized Domains List

After setup, your authorized domains should look like:

```
Authorized domains:
✓ localhost
✓ prestige-vape.firebaseapp.com
✓ your-project.vercel.app          ← Your Vercel domain
✓ *.vercel.app                      ← Optional: for preview deployments
```

## Troubleshooting

### Still Getting the Error?

1. **Check Domain Spelling**
   - Make sure you entered the exact domain (case-sensitive)
   - Include the full domain: `your-project.vercel.app` (not just `vercel.app`)

2. **Wait Longer**
   - Firebase changes can take up to 5 minutes to propagate
   - Clear your browser cache and try again

3. **Check Firebase Project**
   - Ensure you're adding the domain to the correct Firebase project
   - Verify your Firebase config in `client/src/firebase/config.js` matches the project

4. **Check Vercel URL**
   - Make sure you're using the correct Vercel deployment URL
   - Check Vercel dashboard for the exact domain

### For Multiple Environments

If you have multiple Vercel deployments (production, staging, etc.):

1. Add each domain individually, OR
2. Use a wildcard `*.vercel.app` to cover all Vercel preview deployments

## Additional Resources

- [Firebase Documentation: Authorized Domains](https://firebase.google.com/docs/auth/web/domain-whitelisting)
- [Vercel Documentation: Custom Domains](https://vercel.com/docs/concepts/projects/domains)

