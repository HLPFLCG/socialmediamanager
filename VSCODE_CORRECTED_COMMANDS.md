# 🔧 Corrected VSCode Setup Commands

## ✅ Issue Fixed

The directory structure shows the social media manager is at `/workspace/socialmediamanager/`. Here are the corrected commands:

---

## 🚀 Step 1: Clone Repository in VSCode

### If starting from scratch:
```bash
# Clone the repository (from any directory)
git clone https://github.com/HLPFLCG/socialmediamanager.git

# Navigate to the project
cd socialmediamanager

# Switch to the clean branch
git checkout fix/security-and-modernization

# Open in VSCode
code .
```

### If you already have it cloned:
```bash
# Navigate to your existing clone
cd socialmediamanager

# Ensure you're on the right branch
git checkout fix/security-and-modernization

# Pull latest changes
git pull origin fix/security-and-modernization

# Open in VSCode
code .
```

---

## 🚀 Step 2: Deploy to Cloudflare

Once you have the project open in VSCode terminal:

```bash
# Navigate to cloudflare directory (from project root)
cd cloudflare

# Make deploy script executable
chmod +x ../deploy.sh

# Run the deployment script
../deploy.sh
```

### Or run from project root:
```bash
# From socialmediamanager directory
./deploy.sh
```

---

## 🚀 Step 3: Manual Deployment (Alternative)

If the script doesn't work:

```bash
# Navigate to cloudflare directory
cd cloudflare

# Login to Cloudflare
npx wrangler login

# Set JWT secret
npx wrangler secret put JWT_SECRET --env production
# When prompted, enter: your-super-secret-jwt-key

# Deploy to production
npx wrangler deploy --env production
```

---

## 📁 File Structure to Verify

In VSCode, you should see:

```
socialmediamanager/
├── cloudflare/
│   ├── src/
│   │   ├── index.js              ✅ Clean backend
│   │   ├── additional-endpoints.js ✅ Support files
│   │   └── d1-service.js         ✅ Database
│   ├── wrangler.toml            ✅ Config
│   └── schema.sql                ✅ Database schema
├── frontend/
│   ├── index.html                ✅ HTML with favicon
│   ├── app.js                   ✅ Clean JavaScript
│   ├── styles.css               ✅ Dark theme
│   └── logo.png                 ✅ Logo
├── deploy.sh                    ✅ Deployment script
└── VSCODE_SETUP_GUIDE.md        ✅ Documentation
```

---

## 🔍 Troubleshooting Directory Issues

### If "cd socialmediamanager" doesn't work:

1. **Check current directory:**
   ```bash
   pwd
   ```

2. **List directories:**
   ```bash
   ls -la
   ```

3. **Find the project:**
   ```bash
   find . -name "socialmediamanager" -type d
   ```

4. **Navigate to full path:**
   ```bash
   cd /path/to/your/socialmediamanager
   ```

### Common issues:
- You might be in the wrong starting directory
- The project might be cloned in a different location
- You might need to use the full path

---

## 🎯 Quick Test Commands

Once deployed:

```bash
# Test backend health
curl https://socialmediamanager-api-production.hlpfl-co.workers.dev/api/health

# Should return: {"status":"ok","timestamp":"..."}
```

---

## 🌐 Expected Results

After successful deployment:

- ✅ Frontend: https://hlpfl.space
- ✅ Backend: https://socialmediamanager-api-production.hlpfl-co.workers.dev
- ✅ Working login/register
- ✅ No more page reloads
- ✅ Favicon in browser tab

---

## 📞 If Commands Still Don't Work

1. **Check Git status:**
   ```bash
   git status
   ```

2. **Verify branch:**
   ```bash
   git branch
   ```

3. **Check Node.js version:**
   ```bash
   node --version  # Should be 18+
   ```

4. **Check npm:**
   ```bash
   npm --version
   ```

The corrected commands should work perfectly for your VSCode setup! 🚀