#!/bin/bash
# Script to push database to Vercel
# Usage: ./push-data.sh YOUR_DATABASE_PASSWORD

if [ -z "$1" ]; then
  echo "❌ Error: Database password required"
  echo "Usage: ./push-data.sh YOUR_DATABASE_PASSWORD"
  echo ""
  echo "Or set DATABASE_URL manually:"
  echo "export DATABASE_URL='postgresql://postgres:YOUR_PASSWORD@db.ewxrxmyxvohwggovnqyb.supabase.co:5432/postgres'"
  echo "npm run push-to-vercel"
  exit 1
fi

PASSWORD="$1"
DATABASE_URL="postgresql://postgres:${PASSWORD}@db.ewxrxmyxvohwggovnqyb.supabase.co:5432/postgres"

echo "🚀 Pushing data to Vercel database..."
echo "📍 Database: db.ewxrxmyxvohwggovnqyb.supabase.co"
echo ""

export DATABASE_URL
npm run push-to-vercel
