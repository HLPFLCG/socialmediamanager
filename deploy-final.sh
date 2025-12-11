#!/bin/bash
# Final deployment script with API key
export CLOUDFLARE_API_TOKEN="social_media_api_key"
cd /workspace/socialmediamanager/cloudflare
echo "🚀 Deploying with API key..."
npx wrangler deploy