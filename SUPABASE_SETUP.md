# Supabase Database Setup for Vercel

This guide will help you set up a secure PostgreSQL database using Supabase and connect it to your Vercel deployment.

## Why Supabase?

- ✅ **Free Tier**: 500MB database, 2GB bandwidth
- ✅ **PostgreSQL**: Industry-standard relational database
- ✅ **Secure**: Built-in authentication and row-level security
- ✅ **Easy Setup**: Simple connection string
- ✅ **Vercel Integration**: Works seamlessly with serverless functions

## Step 1: Create Supabase Project

1. Go to [Supabase](https://supabase.com)
2. Sign up or log in
3. Click **"New Project"**
4. Fill in:
   - **Name**: `prestige-inventory` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
5. Click **"Create new project"**
6. Wait 2-3 minutes for project to initialize

## Step 2: Get Database Connection String

1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Scroll down to **"Connection string"**
3. Select **"URI"** tab
4. Copy the connection string (it looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your actual database password

## Step 3: Configure Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

   **For Production:**
   - **Name**: `DATABASE_URL`
   - **Value**: Your Supabase connection string
   - **Environment**: Production

   **For Preview/Development (optional):**
   - Add the same `DATABASE_URL` for Preview and Development environments

4. Click **"Save"**

## Step 4: Migrate Your Data

### Option A: Using Migration Script (Recommended)

1. Install PostgreSQL client locally:
   ```bash
   npm install pg
   ```

2. Set your DATABASE_URL:
   ```bash
   export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
   ```

3. Run migration:
   ```bash
   node server/scripts/migrate-to-postgres.js
   ```

### Option B: Manual Migration

1. Export your SQLite database:
   ```bash
   npm run export-db
   ```

2. In Supabase dashboard, go to **SQL Editor**
3. Copy contents of `server/database-export.sql`
4. Paste and run in SQL Editor
5. Adjust SQL syntax for PostgreSQL if needed

## Step 5: Update Server Code

Update `server/index.js` to use PostgreSQL:

```javascript
// Change this line:
const db = require('./database');

// To this:
const db = require('./database-postgres');
```

Or create a conditional:

```javascript
const db = process.env.DATABASE_URL 
  ? require('./database-postgres')
  : require('./database');
```

## Step 6: Deploy to Vercel

1. Commit your changes:
   ```bash
   git add .
   git commit -m "Add PostgreSQL support with Supabase"
   git push origin main
   ```

2. Vercel will automatically deploy
3. Check deployment logs to verify database connection

## Step 7: Verify Connection

1. Make an API call to your Vercel deployment
2. Check Vercel function logs for:
   - `✅ Connected to PostgreSQL database`
3. Test login functionality
4. Verify data is accessible

## Security Best Practices

### 1. Connection String Security

- ✅ **Never commit** `DATABASE_URL` to Git
- ✅ Use Vercel environment variables
- ✅ Rotate passwords regularly
- ✅ Use different databases for dev/staging/production

### 2. Database Access

- ✅ Enable **Row Level Security (RLS)** in Supabase
- ✅ Use connection pooling (already configured)
- ✅ Set up IP allowlist if needed
- ✅ Monitor connection usage

### 3. Password Management

- ✅ Use strong passwords (16+ characters)
- ✅ Store passwords in password manager
- ✅ Rotate passwords every 90 days
- ✅ Use different passwords for each environment

## Troubleshooting

### Connection Errors

**Error: "Connection refused"**
- Check DATABASE_URL is correct
- Verify Supabase project is active
- Check firewall/network settings

**Error: "password authentication failed"**
- Verify password in connection string
- Reset database password in Supabase dashboard
- Update DATABASE_URL in Vercel

### Migration Issues

**Error: "relation already exists"**
- Tables already exist, migration partially completed
- Drop tables in Supabase SQL Editor if starting fresh
- Or use `ON CONFLICT` handling in migration script

### Performance Issues

**Slow queries:**
- Add indexes (already included in migration)
- Use connection pooling (already configured)
- Monitor query performance in Supabase dashboard

## Alternative Database Services

If Supabase doesn't work for you, consider:

1. **PlanetScale** (MySQL)
   - Serverless MySQL
   - Free tier available
   - Easy scaling

2. **Railway** (PostgreSQL/MySQL)
   - Simple setup
   - Pay-as-you-go pricing
   - Good for small projects

3. **MongoDB Atlas** (MongoDB)
   - NoSQL database
   - Free tier available
   - Good for flexible schemas

4. **Neon** (PostgreSQL)
   - Serverless PostgreSQL
   - Free tier available
   - Auto-scaling

## Next Steps

1. ✅ Set up Supabase project
2. ✅ Add DATABASE_URL to Vercel
3. ✅ Run migration script
4. ✅ Update server code
5. ✅ Deploy and test
6. ✅ Monitor usage and performance

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
