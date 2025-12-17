# 🚀 Quick Start - Deploy in 30 Minutes

This is the **simplest possible guide** to get your social media manager up and running.

---

## 📋 What You'll Get
- ✅ Backend API running on Cloudflare Workers
- ✅ Frontend running on Cloudflare Pages
- ✅ OAuth for 7 social platforms (Twitter, LinkedIn, Facebook, Instagram, TikTok, YouTube, Pinterest)
- ✅ Professional dark theme matching hlpfl.org
- ✅ Complete post management, analytics, and scheduling

---

## Part 1: Backend (15 minutes)

### Step 1: Get the Code
```bash
git clone https://github.com/HLPFLCG/socialmediamanager.git
cd socialmediamanager
git checkout fix/security-and-modernization
cd cloudflare
```

### Step 2: Install & Login
```bash
npm install
npx wrangler login
```
*This opens your browser - login to Cloudflare*

### Step 3: Create Database
```bash
npx wrangler d1 create socialmediamanager-db
```
**IMPORTANT:** Copy the `database_id` from the output!

### Step 4: Update Configuration
Open `wrangler.toml` and find this section:
```toml
[[d1_databases]]
binding = "DB"
database_name = "socialmediamanager-db"
database_id = "PASTE-YOUR-DATABASE-ID-HERE"
```
Replace `PASTE-YOUR-DATABASE-ID-HERE` with the ID from Step 3.

### Step 5: Setup Database
```bash
npx wrangler d1 execute socialmediamanager-db --file=schema.sql --env production
```

### Step 6: Set Secret
```bash
npx wrangler secret put JWT_SECRET --env production
```
When prompted, enter: `hlpfl-social-media-manager-jwt-secret-2024-secure`

### Step 7: Deploy!
```bash
npx wrangler deploy --env production
```

**✅ DONE! Copy your backend URL** (looks like: `https://socialmediamanager-api-production.your-name.workers.dev`)

---

## Part 2: Frontend (5 minutes)

### Step 1: Cloudflare Dashboard
1. Go to https://dash.cloudflare.com
2. Click **"Pages"** → **"Create a project"**
3. Click **"Connect to Git"** → Select **GitHub**

### Step 2: Select Repository
1. Choose: **HLPFLCG/socialmediamanager**
2. Click **"Begin setup"**

### Step 3: Configure
```
Project name: socialmediamanager
Production branch: fix/security-and-modernization
Framework preset: HTML
Build command: (leave empty)
Build output directory: frontend
```

### Step 4: Environment Variables
Add these two variables:
```
API_URL = https://your-backend-url-from-part-1.workers.dev
JWT_SECRET = hlpfl-social-media-manager-jwt-secret-2024-secure
```

### Step 5: Deploy
Click **"Save and Deploy"** and wait 2-3 minutes.

**✅ DONE! Your site is live at** `https://socialmediamanager.pages.dev`

---

## Part 3: OAuth Setup (10 minutes per platform)

You can add platforms one at a time. Here's the quickest setup for each:

### Twitter (Most Popular)
1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create app → Enable OAuth 2.0
3. Callback URL: `https://socialmediamanager.pages.dev/auth/twitter/callback`
4. Copy API Key & Secret
5. Run:
```bash
cd cloudflare
npx wrangler secret put TWITTER_API_KEY --env production
npx wrangler secret put TWITTER_API_SECRET --env production
```

### LinkedIn
1. Go to https://www.linkedin.com/developers/apps
2. Create app → Add redirect URL: `https://socialmediamanager.pages.dev/auth/linkedin/callback`
3. Copy Client ID & Secret
4. Run:
```bash
npx wrangler secret put LINKEDIN_CLIENT_ID --env production
npx wrangler secret put LINKEDIN_CLIENT_SECRET --env production
```

### Facebook
1. Go to https://developers.facebook.com/
2. Create app → Add Facebook Login
3. Redirect URI: `https://socialmediamanager.pages.dev/auth/facebook/callback`
4. Copy App ID & Secret
5. Run:
```bash
npx wrangler secret put FACEBOOK_APP_ID --env production
npx wrangler secret put FACEBOOK_APP_SECRET --env production
```

### Instagram
1. Use same Facebook app from above
2. Add Instagram Basic Display product
3. Redirect URI: `https://socialmediamanager.pages.dev/auth/instagram/callback`
4. Copy Instagram App ID & Secret
5. Run:
```bash
npx wrangler secret put INSTAGRAM_CLIENT_ID --env production
npx wrangler secret put INSTAGRAM_CLIENT_SECRET --env production
```

### TikTok
1. Go to https://developers.tiktok.com/
2. Create app → Redirect URI: `https://socialmediamanager.pages.dev/auth/tiktok/callback`
3. Copy Client Key & Secret
4. Run:
```bash
npx wrangler secret put TIKTOK_CLIENT_KEY --env production
npx wrangler secret put TIKTOK_CLIENT_SECRET --env production
```

### YouTube
1. Go to https://console.cloud.google.com/
2. Create project → Enable YouTube Data API v3
3. Create OAuth credentials → Redirect URI: `https://socialmediamanager.pages.dev/auth/youtube/callback`
4. Copy Client ID & Secret
5. Run:
```bash
npx wrangler secret put YOUTUBE_CLIENT_ID --env production
npx wrangler secret put YOUTUBE_CLIENT_SECRET --env production
```

### Pinterest
1. Go to https://developers.pinterest.com/
2. Create app → Redirect URI: `https://socialmediamanager.pages.dev/auth/pinterest/callback`
3. Copy App ID & Secret
4. Run:
```bash
npx wrangler secret put PINTEREST_APP_ID --env production
npx wrangler secret put PINTEREST_APP_SECRET --env production
```

---

## 🎯 You're Done!

Visit your site: `https://socialmediamanager.pages.dev`

1. Create an account
2. Connect your social media accounts
3. Create your first post
4. Check the analytics dashboard

---

## 🔧 Troubleshooting

**Backend not deploying?**
- Make sure you're in the `cloudflare` directory
- Run `npm install` again
- Check you're logged in: `npx wrangler whoami`

**Frontend not loading?**
- Check environment variables are set correctly
- Make sure API_URL matches your backend URL exactly
- Clear browser cache

**OAuth not working?**
- Verify callback URLs match exactly (including https://)
- Check secrets are set: `npx wrangler secret list --env production`
- Make sure you're using the production frontend URL in OAuth apps

---

## 📚 More Help

- **Full deployment guide**: See `FRESH_START_DEPLOYMENT.md`
- **Checklist**: See `DEPLOYMENT_CHECKLIST.txt`
- **Automated script**: Run `./deploy.sh` for automated backend deployment

---

## 🎉 Features You Now Have

- ✅ Multi-platform posting (7 platforms)
- ✅ Post scheduling
- ✅ Analytics dashboard
- ✅ User management
- ✅ Professional dark theme
- ✅ Mobile responsive
- ✅ Secure authentication
- ✅ OAuth integration

**Total cost: $0** (Cloudflare free tier)

**Enjoy your free Hootsuite alternative!** 🚀