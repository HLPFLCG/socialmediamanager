# 🚀 Fresh Start Deployment Guide - Social Media Manager

## Overview
This guide will help you deploy your social media manager from scratch with:
- ✅ Backend API (Cloudflare Worker)
- ✅ Frontend (Cloudflare Pages)
- ✅ OAuth for ALL social media platforms (Twitter, LinkedIn, Facebook, Instagram, TikTok, YouTube, Pinterest)
- ✅ Database setup (Cloudflare D1)

---

## Part 1: Backend Deployment (15 minutes)

### Step 1: Prepare Your Local Environment
```bash
# Clone the repository
git clone https://github.com/HLPFLCG/socialmediamanager.git
cd socialmediamanager

# Switch to the updated branch
git checkout fix/security-and-modernization

# Navigate to backend
cd cloudflare
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Login to Cloudflare
```bash
npx wrangler login
# This will open your browser - login to your Cloudflare account
```

### Step 4: Create D1 Database
```bash
# Create the database
npx wrangler d1 create socialmediamanager-db

# You'll get output like:
# database_id = "your-database-id-here"
# Copy this ID - you'll need it!
```

### Step 5: Update wrangler.toml with Database ID
Open `wrangler.toml` and update the database_id with the one from Step 4:
```toml
[[d1_databases]]
binding = "DB"
database_name = "socialmediamanager-db"
database_id = "YOUR-DATABASE-ID-HERE"  # Replace this
```

### Step 6: Initialize Database Schema
```bash
npx wrangler d1 execute socialmediamanager-db --file=schema.sql --env production
```

### Step 7: Set Environment Secrets
```bash
# JWT Secret
npx wrangler secret put JWT_SECRET --env production
# Enter: hlpfl-social-media-manager-jwt-secret-2024-secure

# We'll add OAuth secrets in Part 3
```

### Step 8: Deploy Backend
```bash
npx wrangler deploy --env production
```

**You'll get a URL like:**
`https://socialmediamanager-api-production.your-subdomain.workers.dev`

**SAVE THIS URL - you'll need it for the frontend!**

---

## Part 2: Frontend Deployment (10 minutes)

