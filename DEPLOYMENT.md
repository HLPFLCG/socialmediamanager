# Deployment Guide - Social Media Manager

This guide provides step-by-step instructions for deploying the Social Media Manager application to Cloudflare Workers.

## Prerequisites

Before deploying, ensure you have:

1. **Cloudflare Account**
   - Sign up at https://dash.cloudflare.com/sign-up
   - Note your Account ID from the dashboard

2. **Node.js and npm**
   - Node.js 20 or higher
   - Verify: `node --version` and `npm --version`

3. **Wrangler CLI**
   - Install globally: `npm install -g wrangler`
   - Verify: `wrangler --version`

4. **GitHub Account** (for automatic deployments)
   - Repository access to HLPFLCG/socialmediamanager

## Step 1: Initial Setup

### 1.1 Clone the Repository

```bash
git clone https://github.com/HLPFLCG/socialmediamanager.git
cd socialmediamanager/cloudflare
```

### 1.2 Install Dependencies

```bash
npm install
```

This will install:
- Hono v4.11.1 (Web framework)
- bcryptjs v2.4.3 (Password hashing)
- Wrangler v4.55.0 (Cloudflare CLI)

## Step 2: Cloudflare Authentication

### 2.1 Login to Cloudflare

```bash
wrangler login
```

This will open a browser window for authentication.

### 2.2 Verify Authentication

```bash
wrangler whoami
```

You should see your Cloudflare account email and Account ID.

## Step 3: Database Setup

### 3.1 Create D1 Database (if not exists)

The database should already exist with ID: `8860d9ea-f18a-422d-b409-f641edd83fd0`

To verify:
```bash
wrangler d1 list
```

If you need to create a new database:
```bash
wrangler d1 create socialmediamanager-db
```

### 3.2 Apply Database Schema

```bash
wrangler d1 execute socialmediamanager-db --file=./schema.sql --env production
```

This creates all necessary tables:
- users
- posts
- social_accounts
- media_files
- analytics

### 3.3 Verify Database

```bash
wrangler d1 execute socialmediamanager-db --command="SELECT name FROM sqlite_master WHERE type='table';" --env production
```

You should see all 5 tables listed.

## Step 4: Configure Secrets

### 4.1 Set JWT Secret (REQUIRED)

```bash
wrangler secret put JWT_SECRET --env production
```

When prompted, enter a strong, random secret (at least 32 characters):
```
Example: 8f3d9a2b7c1e4f6a8d9b2c3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3
```

**IMPORTANT**: Never commit this secret to version control!

### 4.2 Set Social Media API Credentials (Optional)

Only set these if you have API credentials:

```bash
# Twitter
wrangler secret put TWITTER_API_KEY --env production
wrangler secret put TWITTER_API_SECRET --env production

# LinkedIn
wrangler secret put LINKEDIN_CLIENT_ID --env production
wrangler secret put LINKEDIN_CLIENT_SECRET --env production

# Facebook
wrangler secret put FACEBOOK_APP_ID --env production
wrangler secret put FACEBOOK_APP_SECRET --env production

# Instagram
wrangler secret put INSTAGRAM_CLIENT_ID --env production
wrangler secret put INSTAGRAM_CLIENT_SECRET --env production
```

### 4.3 Verify Secrets

```bash
wrangler secret list --env production
```

## Step 5: Deploy to Production

### 5.1 Deploy the Worker

```bash
npm run deploy:production
```

Or manually:
```bash
wrangler deploy --env production
```

### 5.2 Verify Deployment

The deployment will output a URL like:
```
https://socialmediamanager-api-production.hlpfl-co.workers.dev
```

Test the health endpoint:
```bash
curl https://socialmediamanager-api-production.hlpfl-co.workers.dev/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-17T...",
  "version": "2.0.0",
  "database": "D1",
  "environment": "production"
}
```

## Step 6: Configure Custom Domain (Optional)

### 6.1 Add Custom Domain in Cloudflare Dashboard

1. Go to Workers & Pages > socialmediamanager-api-production
2. Click "Settings" > "Triggers"
3. Click "Add Custom Domain"
4. Enter your domain: `hlpfl.space`
5. Click "Add Custom Domain"

### 6.2 Update CORS Configuration

Update `wrangler.toml` to include your custom domain:

```toml
[env.production]
vars = { 
  ALLOWED_ORIGINS = "https://hlpfl.space,https://socialmediamanager-api-production.hlpfl-co.workers.dev"
}
```

Redeploy:
```bash
npm run deploy:production
```

