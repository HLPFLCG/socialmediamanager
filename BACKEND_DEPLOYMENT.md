# 🔧 Backend Deployment - Cloudflare Worker

## **Quick Backend Deployment**

### **Step 1: Update Backend Code**
First, you need to merge the new API endpoints into your main worker file:

```bash
# Navigate to cloudflare directory
cd /path/to/socialmediamanager/cloudflare

# Backup original file
cp src/index.js src/index.js.backup

# Merge additional endpoints
cat src/additional-endpoints.js >> src/index.js
```

### **Step 2: Install Wrangler**
```bash
# Choose one option:
npm install -g wrangler
# OR
sudo npm install -g wrangler
# OR
npx wrangler --version
```

### **Step 3: Authenticate**
```bash
wrangler login
# This opens browser for authentication
```

### **Step 4: Deploy**
```bash
# Deploy to production
wrangler deploy --env production

# You should see output like:
# Published your-worker.your-subdomain.workers.dev
```

### **Step 5: Set Secrets**
```bash
# Set JWT secret
wrangler secret put JWT_SECRET
# Enter your secure JWT secret when prompted

# Set other secrets if needed
wrangler secret put CLOUDFLARE_API_TOKEN
```

### **Step 6: Test API**
```bash
# Test health endpoint
curl https://your-worker.your-subdomain.workers.dev/api/health

# Test new analytics endpoint
curl https://your-worker.your-subdomain.workers.dev/api/analytics
```

## **🎯 Your Backend is Now Live!**

**Worker URL**: `https://your-worker.your-subdomain.workers.dev`

**New API Endpoints Available**:
- `/api/analytics` - Get analytics data
- `/api/posts/schedule` - Schedule posts
- `/api/posts/scheduled` - Get scheduled posts
- `/api/user/settings` - User profile management
- `/api/user/change-password` - Change password
- `/api/social/accounts/:id` - Disconnect social accounts

**Next**: Follow the frontend deployment steps below! ⬇️