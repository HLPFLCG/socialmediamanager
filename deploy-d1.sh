#!/bin/bash

# D1 Migration Deployment Script
echo "🚀 Starting D1 Migration Deployment..."

# Set API token
export CLOUDFLARE_API_TOKEN="GfWsolKGpuxaMhvJJoPJ8qwATA55dv72GGek0MZi"

# Navigate to cloudflare directory
cd cloudflare

echo "📦 Installing dependencies..."
npm install

echo "🗄️ Deploying D1 schema to remote database..."
npx wrangler d1 execute socialmediamanager-db --file=schema.sql --remote

echo "⚡ Deploying updated Workers to production..."
npx wrangler deploy

echo "🧪 Testing deployment..."
echo "Health check:"
curl -s https://api.hlpfl.space/api/health

echo ""
echo "Database status:"
curl -s https://api.hlpfl.space/api/db/status

echo ""
echo "✅ Deployment complete!"
echo "Visit https://hlpfl.space to test your social media manager"