### Step 1: Go to Cloudflare Dashboard
1. Visit [https://dash.cloudflare.com](https://dash.cloudflare.com)
2. Click **"Pages"** in the left sidebar
3. Click **"Create a project"**

### Step 2: Connect GitHub Repository
1. Click **"Connect to Git"**
2. Select **GitHub**
3. Authorize Cloudflare if needed
4. Select repository: **HLPFLCG/socialmediamanager**
5. Click **"Begin setup"**

### Step 3: Configure Build Settings
```
Project name: socialmediamanager
Production branch: fix/security-and-modernization
Framework preset: HTML
Build command: (leave empty)
Build output directory: frontend
Root directory: / (leave as root)
```

### Step 4: Add Environment Variables
Click **"Add environment variable"** and add:

```
API_URL = https://socialmediamanager-api-production.your-subdomain.workers.dev
JWT_SECRET = hlpfl-social-media-manager-jwt-secret-2024-secure
```

**Important:** Replace the API_URL with your actual backend URL from Part 1, Step 8!

### Step 5: Deploy
1. Click **"Save and Deploy"**
2. Wait 2-3 minutes for deployment
3. Your site will be live at: `https://socialmediamanager.pages.dev`

### Step 6: (Optional) Add Custom Domain
1. In Pages project settings, click **"Custom domains"**
2. Add domain: `hlpfl.space` or your preferred domain
3. Follow DNS setup instructions
4. Wait for SSL certificate (5-10 minutes)

---

## Part 3: OAuth Setup for All Social Media Platforms

### Twitter/X OAuth Setup

#### Step 1: Create Twitter App
1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Click **"Create Project"** → **"Create App"**
3. Fill in app details:
   - App name: `HLPFL Social Media Manager`
   - Description: `Social media management tool`
   - Website: `https://hlpfl.space` or your domain

#### Step 2: Configure OAuth Settings
1. In app settings, go to **"User authentication settings"**
2. Enable **OAuth 2.0**
3. Set callback URL: `https://socialmediamanager.pages.dev/auth/twitter/callback`
4. Set website URL: `https://socialmediamanager.pages.dev`
5. Save settings

#### Step 3: Get API Keys
1. Go to **"Keys and tokens"** tab
2. Copy **API Key** and **API Secret**
3. Generate **Access Token** and **Access Token Secret**

#### Step 4: Add to Cloudflare Worker
```bash
cd cloudflare
npx wrangler secret put TWITTER_API_KEY --env production
# Paste your Twitter API Key

npx wrangler secret put TWITTER_API_SECRET --env production
# Paste your Twitter API Secret

npx wrangler secret put TWITTER_ACCESS_TOKEN --env production
# Paste your Twitter Access Token

npx wrangler secret put TWITTER_ACCESS_TOKEN_SECRET --env production
# Paste your Twitter Access Token Secret
```

---

### LinkedIn OAuth Setup

#### Step 1: Create LinkedIn App
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Click **"Create app"**
3. Fill in details:
   - App name: `HLPFL Social Media Manager`
   - LinkedIn Page: Select your company page
   - App logo: Upload your logo

#### Step 2: Configure OAuth
1. Go to **"Auth"** tab
2. Add redirect URL: `https://socialmediamanager.pages.dev/auth/linkedin/callback`
3. Request access to:
   - `r_liteprofile`
   - `r_emailaddress`
   - `w_member_social`

#### Step 3: Get Credentials
1. Copy **Client ID**
2. Copy **Client Secret**

#### Step 4: Add to Cloudflare Worker
```bash
npx wrangler secret put LINKEDIN_CLIENT_ID --env production
# Paste your LinkedIn Client ID

npx wrangler secret put LINKEDIN_CLIENT_SECRET --env production
# Paste your LinkedIn Client Secret
```

---

### Facebook OAuth Setup

#### Step 1: Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **"My Apps"** → **"Create App"**
3. Select **"Business"** type
4. Fill in app details

#### Step 2: Add Facebook Login Product
1. In app dashboard, click **"Add Product"**
2. Select **"Facebook Login"**
3. Choose **"Web"** platform
4. Set redirect URI: `https://socialmediamanager.pages.dev/auth/facebook/callback`

#### Step 3: Configure Permissions
1. Go to **"App Review"** → **"Permissions and Features"**
2. Request these permissions:
   - `pages_manage_posts`
   - `pages_read_engagement`
   - `pages_show_list`

#### Step 4: Get Credentials
1. Go to **"Settings"** → **"Basic"**
2. Copy **App ID**
3. Copy **App Secret**

#### Step 5: Add to Cloudflare Worker
```bash
npx wrangler secret put FACEBOOK_APP_ID --env production
# Paste your Facebook App ID

npx wrangler secret put FACEBOOK_APP_SECRET --env production
# Paste your Facebook App Secret
```

---

### Instagram OAuth Setup

#### Step 1: Use Facebook App
Instagram OAuth uses the same Facebook app you created above.

#### Step 2: Add Instagram Product
1. In Facebook app dashboard, click **"Add Product"**
2. Select **"Instagram Basic Display"**
3. Create new Instagram App

#### Step 3: Configure OAuth
1. Add redirect URI: `https://socialmediamanager.pages.dev/auth/instagram/callback`
2. Request permissions:
   - `instagram_basic`
   - `instagram_content_publish`

#### Step 4: Get Credentials
1. Copy **Instagram App ID**
2. Copy **Instagram App Secret**

#### Step 5: Add to Cloudflare Worker
```bash
npx wrangler secret put INSTAGRAM_CLIENT_ID --env production
# Paste your Instagram App ID

npx wrangler secret put INSTAGRAM_CLIENT_SECRET --env production
# Paste your Instagram App Secret
```

---

### TikTok OAuth Setup

#### Step 1: Create TikTok App
1. Go to [TikTok Developers](https://developers.tiktok.com/)
2. Click **"Manage apps"** → **"Create an app"**
3. Fill in app details

#### Step 2: Configure OAuth
1. Add redirect URI: `https://socialmediamanager.pages.dev/auth/tiktok/callback`
2. Request scopes:
   - `user.info.basic`
   - `video.publish`
   - `video.list`

#### Step 3: Get Credentials
1. Copy **Client Key**
2. Copy **Client Secret**

#### Step 4: Add to Cloudflare Worker
```bash
npx wrangler secret put TIKTOK_CLIENT_KEY --env production
# Paste your TikTok Client Key

npx wrangler secret put TIKTOK_CLIENT_SECRET --env production
# Paste your TikTok Client Secret
```

---

### YouTube OAuth Setup

#### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: `HLPFL Social Media Manager`
3. Enable **YouTube Data API v3**

#### Step 2: Create OAuth Credentials
1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Application type: **Web application**
4. Add redirect URI: `https://socialmediamanager.pages.dev/auth/youtube/callback`

#### Step 3: Configure OAuth Consent Screen
1. Go to **"OAuth consent screen"**
2. Add scopes:
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/youtube.readonly`

#### Step 4: Get Credentials
1. Copy **Client ID**
2. Copy **Client Secret**

#### Step 5: Add to Cloudflare Worker
```bash
npx wrangler secret put YOUTUBE_CLIENT_ID --env production
# Paste your YouTube Client ID

npx wrangler secret put YOUTUBE_CLIENT_SECRET --env production
# Paste your YouTube Client Secret
```

---

### Pinterest OAuth Setup

#### Step 1: Create Pinterest App
1. Go to [Pinterest Developers](https://developers.pinterest.com/)
2. Click **"My apps"** → **"Create app"**
3. Fill in app details

#### Step 2: Configure OAuth
1. Add redirect URI: `https://socialmediamanager.pages.dev/auth/pinterest/callback`
2. Request scopes:
   - `boards:read`
   - `pins:read`
   - `pins:write`

#### Step 3: Get Credentials
1. Copy **App ID**
2. Copy **App Secret**

#### Step 4: Add to Cloudflare Worker
```bash
npx wrangler secret put PINTEREST_APP_ID --env production
# Paste your Pinterest App ID

npx wrangler secret put PINTEREST_APP_SECRET --env production
# Paste your Pinterest App Secret
```

---

## Part 4: Update Backend Code with OAuth

Now we need to add OAuth endpoints to your backend. Let me create the OAuth handler code for you.

---

## Part 5: Testing Everything

### Test Backend
```bash
# Test health endpoint
curl https://socialmediamanager-api-production.your-subdomain.workers.dev/api/health

# Test authentication
curl -X POST https://socialmediamanager-api-production.your-subdomain.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'
```

### Test Frontend
1. Visit `https://socialmediamanager.pages.dev`
2. Create an account
3. Try connecting each social media platform
4. Create a test post
5. Check analytics

---

## 📋 Complete Checklist

### Backend
- [ ] Dependencies installed
- [ ] Wrangler authenticated
- [ ] D1 database created
- [ ] Database schema initialized
- [ ] JWT secret set
- [ ] Backend deployed
- [ ] Backend URL saved

### Frontend
- [ ] Cloudflare Pages project created
- [ ] GitHub repository connected
- [ ] Build settings configured
- [ ] Environment variables set
- [ ] Frontend deployed
- [ ] Custom domain added (optional)

### OAuth - Twitter
- [ ] Twitter app created
- [ ] OAuth configured
- [ ] API keys obtained
- [ ] Secrets added to worker

### OAuth - LinkedIn
- [ ] LinkedIn app created
- [ ] OAuth configured
- [ ] Credentials obtained
- [ ] Secrets added to worker

### OAuth - Facebook
- [ ] Facebook app created
- [ ] Facebook Login added
- [ ] Permissions requested
- [ ] Secrets added to worker

### OAuth - Instagram
- [ ] Instagram app created
- [ ] OAuth configured
- [ ] Credentials obtained
- [ ] Secrets added to worker

### OAuth - TikTok
- [ ] TikTok app created
- [ ] OAuth configured
- [ ] Credentials obtained
- [ ] Secrets added to worker

### OAuth - YouTube
- [ ] Google Cloud project created
- [ ] YouTube API enabled
- [ ] OAuth credentials created
- [ ] Secrets added to worker

### OAuth - Pinterest
- [ ] Pinterest app created
- [ ] OAuth configured
- [ ] Credentials obtained
- [ ] Secrets added to worker

---

## 🎯 Final Result

You'll have:
- ✅ **Backend API**: Fully functional with all endpoints
- ✅ **Frontend**: Professional dark theme matching hlpfl.org
- ✅ **OAuth**: All 7 social media platforms connected
- ✅ **Database**: User data and posts stored securely
- ✅ **Features**: Post creation, scheduling, analytics, settings

**Total Setup Time**: ~2-3 hours (mostly OAuth setup)
**Difficulty**: Intermediate
**Cost**: Free (Cloudflare free tier)

---

## 🆘 Need Help?

If you get stuck at any step:
1. Check the error message carefully
2. Verify all credentials are correct
3. Ensure callback URLs match exactly
4. Check Cloudflare Worker logs
5. Test each OAuth flow individually

**Your social media manager will be production-ready!** 🚀