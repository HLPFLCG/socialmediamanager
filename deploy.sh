#!/bin/bash

echo "🚀 Deploying Clean Social Media Manager to Cloudflare"

# Check if we're in the right directory
if [ ! -f "cloudflare/src/index.js" ]; then
    echo "❌ Error: Please run this script from the socialmediamanager directory"
    exit 1
fi

# Navigate to cloudflare directory
cd cloudflare

echo "📡 Logging into Cloudflare..."
npx wrangler login

echo "🔧 Setting JWT secret..."
echo "Please enter a secure JWT secret when prompted:"
npx wrangler secret put JWT_SECRET --env production

echo "🚀 Deploying backend to production..."
npx wrangler deploy --env production

echo "✅ Backend deployed!"
echo "🌐 Testing health check..."

sleep 2

# Test the deployment
HEALTH_CHECK=$(curl -s https://socialmediamanager-api-production.hlpfl-co.workers.dev/api/health)

if [[ $HEALTH_CHECK == *"ok"* ]]; then
    echo "✅ Backend is healthy!"
else
    echo "❌ Backend health check failed"
    echo "Response: $HEALTH_CHECK"
fi

echo "🎯 Frontend should auto-deploy via Cloudflare Pages"
echo "🌐 Visit: https://hlpfl.space"
echo "📊 Backend API: https://socialmediamanager-api-production.hlpfl-co.workers.dev"

echo ""
echo "🎉 Deployment complete! Test the login functionality at https://hlpfl.space"