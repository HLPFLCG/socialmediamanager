# Complete Setup Guide - Social Media Manager v2.0.0
## From Zero to Production in 30 Minutes

This guide walks you through every single step needed to deploy your Social Media Manager application from scratch.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Cloudflare Setup](#cloudflare-setup)
3. [Database Setup](#database-setup)
4. [GitHub Configuration](#github-configuration)
5. [Wrangler Secrets Configuration](#wrangler-secrets-configuration)
6. [Deployment](#deployment)
7. [Testing & Verification](#testing--verification)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### What You Need

- [ ] Cloudflare account (free tier works)
- [ ] GitHub account with access to HLPFLCG/socialmediamanager
- [ ] Node.js 20+ installed on your computer
- [ ] Terminal/Command line access
- [ ] 30 minutes of time

### Install Required Tools

1. **Install Node.js** (if not already installed)
   - Download from: https://nodejs.org/
   - Verify installation:
     ```bash
     node --version  # Should show v20.x.x or higher
     npm --version   # Should show 10.x.x or higher
     ```

2. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```
   
   Verify installation:
   ```bash
   wrangler --version  # Should show 4.x.x or higher
   ```

3. **Clone the Repository**
   ```bash
   cd ~/Desktop  # Or wherever you want to work
   git clone https://github.com/HLPFLCG/socialmediamanager.git
   cd socialmediamanager
   ```

4. **Checkout the Updated Branch**
   ```bash
   git checkout fix/security-and-modernization
   cd cloudflare
   npm install
   ```

---

## Cloudflare Setup

### Step 1: Login to Cloudflare

1. **Authenticate Wrangler**
   ```bash
   wrangler login
   ```
   
   This will:
   - Open your browser
   - Ask you to authorize Wrangler
   - Click "Allow" to grant access

2. **Verify Authentication**
   ```bash
   wrangler whoami
   ```
   
   You should see:
   ```
   👋 You are logged in with an OAuth Token, associated with the email '<your-email>@example.com'!
   ┌──────────────────────┬──────────────────────────────────┐
   │ Account Name         │ Account ID                        │
   ├──────────────────────┼──────────────────────────────────┤
   │ Your Account         │ 8c74a072236761cf6126371f0b20c5a9 │
   └──────────────────────┴──────────────────────────────────┘
   ```

### Step 2: Create Cloudflare API Token

1. **Go to Cloudflare Dashboard**
   - Visit: https://dash.cloudflare.com/profile/api-tokens

2. **Create New Token**
   - Click "Create Token"
   - Click "Use template" next to "Edit Cloudflare Workers"

3. **Configure Token Permissions**
   - **Token name**: `socialmediamanager-deploy`
   - **Permissions**:
     - Account > Cloudflare Workers Scripts > Edit
     - Account > Account Settings > Read
     - Account > D1 > Edit (if available)
   - **Account Resources**:
     - Include > Your Account
   - **Zone Resources**:
     - Include > All zones (or specific zone if you prefer)
   - **TTL**: Leave as default or set expiration

4. **Create and Copy Token**
   - Click "Continue to summary"
   - Click "Create Token"
   - **IMPORTANT**: Copy the token NOW - you won't see it again!
   - Save it temporarily in a text file

   Example token format:
   ```
   JRtvDTpOIWhAxPjt_fEYBOD1-i8jvt1zcQEv-_cj
   ```

---

## Database Setup

### Step 3: Verify D1 Database Exists

1. **List All D1 Databases**
   ```bash
   wrangler d1 list
   ```
   
   You should see:
   ```
   ┌──────────────────────────────────┬────────────────────────┬─────────┐
   │ uuid                             │ name                   │ version │
   ├──────────────────────────────────┼────────────────────────┼─────────┤
   │ 8860d9ea-f18a-422d-b409-f641edd83fd0 │ socialmediamanager-db │ ...     │
   └──────────────────────────────────┴────────────────────────┴─────────┘
   ```

2. **If Database Doesn't Exist, Create It**
   ```bash
   wrangler d1 create socialmediamanager-db
   ```
   
   Copy the database ID from the output and update `wrangler.toml`:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "socialmediamanager-db"
   database_id = "YOUR-DATABASE-ID-HERE"
   ```

### Step 4: Apply Database Schema

1. **Check Current Schema File**
   ```bash
   cat schema.sql
   ```
   
   You should see table definitions for:
   - users
   - posts
   - social_accounts
   - media_files
   - analytics

2. **Apply Schema to Production Database**
   ```bash
   wrangler d1 execute socialmediamanager-db --file=./schema.sql --env production
   ```
   
   Expected output:
   ```
   🌀 Executing on socialmediamanager-db (8860d9ea-f18a-422d-b409-f641edd83fd0):
   🌀 To execute on your local development database, pass the --local flag to 'wrangler d1 execute'
   🚣 Executed 5 commands in 0.123s
   ```

3. **Verify Tables Were Created**
   ```bash
   wrangler d1 execute socialmediamanager-db --command="SELECT name FROM sqlite_master WHERE type='table';" --env production
   ```
   
   Expected output:
   ```
   ┌─────────────────┐
   │ name            │
   ├─────────────────┤
   │ users           │
   │ posts           │
   │ social_accounts │
   │ media_files     │
   │ analytics       │
   └─────────────────┘
   ```

4. **Check Users Table Structure**
   ```bash
   wrangler d1 execute socialmediamanager-db --command="PRAGMA table_info(users);" --env production
   ```
   
   You should see columns:
   - id (INTEGER, PRIMARY KEY)
   - email (TEXT, UNIQUE, NOT NULL)
   - password (TEXT, NOT NULL)
   - name (TEXT)
   - avatar_url (TEXT)
   - created_at (DATETIME)
   - updated_at (DATETIME)

5. **Verify Database is Empty (Fresh Start)**
   ```bash
   wrangler d1 execute socialmediamanager-db --command="SELECT COUNT(*) as user_count FROM users;" --env production
   ```
   
   Expected output:
   ```
   ┌────────────┐
   │ user_count │
   ├────────────┤
   │ 0          │
   └────────────┘
   ```

---

## GitHub Configuration

### Step 5: Add GitHub Secret for API Token

1. **Go to Repository Settings**
   - Visit: https://github.com/HLPFLCG/socialmediamanager/settings/secrets/actions

2. **Add New Secret**
   - Click "New repository secret"
   - **Name**: `CLOUDFLARE_API_TOKEN`
   - **Value**: Paste the API token you created earlier
   - Click "Add secret"

3. **Verify Secret Was Added**
   - You should see `CLOUDFLARE_API_TOKEN` in the list
   - The value will be hidden (shows as `***`)

---

## Wrangler Secrets Configuration

### Step 6: Set JWT Secret

1. **Generate a Strong Secret**
   
   Option A - Using OpenSSL (Mac/Linux):
   ```bash
   openssl rand -base64 32
   ```
   
   Option B - Using Node.js (Any OS):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   
   Option C - Manual (Any OS):
   - Go to: https://www.random.org/strings/
   - Generate a 32-character random string
   
   Example output:
   ```
   8f3d9a2b7c1e4f6a8d9b2c3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3
   ```
   
   **IMPORTANT**: Save this secret somewhere safe! You'll need it if you ever need to redeploy.

2. **Set the Secret in Wrangler**
   ```bash
   wrangler secret put JWT_SECRET --env production
   ```
   
   When prompted:
   ```
   Enter a secret value: [paste your generated secret here]
   ```
   
   Press Enter. You should see:
   ```
   🌀 Creating the secret for the Worker "socialmediamanager-api-production"
   ✨ Success! Uploaded secret JWT_SECRET
   ```

3. **Verify Secret Was Set**
   ```bash
   wrangler secret list --env production
   ```
   
   Expected output:
   ```
   [
     {
       "name": "JWT_SECRET",
       "type": "secret_text"
     }
   ]
   ```

### Step 7: Set Social Media API Credentials (Optional - For Later)

These are optional for now. You can add them later when you're ready to integrate with actual social media platforms.

```bash
# Twitter (when you have credentials)
wrangler secret put TWITTER_API_KEY --env production
wrangler secret put TWITTER_API_SECRET --env production

# LinkedIn (when you have credentials)
wrangler secret put LINKEDIN_CLIENT_ID --env production
wrangler secret put LINKEDIN_CLIENT_SECRET --env production

# Facebook (when you have credentials)
wrangler secret put FACEBOOK_APP_ID --env production
wrangler secret put FACEBOOK_APP_SECRET --env production

# Instagram (when you have credentials)
wrangler secret put INSTAGRAM_CLIENT_ID --env production
wrangler secret put INSTAGRAM_CLIENT_SECRET --env production
```

---

## Deployment

### Step 8: Deploy to Production

1. **Review Configuration**
   ```bash
   cat wrangler.toml
   ```
   
   Verify:
   - `account_id` matches your Cloudflare account
   - `database_id` matches your D1 database
   - `ALLOWED_ORIGINS` includes your domain

2. **Deploy the Worker**
   ```bash
   npm run deploy:production
   ```
   
   Or manually:
   ```bash
   wrangler deploy --env production
   ```
   
   Expected output:
   ```
   Total Upload: xx.xx KiB / gzip: xx.xx KiB
   Uploaded socialmediamanager-api-production (x.xx sec)
   Published socialmediamanager-api-production (x.xx sec)
     https://socialmediamanager-api-production.hlpfl-co.workers.dev
   Current Deployment ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

3. **Note Your Worker URL**
   - Copy the URL from the output
   - Example: `https://socialmediamanager-api-production.hlpfl-co.workers.dev`

---

## Testing & Verification

### Step 9: Test API Endpoints

1. **Test Health Check**
   ```bash
   curl https://socialmediamanager-api-production.hlpfl-co.workers.dev/api/health
   ```
   
   Expected response:
   ```json
   {
     "status": "healthy",
     "timestamp": "2024-12-17T12:34:56.789Z",
     "version": "2.0.0",
     "database": "D1",
     "environment": "production"
   }
   ```

2. **Test Database Connection**
   ```bash
   curl https://socialmediamanager-api-production.hlpfl-co.workers.dev/api/db/status
   ```
   
   Expected response:
   ```json
   {
     "database": "D1",
     "connected": true,
     "timestamp": "2024-12-17T12:34:56.789Z"
   }
   ```

### Step 10: Test User Registration

1. **Register a Test User**
   ```bash
   curl -X POST https://socialmediamanager-api-production.hlpfl-co.workers.dev/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "TestPassword123!",
       "name": "Test User"
     }'
   ```
   
   Expected response:
   ```json
   {
     "success": true,
     "user": {
       "id": 1,
       "email": "test@example.com",
       "name": "Test User",
       "avatar_url": null
     },
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   }
   ```
   
   **IMPORTANT**: Copy the token from the response! You'll need it for the next steps.

2. **Verify User Was Created in Database**
   ```bash
   wrangler d1 execute socialmediamanager-db --command="SELECT id, email, name FROM users;" --env production
   ```
   
   Expected output:
   ```
   ┌────┬──────────────────┬───────────┐
   │ id │ email            │ name      │
   ├────┼──────────────────┼───────────┤
   │ 1  │ test@example.com │ Test User │
   └────┴──────────────────┴───────────┘
   ```

3. **Verify Password is Hashed**
   ```bash
   wrangler d1 execute socialmediamanager-db --command="SELECT password FROM users WHERE email='test@example.com';" --env production
   ```
   
   Expected output (password should be a bcrypt hash):
   ```
   ┌──────────────────────────────────────────────────────────────┐
   │ password                                                      │
   ├──────────────────────────────────────────────────────────────┤
   │ $2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ │
   └──────────────────────────────────────────────────────────────┘
   ```
   
   ✅ If it starts with `$2a$` or `$2b$`, password hashing is working!

### Step 11: Test User Login

1. **Login with Test User**
   ```bash
   curl -X POST https://socialmediamanager-api-production.hlpfl-co.workers.dev/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "TestPassword123!"
     }'
   ```
   
   Expected response:
   ```json
   {
     "success": true,
     "user": {
       "id": 1,
       "email": "test@example.com",
       "name": "Test User",
       "avatar_url": null
     },
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   }
   ```

2. **Test with Wrong Password**
   ```bash
   curl -X POST https://socialmediamanager-api-production.hlpfl-co.workers.dev/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "WrongPassword"
     }'
   ```
   
   Expected response:
   ```json
   {
     "error": "Invalid credentials"
   }
   ```
   
   ✅ If you get this error, authentication is working correctly!

### Step 12: Test Authenticated Endpoints

1. **Get Dashboard Stats** (Replace TOKEN with your actual token)
   ```bash
   curl https://socialmediamanager-api-production.hlpfl-co.workers.dev/api/dashboard/stats \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```
   
   Expected response:
   ```json
   {
     "stats": {
       "total_posts": 0,
       "published_posts": 0,
       "scheduled_posts": 0,
       "draft_posts": 0,
       "reach": 0,
       "engagement": 0
     },
     "recentPosts": [],
     "socialAccounts": []
   }
   ```

2. **Create a Test Post**
   ```bash
   curl -X POST https://socialmediamanager-api-production.hlpfl-co.workers.dev/api/posts \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -H "Content-Type: application/json" \
     -d '{
       "content": "My first post from the Social Media Manager!",
       "platforms": ["twitter", "linkedin"]
     }'
   ```
   
   Expected response:
   ```json
   {
     "success": true,
     "post": {
       "id": 1,
       "content": "My first post from the Social Media Manager!",
       "platforms": ["twitter", "linkedin"],
       "media_urls": [],
       "status": "draft"
     }
   }
   ```

3. **Verify Post Was Created**
   ```bash
   wrangler d1 execute socialmediamanager-db --command="SELECT id, content, status FROM posts;" --env production
   ```
   
   Expected output:
   ```
   ┌────┬──────────────────────────────────────────────┬────────┐
   │ id │ content                                       │ status │
   ├────┼──────────────────────────────────────────────┼────────┤
   │ 1  │ My first post from the Social Media Manager! │ draft  │
   └────┴──────────────────────────────────────────────┴────────┘
   ```

4. **Get All Posts**
   ```bash
   curl https://socialmediamanager-api-production.hlpfl-co.workers.dev/api/posts \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```
   
   Expected response:
   ```json
   {
     "posts": [
       {
         "id": 1,
         "user_id": 1,
         "content": "My first post from the Social Media Manager!",
         "platforms": ["twitter", "linkedin"],
         "media_urls": [],
         "status": "draft",
         "created_at": "2024-12-17T12:34:56.000Z"
       }
     ]
   }
   ```

### Step 13: Test Frontend in Browser

1. **Open Your Application**
   - Visit: https://socialmediamanager-api-production.hlpfl-co.workers.dev
   - Or: https://hlpfl.space (if custom domain is configured)

2. **Test Registration**
   - Click "Register" tab
   - Enter email: `user2@example.com`
   - Enter password: `SecurePass123!`
   - Enter name: `Second User`
   - Click "Register"
   - You should be logged in automatically

3. **Test Login**
   - Refresh the page
   - Enter email: `user2@example.com`
   - Enter password: `SecurePass123!`
   - Click "Login"
   - You should see the dashboard

4. **Test Post Creation**
   - Click "Create Post" in sidebar
   - Enter some text: `Testing the post creation feature!`
   - Select platforms: Twitter, LinkedIn
   - Click "Publish Post"
   - You should see a success message

5. **Verify Dashboard Updates**
   - Click "Dashboard" in sidebar
   - You should see:
     - Total Posts: 1
     - Recent Posts showing your post

### Step 14: Test Multiple Users

1. **Create Second User via API**
   ```bash
   curl -X POST https://socialmediamanager-api-production.hlpfl-co.workers.dev/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "user3@example.com",
       "password": "AnotherPass123!",
       "name": "Third User"
     }'
   ```
   
   Save the token from the response.

2. **Create Post as Second User**
   ```bash
   curl -X POST https://socialmediamanager-api-production.hlpfl-co.workers.dev/api/posts \
     -H "Authorization: Bearer SECOND_USER_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "content": "Post from second user!",
       "platforms": ["facebook"]
     }'
   ```

3. **Verify User Isolation**
   
   Get posts for first user:
   ```bash
   curl https://socialmediamanager-api-production.hlpfl-co.workers.dev/api/posts \
     -H "Authorization: Bearer FIRST_USER_TOKEN"
   ```
   
   Should only show first user's posts.
   
   Get posts for second user:
   ```bash
   curl https://socialmediamanager-api-production.hlpfl-co.workers.dev/api/posts \
     -H "Authorization: Bearer SECOND_USER_TOKEN"
   ```
   
   Should only show second user's posts.
   
   ✅ If each user only sees their own posts, user isolation is working!

4. **Verify in Database**
   ```bash
   wrangler d1 execute socialmediamanager-db --command="SELECT u.name, p.content FROM posts p JOIN users u ON p.user_id = u.id;" --env production
   ```
   
   Expected output:
   ```
   ┌─────────────┬──────────────────────────────────────────────┐
   │ name        │ content                                       │
   ├─────────────┼──────────────────────────────────────────────┤
   │ Test User   │ My first post from the Social Media Manager! │
   │ Third User  │ Post from second user!                       │
   └─────────────┴──────────────────────────────────────────────┘
   ```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: "Database not found"

**Symptoms**:
```
Error: D1 database with ID '...' not found
```

**Solution**:
1. List your databases:
   ```bash
   wrangler d1 list
   ```
2. Copy the correct database ID
3. Update `wrangler.toml`:
   ```toml
   [[d1_databases]]
   database_id = "YOUR-CORRECT-ID-HERE"
   ```
4. Redeploy:
   ```bash
   npm run deploy:production
   ```

#### Issue 2: "Invalid token" or "No token provided"

**Symptoms**:
```json
{"error": "Invalid token"}
```

**Solution**:
1. Make sure JWT_SECRET is set:
   ```bash
   wrangler secret list --env production
   ```
2. If not listed, set it:
   ```bash
   wrangler secret put JWT_SECRET --env production
   ```
3. Redeploy:
   ```bash
   npm run deploy:production
   ```
4. Get a new token by logging in again

#### Issue 3: "CORS error" in browser

**Symptoms**:
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Solution**:
1. Update `wrangler.toml`:
   ```toml
   [env.production]
   vars = { 
     ALLOWED_ORIGINS = "https://hlpfl.space,https://socialmediamanager-api-production.hlpfl-co.workers.dev"
   }
   ```
2. Add your domain to the list
3. Redeploy:
   ```bash
   npm run deploy:production
   ```

#### Issue 4: "Table already exists" when applying schema

**Symptoms**:
```
Error: table users already exists
```

**Solution**:
This is actually fine! It means the tables are already created. You can verify:
```bash
wrangler d1 execute socialmediamanager-db --command="SELECT name FROM sqlite_master WHERE type='table';" --env production
```

If you need to start fresh:
```bash
# Drop all tables (CAUTION: This deletes all data!)
wrangler d1 execute socialmediamanager-db --command="DROP TABLE IF EXISTS analytics;" --env production
wrangler d1 execute socialmediamanager-db --command="DROP TABLE IF EXISTS media_files;" --env production
wrangler d1 execute socialmediamanager-db --command="DROP TABLE IF EXISTS posts;" --env production
wrangler d1 execute socialmediamanager-db --command="DROP TABLE IF EXISTS social_accounts;" --env production
wrangler d1 execute socialmediamanager-db --command="DROP TABLE IF EXISTS users;" --env production

# Then reapply schema
wrangler d1 execute socialmediamanager-db --file=./schema.sql --env production
```

#### Issue 5: "Invalid credentials" when logging in

**Symptoms**:
```json
{"error": "Invalid credentials"}
```

**Solutions**:
1. Make sure you're using the correct email and password
2. Passwords are case-sensitive
3. If you just deployed, old passwords won't work (they were plain text)
4. Register a new user or reset the password

#### Issue 6: Deployment fails with "Authentication error"

**Symptoms**:
```
Error: Authentication error
```

**Solution**:
1. Re-authenticate:
   ```bash
   wrangler logout
   wrangler login
   ```
2. Verify authentication:
   ```bash
   wrangler whoami
   ```
3. Try deploying again

#### Issue 7: "Module not found" errors

**Symptoms**:
```
Error: Cannot find module 'hono'
```

**Solution**:
1. Reinstall dependencies:
   ```bash
   cd cloudflare
   rm -rf node_modules package-lock.json
   npm install
   ```
2. Redeploy:
   ```bash
   npm run deploy:production
   ```

---

## Next Steps

### Immediate Actions

1. **Save Your Credentials**
   - JWT_SECRET (you generated this)
   - Cloudflare API Token
   - Database ID
   - Worker URL

2. **Test All Features**
   - User registration
   - User login
   - Post creation
   - Dashboard viewing
   - Multiple users

3. **Monitor Your Application**
   ```bash
   wrangler tail --env production
   ```
   
   This shows live logs from your Worker.

### Short-term Improvements

1. **Add Custom Domain** (if you haven't)
   - Go to Cloudflare Dashboard
   - Workers & Pages > socialmediamanager-api-production
   - Settings > Triggers > Add Custom Domain
   - Enter: `hlpfl.space`

2. **Set Up Social Media OAuth**
   - Get API credentials from:
     - Twitter: https://developer.twitter.com/
     - LinkedIn: https://www.linkedin.com/developers/
     - Facebook: https://developers.facebook.com/
     - Instagram: https://developers.facebook.com/
   - Add credentials as Wrangler secrets

3. **Implement Password Reset**
   - Add email service (e.g., SendGrid, Mailgun)
   - Create password reset endpoint
   - Add reset flow to frontend

### Long-term Enhancements

1. **Real Social Media Integration**
   - Implement OAuth flows
   - Connect to actual APIs
   - Post to real platforms

2. **Advanced Features**
   - Post scheduling
   - Media upload to R2
   - Analytics dashboard
   - Team collaboration

3. **Testing & Monitoring**
   - Add automated tests
   - Set up error monitoring
   - Configure alerts

---

## Verification Checklist

Use this checklist to verify everything is working:

- [ ] Wrangler is installed and authenticated
- [ ] D1 database exists and has correct ID
- [ ] Database schema is applied (5 tables created)
- [ ] GitHub secret CLOUDFLARE_API_TOKEN is set
- [ ] Wrangler secret JWT_SECRET is set
- [ ] Worker is deployed successfully
- [ ] Health check endpoint returns "healthy"
- [ ] Database status endpoint returns "connected: true"
- [ ] User registration works (returns token)
- [ ] Password is hashed in database (starts with $2a$ or $2b$)
- [ ] User login works (returns token)
- [ ] Wrong password is rejected
- [ ] Dashboard endpoint works with token
- [ ] Post creation works
- [ ] Posts are saved to database
- [ ] Frontend loads in browser
- [ ] Can register via frontend
- [ ] Can login via frontend
- [ ] Can create posts via frontend
- [ ] Multiple users can have separate posts
- [ ] User isolation is working (users only see their own posts)

---

## Support

If you encounter any issues not covered in this guide:

1. **Check the logs**:
   ```bash
   wrangler tail --env production
   ```

2. **Review documentation**:
   - DEPLOYMENT.md
   - SECURITY.md
   - FIXES_SUMMARY.md

3. **Common commands**:
   ```bash
   # View all secrets
   wrangler secret list --env production
   
   # View database tables
   wrangler d1 execute socialmediamanager-db --command="SELECT name FROM sqlite_master WHERE type='table';" --env production
   
   # View all users
   wrangler d1 execute socialmediamanager-db --command="SELECT id, email, name FROM users;" --env production
   
   # View all posts
   wrangler d1 execute socialmediamanager-db --command="SELECT id, content, status FROM posts;" --env production
   
   # Redeploy
   npm run deploy:production
   ```

---

**Congratulations! Your Social Media Manager is now fully deployed and ready to use! 🎉**

---

**Last Updated**: December 17, 2024
**Version**: 2.0.0
**Status**: Production Ready