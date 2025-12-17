# Cloudflare Pages Setup for hlpfl.space

This guide will help you deploy the frontend to Cloudflare Pages so it's accessible at https://hlpfl.space

## Prerequisites

- Cloudflare account with hlpfl.space domain
- GitHub repository access (HLPFLCG/socialmediamanager)
- Cloudflare Pages access

## Step 1: Connect Repository to Cloudflare Pages

1. Go to https://dash.cloudflare.com
2. Navigate to **Workers & Pages** → **Pages**
3. Click **Create application** → **Connect to Git**
4. Select your GitHub account and choose **HLPFLCG/socialmediamanager**
5. Click **Begin setup**

## Step 2: Configure Build Settings

### Project Configuration:
- **Project name**: `hlpfl-social-media-manager` (or any name you prefer)
- **Production branch**: `fix/security-and-modernization` (or `main` after merging)
- **Build command**: Leave empty (static site)
- **Build output directory**: `frontend`

### Environment Variables:
No environment variables needed for the frontend.

## Step 3: Deploy

1. Click **Save and Deploy**
2. Wait for the deployment to complete (usually 1-2 minutes)
3. You'll get a URL like: `https://hlpfl-social-media-manager.pages.dev`

## Step 4: Configure Custom Domain (hlpfl.space)

1. In your Cloudflare Pages project, go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter: `hlpfl.space`
4. Click **Continue**
5. Cloudflare will automatically configure the DNS records
6. Wait for DNS propagation (usually instant with Cloudflare)

## Step 5: Verify Deployment

1. Visit https://hlpfl.space
2. You should see the login screen
3. Try registering a new account or logging in
4. Verify the dashboard loads correctly

## Automatic Deployments

Cloudflare Pages will automatically deploy when you push to your configured branch:
- Push to `fix/security-and-modernization` → Automatic deployment
- After merging to `main`, change production branch to `main` in Pages settings

## Troubleshooting

### Issue: 404 Not Found
- **Solution**: Make sure the build output directory is set to `frontend`

### Issue: API calls failing
- **Solution**: Check that the API URL in `frontend/app.js` is correct:
  ```javascript
  const API_BASE_URL = 'https://socialmediamanager-api-production.hlpfl-co.workers.dev/api';
  ```

### Issue: CORS errors
- **Solution**: Verify that `hlpfl.space` is in the ALLOWED_ORIGINS in your Worker's wrangler.toml:
  ```toml
  ALLOWED_ORIGINS = "https://hlpfl.space,https://socialmediamanager-api-production.hlpfl-co.workers.dev"
  ```

## Alternative: Manual Deployment

If you prefer to deploy manually:

1. Go to Cloudflare Pages dashboard
2. Click **Upload assets**
3. Upload the contents of the `frontend` folder
4. Configure custom domain as described above

## Next Steps

After deployment:
1. Test user registration and login
2. Create a test post
3. Verify all features work correctly
4. Share the URL with your team

## Support

If you encounter any issues:
1. Check Cloudflare Pages deployment logs
2. Check browser console for JavaScript errors
3. Verify API is responding at https://socialmediamanager-api-production.hlpfl-co.workers.dev
4. Check CORS configuration in Worker