## Step 7: GitHub Actions Setup

### 7.1 Get Cloudflare API Token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use "Edit Cloudflare Workers" template
4. Set permissions:
   - Account > Cloudflare Workers Scripts > Edit
   - Account > Account Settings > Read
5. Copy the generated token

### 7.2 Add GitHub Secret

1. Go to your GitHub repository
2. Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Name: `CLOUDFLARE_API_TOKEN`
5. Value: Paste your API token
6. Click "Add secret"

### 7.3 Verify Automatic Deployment

Push to main branch:
```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

Check GitHub Actions tab to see deployment progress.

## Step 8: Testing

### 8.1 Test User Registration

```bash
curl -X POST https://hlpfl.space/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "securepassword123",
    "name": "Test User"
  }'
```

### 8.2 Test User Login

```bash
curl -X POST https://hlpfl.space/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "securepassword123"
  }'
```

Save the returned token for authenticated requests.

### 8.3 Test Dashboard (Authenticated)

```bash
curl https://hlpfl.space/api/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 8.4 Test Post Creation

```bash
curl -X POST https://hlpfl.space/api/posts \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "My first post!",
    "platforms": ["twitter", "linkedin"]
  }'
```

## Step 9: Monitoring

### 9.1 View Logs

```bash
wrangler tail --env production
```

### 9.2 Check Analytics

1. Go to Cloudflare Dashboard
2. Workers & Pages > socialmediamanager-api-production
3. View metrics: Requests, Errors, CPU time

### 9.3 Monitor Database

```bash
# Check database size
wrangler d1 info socialmediamanager-db

# Query user count
wrangler d1 execute socialmediamanager-db --command="SELECT COUNT(*) FROM users;" --env production
```

## Troubleshooting

### Issue: "Database not found"

**Solution**: Verify database ID in `wrangler.toml` matches your D1 database:
```bash
wrangler d1 list
```

### Issue: "Invalid JWT token"

**Solution**: Ensure JWT_SECRET is set correctly:
```bash
wrangler secret list --env production
```

If missing, set it:
```bash
wrangler secret put JWT_SECRET --env production
```

### Issue: "CORS error"

**Solution**: Update ALLOWED_ORIGINS in `wrangler.toml`:
```toml
vars = { ALLOWED_ORIGINS = "https://your-domain.com" }
```

### Issue: "Module not found"

**Solution**: Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Deployment fails"

**Solution**: Check GitHub Actions logs and verify:
1. CLOUDFLARE_API_TOKEN is set correctly
2. API token has correct permissions
3. Account ID in wrangler.toml is correct

## Rollback Procedure

If you need to rollback to a previous version:

### 1. List Deployments

```bash
wrangler deployments list --env production
```

### 2. Rollback to Previous Version

```bash
wrangler rollback --env production
```

Or rollback to specific deployment:
```bash
wrangler rollback --message "Rollback to stable version" --env production
```

## Staging Environment

To deploy to staging for testing:

### 1. Deploy to Staging

```bash
npm run deploy:staging
```

### 2. Test Staging

```bash
curl https://socialmediamanager-api-staging.hlpfl-co.workers.dev/api/health
```

### 3. Promote to Production

After testing, deploy to production:
```bash
npm run deploy:production
```

## Security Checklist

Before going live, verify:

- [ ] JWT_SECRET is set and strong (32+ characters)
- [ ] ALLOWED_ORIGINS is configured (not using wildcard *)
- [ ] All secrets are stored in Wrangler, not in code
- [ ] Database schema is applied
- [ ] HTTPS is enforced (automatic with Cloudflare)
- [ ] GitHub secrets are configured
- [ ] API token has minimal required permissions
- [ ] Test user accounts are removed from production
- [ ] Error messages don't expose sensitive information

## Maintenance

### Regular Tasks

1. **Monitor Logs**: Check for errors daily
2. **Review Analytics**: Weekly review of usage patterns
3. **Update Dependencies**: Monthly security updates
4. **Backup Database**: Regular D1 exports
5. **Rotate Secrets**: Quarterly JWT_SECRET rotation

### Updating Dependencies

```bash
cd cloudflare
npm update
npm audit fix
npm run deploy:production
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/HLPFLCG/socialmediamanager/issues
- Cloudflare Docs: https://developers.cloudflare.com/workers/
- Wrangler Docs: https://developers.cloudflare.com/workers/wrangler/

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [D1 Database Documentation](https://developers.cloudflare.com/d1/)
- [Hono Framework Documentation](https://hono.dev/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/commands/)