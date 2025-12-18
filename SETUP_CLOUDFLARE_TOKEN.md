# Cloudflare API Token Setup Guide

## Step 1: Create Cloudflare API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click on your profile in the top right corner → "My Profile"
3. Go to "API Tokens" tab
4. Click "Create Token"

## Step 2: Configure Token Permissions

Use the "Custom token" option with these settings:

**Token Name:** `socialmediamanager-deploy`

**Account Permissions:**
- Account: `Cloudflare D1:Edit`
- Account: `Account Settings:Read`
- User: `User Details:Read`
- Zone: `Zone:Read` (optional, for domain management)
- Zone: `Zone Resources:Include All zones` (if zone access needed)

**Account Resources:**
- Include: `All accounts`

**TTL:** Leave as default

## Step 3: Copy the Token

After creating, copy the token immediately (you won't see it again).

## Step 4: Set Environment Variable

### Option A: Temporary (for current session)
```bash
export CLOUDFLARE_API_TOKEN=your_token_here
```

### Option B: Set as GitHub Secret (Recommended)
```bash
gh secret set CLOUDFLARE_API_TOKEN --body="your_token_here"
```

## Step 5: Deploy the Backend

```bash
cd socialmediamanager/cloudflare
npx wrangler deploy --env production
```

## Troubleshooting

If you get permission errors, ensure:
1. Token has D1:Edit permissions
2. Token is for the correct account
3. You're using the correct environment (production)

## Verification

After deployment, test the login:
```bash
curl -X POST https://socialmediamanager-api-production.hlpfl-co.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"test123456"}'
```

Expected response should include a JWT token and user data.