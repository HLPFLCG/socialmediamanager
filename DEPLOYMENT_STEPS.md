# 🚀 Social Media Manager - Deployment Steps

## **Step 1: Deploy Backend (Cloudflare Worker)**

### **1.1 Install Wrangler CLI**
```bash
# Option 1: Global install (recommended)
npm install -g wrangler

# Option 2: Use npx without installation
npx wrangler --version

# Option 3: Quick fix with sudo (if permission issues)
sudo npm install -g wrangler
```

### **1.2 Authenticate with Cloudflare**
```bash
wrangler login
# This will open your browser to authenticate
```

### **1.3 Update Backend Code**
You need to integrate the new API endpoints into your main backend file:

```bash
# Navigate to the project
cd /path/to/socialmediamanager/cloudflare

# Copy the additional endpoints into your main file
cat src/additional-endpoints.js >> src/index.js
```

### **1.4 Deploy the Worker**
```bash
# Deploy to production
wrangler deploy --env production

# Or deploy to staging first
wrangler deploy --env staging
```

### **1.5 Set Environment Variables**
```bash
# Set JWT secret
wrangler secret put JWT_SECRET

# Set database binding (if using D1)
wrangler d1 execute socialmediamanager-db --file=schema.sql
```

---

## **Step 2: Deploy Frontend (Cloudflare Pages)**

### **2.1 Create Cloudflare Pages Project**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Pages** → **Create a project**
3. Connect to your GitHub account
4. Select repository: `HLPFLCG/socialmediamanager`
5. Choose branch: `fix/security-and-modernization`

### **2.2 Configure Build Settings**
```
Framework preset: HTML
Build command: (leave empty)
Build output directory: frontend
Root directory: / (root)
```

### **2.3 Environment Variables**
Add these environment variables in Cloudflare Pages:
```
API_URL=https://your-worker.your-subdomain.workers.dev
JWT_SECRET=your-jwt-secret-here
```

### **2.4 Custom Domain (Optional)**
1. In Pages settings, add custom domain: `hlpfl.space`
2. Update DNS records as instructed by Cloudflare
3. Wait for SSL certificate to propagate

---

## **Step 3: Testing & Verification**

### **3.1 Test Backend API**
```bash
# Test if worker is running
curl https://your-worker.your-subdomain.workers.dev/api/health

# Test authentication
curl -X POST https://your-worker.your-subdomain.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### **3.2 Test Frontend**
1. Visit your deployed site
2. Test login functionality
3. Create a test post
4. Check analytics dashboard
5. Verify all features work

### **3.3 Final Checklist**
- [ ] Backend API responds correctly
- [ ] Frontend loads without errors
- [ ] Login/registration works
- [ ] Post creation functions
- [ ] Analytics dashboard displays data
- [ ] Settings page saves changes
- [ ] Mobile responsive design works
- [ ] Custom domain (if configured) works

---

## **Step 4: Common Issues & Solutions**

### **Authentication Issues**
```bash
# Clear browser cache and local storage
localStorage.clear()
sessionStorage.clear()
```

### **CORS Issues**
Ensure your `wrangler.toml` has correct CORS configuration:
```toml
[env.production]
vars = { ENVIRONMENT = "production" }

[[env.production.kv_namespaces]]
binding = "KV_NAMESPACE"
id = "your-kv-id"
```

### **Database Connection**
```bash
# Verify D1 database is bound correctly
wrangler d1 info socialmediamanager-db
```

---

## **🎯 Quick Start Commands**

```bash
# 1. Clone and setup
git clone https://github.com/HLPFLCG/socialmediamanager.git
cd socialmediamanager
git checkout fix/security-and-modernization

# 2. Deploy backend
cd cloudflare
wrangler login
wrangler deploy --env production

# 3. Configure frontend (via Cloudflare Dashboard)
# - Connect GitHub repo
# - Set build output to "frontend"
# - Add environment variables

# 4. Test and go live! 🚀
```

## **📞 Support**

If you encounter any issues:
1. Check the logs in Cloudflare Dashboard
2. Verify environment variables are set correctly
3. Ensure all dependencies are installed
4. Test each component individually

**Estimated Total Time**: 25-30 minutes
**Difficulty**: Intermediate
**Requirements**: Cloudflare account, GitHub access