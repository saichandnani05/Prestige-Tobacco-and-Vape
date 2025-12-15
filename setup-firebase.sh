#!/bin/bash

# Firebase Setup Helper Script
# This script helps you set up Firebase authentication

echo "🔥 Firebase Authentication Setup"
echo "================================"
echo ""

# Check if .env file exists in client directory
if [ -f "client/.env" ]; then
    echo "⚠️  Found existing client/.env file"
    read -p "Do you want to overwrite it? (y/n): " overwrite
    if [ "$overwrite" != "y" ]; then
        echo "Keeping existing .env file"
        exit 0
    fi
fi

echo ""
echo "📋 Please provide your Firebase configuration:"
echo "(Get these from: https://console.firebase.google.com/ > Project Settings > Your apps)"
echo ""

read -p "Firebase API Key: " api_key
read -p "Firebase Auth Domain: " auth_domain
read -p "Firebase Project ID: " project_id
read -p "Firebase Storage Bucket: " storage_bucket
read -p "Firebase Messaging Sender ID: " messaging_sender_id
read -p "Firebase App ID: " app_id

# Create .env file
cat > client/.env << EOF
# Firebase Configuration
# Generated on $(date)

REACT_APP_FIREBASE_API_KEY=$api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=$auth_domain
REACT_APP_FIREBASE_PROJECT_ID=$project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=$storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=$messaging_sender_id
REACT_APP_FIREBASE_APP_ID=$app_id
EOF

echo ""
echo "✅ Created client/.env file!"
echo ""
echo "📝 Next steps:"
echo "1. Make sure Authentication is enabled in Firebase Console"
echo "2. Enable Email/Password and Google sign-in methods"
echo "3. Restart your development server:"
echo "   cd client && npm start"
echo ""
echo "🎉 Setup complete!"







