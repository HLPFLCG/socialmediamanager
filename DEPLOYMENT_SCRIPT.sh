#!/bin/bash

echo "🚀 HLPFL Social Media Manager - Deployment Script"
echo "================================================"
echo ""

# Check if Cloudflare CLI is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Check if we're in the right directory
if [ ! -f "cloudflare/src/index.js" ]; then
    echo "❌ Please run this script from the socialmediamanager directory"
    exit 1
fi

echo "✅ Step 1: Setting up authentication..."
echo ""
echo "Please get your Cloudflare API token from:"
echo "https://dash.cloudflare.com/profile/api-tokens"
echo ""
echo "Required permissions:"
echo "- Account: Cloudflare D1:Edit"
echo "- Zone: Zone:Read"
echo "- Account: Account Settings:Read"
echo "- User: User Details:Read"
echo ""
read -p "Press Enter when you have your API token..."

echo ""
echo "✅ Step 2: Setting API token..."
echo "Run this command:"
echo "export CLOUDFLARE_API_TOKEN='your-token-here'"
echo ""
read -p "Press Enter after setting the token..."

echo ""
echo "✅ Step 3: Deploying backend..."
cd cloudflare
npx wrangler deploy --env production

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Backend deployed successfully!"
else
    echo ""
    echo "❌ Backend deployment failed. Please check your API token."
    exit 1
fi

echo ""
echo "✅ Step 4: Setting JWT Secret..."
echo "Please run these commands:"
echo ""
echo "# Generate a secure JWT secret:"
echo "openssl rand -base64 32"
echo ""
echo "# Set it in Cloudflare:"
echo "npx wrangler secret put JWT_SECRET --env production"
echo ""
echo "# Paste the generated secret when prompted"
echo ""

echo ""
echo "✅ Step 5: Testing deployment..."
echo "Testing health endpoint..."
curl https://socialmediamanager-api-production.hlpfl-co.workers.dev/api/health

echo ""
echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "====================="
echo ""
echo "Next steps:"
echo "1. Visit: https://hlpfl.space"
echo "2. Register a new account"
echo "3. Test all features"
echo ""
echo "If frontend doesn't update within 10 minutes, check Cloudflare Pages dashboard."
echo ""
echo "Documentation available in DEPLOYMENT_PERFECT.md"