# Cloudflare Deployment Guide

## Current Status
✅ Wrangler CLI installed (v4.53.0)  
✅ Cloudflare account connected (HLPFL Co - 8c74a072236761cf6126371f0b20c5a9)  
✅ Project configured with account ID  
✅ Code pushed to GitHub repository  
❌ API Token needs additional permissions  

## Issue Identified
The API token is missing these required permissions:
- `User->User Details:Read`
- `User->Memberships:Read`

## Solutions

### Option 1: Fix API Token (Recommended)
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Find your token: LG5PPB1Fa45C5LAKZ0LV3jvw6nKVy6ruVFhEIfB2
3. Click "Edit" or "Update"
4. Add these permissions:
   - **User**: User Details:Read
   - **User**: Memberships:Read
   - **Account**: Cloudflare Workers:Edit
   - **Account**: Account Settings:Read
5. Save the token
6. Wait 2-3 minutes for permissions to propagate
7. Run the deployment command again

### Option 2: Create New API Token
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Select "Custom token"
4. Add these permissions:
   - **Account**: Cloudflare Workers:Edit
   - **Account**: Account Settings:Read
   - **User**: User Details:Read
   - **User**: Memberships:Read
5. Set "Account Resources" to "All accounts" or your specific account
6. Create the token
7. Use the new token for deployment

## Once Token is Fixed

### Deploy API to Workers
```bash
cd socialmediamanager/cloudflare
CLOUDFLARE_API_TOKEN=your-token-here wrangler deploy --env=""
```

### Deploy Frontend to Pages
```bash
cd socialmediamanager
CLOUDFLARE_API_TOKEN=your-token-here wrangler pages deploy public --project-name socialmediamanager-frontend
```

## Expected URLs After Deployment
- **API**: https://socialmediamanager-api.8c74a072236761cf6126371f0b20c5a9.workers.dev
- **Frontend**: https://socialmediamanager-frontend.pages.dev

## Environment Variables Setup
After deployment, set these in Cloudflare dashboard:
- MONGODB_URI
- REDIS_URL  
- JWT_SECRET
- TWITTER_API_KEY, TWITTER_API_SECRET, etc.
- LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET
- FACEBOOK_APP_ID, FACEBOOK_APP_SECRET

## Next Steps
1. Fix API token permissions
2. Deploy both API and frontend
3. Configure environment variables in Cloudflare dashboard
4. Test the deployed application
5. Set up custom domains if needed