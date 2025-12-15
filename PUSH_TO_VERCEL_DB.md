# Push Database to Vercel

This guide explains how to push all data from your local SQLite database to your Vercel PostgreSQL database.

## Prerequisites

1. **Supabase/PostgreSQL Database Set Up**
   - You need a PostgreSQL database (Supabase recommended)
   - Get your connection string from Supabase dashboard

2. **Environment Variable**
   - Your `DATABASE_URL` should be set in Vercel
   - Or set it locally for the migration script

## Step-by-Step Instructions

### Step 1: Get Your Database Connection String

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **Database**
4. Copy the **Connection string** (URI format)
   - Format: `postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres`
   - Replace `[PASSWORD]` with your actual database password

### Step 2: Set Environment Variable

**Option A: Set locally (for running the script)**
```bash
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
```

**Option B: Use Vercel's DATABASE_URL**
- If you've already set `DATABASE_URL` in Vercel, you can use that same value locally

### Step 3: Run the Push Script

```bash
npm run push-to-vercel
```

Or directly:
```bash
node server/scripts/push-to-vercel-db.js
```

### Step 4: Verify the Data

After the script completes, verify your data:

1. Go to Supabase Dashboard → **Table Editor**
2. Check the tables:
   - `users` - Should have all your users
   - `inventory_items` - Should have all inventory items
   - `sales` - Should have all sales records

## What the Script Does

1. ✅ Connects to local SQLite database
2. ✅ Connects to Vercel PostgreSQL database
3. ✅ Reads all data from SQLite (users, inventory_items, sales)
4. ✅ Pushes all data to PostgreSQL using `ON CONFLICT` (upsert)
5. ✅ Resets sequences to match SQLite IDs
6. ✅ Commits transaction (all or nothing)

## Features

- **Upsert Logic**: Uses `ON CONFLICT DO UPDATE` to handle existing records
- **ID Preservation**: Maintains the same IDs from SQLite
- **Sequence Reset**: Ensures auto-increment continues from correct number
- **Transaction Safety**: All data is pushed in a transaction (rollback on error)
- **Progress Reporting**: Shows progress for each table

## Troubleshooting

### Error: "DATABASE_URL environment variable is required"

**Solution**: Set the DATABASE_URL environment variable:
```bash
export DATABASE_URL="your-connection-string"
```

### Error: "SQLite database not found"

**Solution**: Make sure `server/inventory.db` exists. If not, the database will be created on first run.

### Error: Connection refused / Authentication failed

**Solution**: 
- Verify your connection string is correct
- Check that your Supabase database is active
- Ensure password is correct (no special characters need URL encoding)

### Error: Foreign key constraint violation

**Solution**: The script pushes data in the correct order (users → inventory → sales) to avoid this. If it still occurs, check that user IDs referenced in inventory_items and sales exist.

## After Pushing Data

Once data is pushed:

1. ✅ Your Vercel deployment will automatically use PostgreSQL
2. ✅ All your data will be available in production
3. ✅ Future data will be stored in PostgreSQL
4. ✅ Local SQLite database remains unchanged (backup)

## Important Notes

- ⚠️ **Backup First**: Consider backing up your PostgreSQL database before running
- ⚠️ **Test First**: Test with a small dataset if possible
- ⚠️ **One-Way**: This pushes FROM SQLite TO PostgreSQL (not bidirectional)
- ⚠️ **ID Conflicts**: If PostgreSQL already has data, IDs will be updated/merged

## Next Steps

After pushing data:

1. Verify data in Supabase dashboard
2. Test your Vercel deployment
3. Ensure `DATABASE_URL` is set in Vercel environment variables
4. Your app will now use PostgreSQL on Vercel!
