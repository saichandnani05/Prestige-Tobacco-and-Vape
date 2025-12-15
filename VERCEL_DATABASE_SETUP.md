# Database Setup for Vercel Deployment

## Overview

Since Vercel uses serverless functions, SQLite databases stored in `/tmp` are **ephemeral** - they get cleared on cold starts. This guide explains how to export and initialize your database on Vercel.

## Option 1: Export and Include Database SQL File (Recommended for Small Databases)

### Step 1: Export Your Local Database

Run the export script to create a SQL dump file:

```bash
npm run export-db
```

This creates `server/database-export.sql` with all your data.

### Step 2: Include SQL File in Deployment

The SQL file will be included in your Git repository and deployed to Vercel. The database initialization code will automatically import it on first run.

### Step 3: Deploy to Vercel

When you deploy to Vercel:
1. The `database-export.sql` file will be included
2. On first API call, the database will be initialized from the SQL file
3. Data will persist during the serverless function's warm period

**Note:** Data will still be lost on cold starts, but will be re-imported automatically.

## Option 2: Use a Cloud Database (Recommended for Production)

For production use, migrate to a cloud database service:

### Recommended Services:
- **Supabase** (PostgreSQL) - Free tier available
- **Railway** (PostgreSQL/MySQL) - Easy setup
- **PlanetScale** (MySQL) - Serverless MySQL
- **MongoDB Atlas** (MongoDB) - Free tier available

### Migration Steps:

1. **Set up cloud database** on your chosen service
2. **Update `server/database.js`** to use the cloud database connection
3. **Export and import data** from SQLite to the cloud database
4. **Update environment variables** in Vercel with database connection strings

## Option 3: Initialize Database on Each Request (Not Recommended)

You can initialize the database on each serverless function invocation, but this adds latency to every request.

## Current Implementation

The current setup:
- ✅ Automatically detects if `database-export.sql` exists
- ✅ Imports data on Vercel if SQL file is present
- ✅ Falls back to creating a fresh database with default admin user
- ✅ Uses `/tmp` directory on Vercel (ephemeral)

## Exporting Your Database

To export your current database:

```bash
npm run export-db
```

This will create `server/database-export.sql` with:
- All table schemas
- All user data
- All inventory items
- All sales records

## Importing Database

To import a database SQL file:

```bash
npm run import-db [path-to-sql-file]
```

Or use the default export file:

```bash
npm run import-db
```

## Seeding Database for Vercel

To seed a fresh database (useful for testing):

```bash
npm run seed-vercel
```

## Important Notes

### ⚠️ Limitations of SQLite on Vercel:

1. **Ephemeral Storage**: `/tmp` is cleared on cold starts
2. **No Persistence**: Data doesn't persist between deployments
3. **Concurrent Writes**: SQLite doesn't handle concurrent writes well
4. **File Size Limits**: Large databases may hit Vercel's limits

### ✅ Best Practices:

1. **Use Cloud Database for Production**: Migrate to PostgreSQL/MySQL
2. **Export Regularly**: Keep `database-export.sql` updated
3. **Version Control**: Commit the SQL export file to Git
4. **Backup Strategy**: Regular backups of your cloud database

## Migration to Cloud Database Example

### Using Supabase (PostgreSQL):

1. Create a Supabase project
2. Get connection string
3. Install PostgreSQL client: `npm install pg`
4. Update `server/database.js` to use PostgreSQL
5. Migrate data using export/import scripts

### Using MongoDB Atlas:

1. Create MongoDB Atlas cluster
2. Get connection string
3. Install MongoDB driver: `npm install mongodb`
4. Update `server/database.js` to use MongoDB
5. Migrate data

## Troubleshooting

### Database Not Persisting on Vercel

- Check that `database-export.sql` is included in deployment
- Verify the file is in the `server/` directory
- Check Vercel build logs for import errors

### Import Errors

- Verify SQL file syntax
- Check file encoding (should be UTF-8)
- Ensure all required tables exist

### Performance Issues

- Consider migrating to a cloud database
- Optimize SQL queries
- Use connection pooling for cloud databases

## Next Steps

1. **Export your database**: `npm run export-db`
2. **Commit the SQL file**: `git add server/database-export.sql && git commit -m "Add database export"`
3. **Deploy to Vercel**: The database will auto-import on first run
4. **Consider migration**: Plan migration to cloud database for production
