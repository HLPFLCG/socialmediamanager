# 🌩️ Cloudflare Deployment Guide

## **Option 1: Full Serverless (Recommended)**

### **Backend API - Cloudflare Workers**
```bash
cd cloudflare
npm install
wrangler deploy
```

### **Frontend - Cloudflare Pages**
1. Go to Cloudflare Dashboard → Pages
2. Connect your GitHub repo
3. Build settings:
   - Build command: `cd cloudflare && npm run build:frontend`
   - Output directory: `public`
   - Root directory: `/`

## **Option 2: Workers + D1 (Database)**

### **Setup D1 Database**
```bash
wrangler d1 create socialmediamanager-db
# Add to wrangler.toml:
[[d1_databases]]
binding = "DB"
database_name = "socialmediamanager-db"
database_id = "your-database-id"
```

## **Option 3: Workers + External Services**

### **Required Services:**
- **Database**: MongoDB Atlas or Neon PostgreSQL
- **Cache**: Upstash Redis or Cloudflare KV
- **Storage**: Cloudflare R2 for media files

## **🚀 Quick Deploy Steps**

### **1. Setup Cloudflare Workers**
```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy API
cd cloudflare
npm install
wrangler deploy
```

### **2. Configure Environment Variables**
```bash
# In Cloudflare Dashboard → Workers → Settings
TWITTER_API_KEY=your-twitter-key
TWITTER_API_SECRET=your-twitter-secret
LINKEDIN_CLIENT_ID=your-linkedin-id
FACEBOOK_APP_ID=your-facebook-app-id
MONGODB_URI=your-mongodb-connection
REDIS_URL=your-redis-url
JWT_SECRET=your-jwt-secret
```

### **3. Deploy Frontend to Pages**
1. Connect GitHub repo to Cloudflare Pages
2. Set build command: `npm run build`
3. Set output directory: `public`
4. Add environment variables

### **4. Custom Domain**
```bash
# Add custom domain in Cloudflare DNS
api.yourdomain.com → Workers
app.yourdomain.com → Pages
```

## **🔧 Configuration Files**

### **wrangler.toml** - Workers configuration
### **D1 Schema** - If using D1 database
### **R2 Bucket** - For media storage

## **💰 Cost Breakdown**

### **Free Tier:**
- Workers: 100,000 requests/day
- Pages: Unlimited bandwidth
- KV: 100,000 reads/day
- R2: 10GB storage

### **Paid Features:**
- Additional requests: $0.50/million
- Extra storage: $0.015/GB-month
- Custom domains: Free

## **🌍 Benefits of Cloudflare**

✅ **Global CDN** - Fast everywhere  
✅ **Free SSL** - Automatic HTTPS  
✅ **DDoS Protection** - Built-in security  
✅ **Edge Computing** - Low latency  
✅ **Serverless** - No server management  
✅ **GitHub Integration** - Auto-deploys  
✅ **Analytics** - Built-in monitoring  

## **🔄 CI/CD with GitHub Actions**

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Cloudflare
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Workers
        run: cd cloudflare && wrangler deploy
```

## **🎯 Production Checklist**

- [ ] Set up custom domains
- [ ] Configure DNS records  
- [ ] Add SSL certificates
- [ ] Set up monitoring
- [ ] Configure rate limiting
- [ ] Add error logging
- [ ] Set up backup strategy
- [ ] Test all integrations

## **🚨 Migration Notes**

- Convert Express routes to Hono framework
- Use fetch() instead of node libraries
- Replace MongoDB with D1 or external service
- Use Cloudflare KV for caching
- Store media in R2 instead of local filesystem

**Ready to deploy? Let me know which option you prefer!**