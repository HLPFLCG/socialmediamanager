# Manual Deployment Guide

## Quick Fix Deployment

Since the API token is having permission issues, here's a manual approach:

### Option 1: Use Cloudflare Dashboard (Recommended)

1. **Go to Cloudflare Workers Dashboard**
   - Visit: https://dash.cloudflare.com/workers
   - Click on "Workers & Pages"

2. **Find Your Worker**
   - Look for `socialmediamanager-api-production` 
   - Click on it

3. **Update the Code**
   - Click "Edit code"
   - Replace ALL content with the code from `cloudflare/src/index.js`
   - Click "Save and Deploy"

### Option 2: Fix Token Permissions

Your token needs these exact permissions:
```
Account: Cloudflare D1:Edit
Account: Account Settings:Read  
User: User Details:Read
Zone: Zone:Read (if needed)
```

### Option 3: Create New Token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use "Custom token"
4. Set permissions exactly as above
5. Copy new token and redeploy with:
```bash
export CLOUDFLARE_API_TOKEN=new_token_here
./deploy-fix.sh
```

## Test After Deployment

```bash
curl -X POST https://socialmediamanager-api-production.hlpfl-co.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"test123456"}'
```

Expected response should include a JWT token and user data (not an error).

## Verify Login Works

Visit https://hlpfl.space and try registering/logging in.

The manual deployment (Option 1) is the fastest fix!