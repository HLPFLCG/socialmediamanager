#!/bin/bash

echo "🚀 Social Media Manager - Authentication Fix Deployment"
echo "=================================================="

# Check if Cloudflare API token is set
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ CLOUDFLARE_API_TOKEN environment variable is not set"
    echo ""
    echo "Please set it first:"
    echo "export CLOUDFLARE_API_TOKEN=your_token_here"
    echo ""
    echo "Or get a token from: https://dash.cloudflare.com/profile/api-tokens"
    exit 1
fi

echo "✅ Cloudflare API token found"

# Navigate to cloudflare directory
cd cloudflare

echo "📦 Installing dependencies..."
npm install

echo "🚀 Deploying to Cloudflare Workers..."
npx wrangler deploy --env production

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "🧪 Testing the fix..."
    echo "curl -X POST https://socialmediamanager-api-production.hlpfl-co.workers.dev/api/auth/register \&quot;
    echo "  -H &quot;Content-Type: application/json&quot; \&quot;
    echo "  -d '{&quot;name&quot;:&quot;Test User&quot;,&quot;email&quot;:&quot;test@example.com&quot;,&quot;password&quot;:&quot;test123456&quot;}'"
    echo ""
    echo "Visit https://hlpfl.space to test the login functionality!"
else
    echo ""
    echo "❌ Deployment failed. Please check the error above."
    exit 1
fi