# 🧹 Cloudflare Cleanup & Setup Guide

## Current Situation

You have 4 Cloudflare projects:
1. **socialmediamanager-frontend**
2. **socialmediamanager-api** (has hlpfl.space domain)
3. **socialmediamanager-api-production** (backend Worker)
4. **socialmediamanager**

## 🎯 Goal

- Clean up unused projects
- Keep only what's needed
- Get https://hlpfl.space working with the login screen

---

## 📋 Step 1: Identify Each Project

Go to https://dash.cloudflare.com → Workers & Pages

For each project, note:
- Type (Worker or Pages)
- URL
- Last deployment date
- GitHub connection

### Expected Results:

| Project | Type | Purpose | Action |
|---------|------|---------|--------|
| socialmediamanager-api-production | Worker | Backend API ✅ | **KEEP** |
| socialmediamanager-api | Worker/Pages | Old/duplicate | **DELETE** |
| socialmediamanager-frontend | Pages | Old frontend | **DELETE** |
| socialmediamanager | Worker/Pages | Unknown | **CHECK FIRST** |

---

## 🗑️ Step 2: Delete Unused Projects

### How to Delete a Project:

1. Go to the project in Cloudflare Dashboard
2. Click **Settings** tab
3. Scroll to bottom
4. Click **Delete** button
5. Confirm deletion

### Projects to Delete:

#### A) Delete: **socialmediamanager-frontend**
- Reason: Old/unused frontend
- Safe to delete: Yes

#### B) Delete: **socialmediamanager-api** (if it's a Worker)
- Reason: Duplicate of socialmediamanager-api-production
- Safe to delete: Yes
- **BUT FIRST**: Remove the hlpfl.space domain from this project

#### C) Check: **socialmediamanager**
- If it's not being used → Delete
- If it has important data → Keep temporarily

---

## 🔧 Step 3: Remove Domain from Old Project

Before deleting **socialmediamanager-api**:

1. Go to **socialmediamanager-api** project
2. Click **Settings** tab
3. Find **Custom domains** section
4. Remove **hlpfl.space** domain
5. Click **Save**

---

## 🚀 Step 4: Set Up New Pages Project

### Option A: Use Existing Project (If socialmediamanager-api is Pages)

1. Go to **socialmediamanager-api** project
2. Click **Settings** → **Builds & deployments**
3. Change **Source** to GitHub: **HLPFLCG/socialmediamanager**
4. Set **Production branch**: `fix/security-and-modernization`
5. Set **Build output directory**: `frontend`
6. Remove any build command
7. Save and redeploy

### Option B: Create New Pages Project (Recommended)

1. Go to **Workers & Pages** → **Pages**
2. Click **Create application** → **Connect to Git**
3. Select **HLPFLCG/socialmediamanager**
4. Configure:
   ```
   Project name: hlpfl-social-media-manager
   Production branch: fix/security-and-modernization
   Build command: (empty)
   Build output directory: frontend
   ```
5. Click **Save and Deploy**
6. After deployment, add custom domain: **hlpfl.space**

---

## ✅ Step 5: Final Configuration

### A) Verify Backend API
- URL: https://socialmediamanager-api-production.hlpfl-co.workers.dev
- Status: Should be working
- Test: `curl https://socialmediamanager-api-production.hlpfl-co.workers.dev/`

### B) Verify Frontend
- URL: https://hlpfl.space
- Should show: Login screen
- Test: Open in browser

### C) Update CORS if Needed
If you get CORS errors, update the Worker's wrangler.toml:
```toml
ALLOWED_ORIGINS = "https://hlpfl.space,https://socialmediamanager-api-production.hlpfl-co.workers.dev"
```

---

## 🎯 Final State

After cleanup, you should have:

### ✅ KEEP:
1. **socialmediamanager-api-production** (Worker)
   - Purpose: Backend API
   - URL: https://socialmediamanager-api-production.hlpfl-co.workers.dev

2. **hlpfl-social-media-manager** (Pages) - NEW
   - Purpose: Frontend
   - URL: https://hlpfl.space
   - Connected to: GitHub repo

### ❌ DELETED:
1. socialmediamanager-frontend
2. socialmediamanager-api (or repurposed)
3. socialmediamanager (if unused)

---

## 🧪 Testing Checklist

After cleanup:

- [ ] Visit https://hlpfl.space
- [ ] See login screen
- [ ] Register new account
- [ ] Login successfully
- [ ] Dashboard loads
- [ ] Can create test post
- [ ] No console errors

---

## 🆘 Troubleshooting

### Issue: "Domain already in use"
**Solution**: Remove domain from old project first

### Issue: "404 Not Found"
**Solution**: Check build output directory is set to `frontend`

### Issue: "CORS errors"
**Solution**: Update ALLOWED_ORIGINS in Worker

### Issue: "Can't delete project"
**Solution**: Remove custom domains first, then delete

---

## 📞 Quick Reference

- **Backend API**: https://socialmediamanager-api-production.hlpfl-co.workers.dev
- **Frontend**: https://hlpfl.space
- **Repository**: https://github.com/HLPFLCG/socialmediamanager
- **Branch**: fix/security-and-modernization
- **Frontend files**: `/frontend` directory

---

## 🎊 Summary

1. Delete unused projects (2-3 projects)
2. Keep backend Worker (socialmediamanager-api-production)
3. Create new Pages project for frontend
4. Point hlpfl.space to new Pages project
5. Test and verify everything works

**Total time: 10-15 minutes**