# 🌐 Unified Domain Setup Guide

## 🎯 Goal: Everything on `hlpfl.space`

**Current Status:**
- ✅ API: `https://api.hlpfl.space` 
- ✅ Workers: Updated to serve frontend
- ⏳ Frontend: Need to add custom domain

## 📋 Step-by-Step Instructions

### 1. **Add Custom Domain to Cloudflare Pages**
In your Cloudflare dashboard:

1. Go to **Pages** → **socialmediamanager-frontend**
2. Click **Custom domains** tab
3. Click **Add custom domain**
4. Enter: `hlpfl.space`
5. Click **Add domain**
6. Wait for SSL certificate (5-10 minutes)

### 2. **Verify DNS Records**
Make sure these exist in your DNS:

```
Type: A    Name: @    → 192.0.2.1    (Orange cloud)
Type: A    Name: api  → 192.0.2.1    (Orange cloud)
```

### 3. **Test Your Setup**

After DNS propagates (5-10 minutes), test these URLs:

**Main Dashboard:**
```
https://hlpfl.space
```

**Direct Dashboard:**
```
https://hlpfl.space/dashboard
```

**API Health Check:**
```
https://api.hlpfl.space/api/health
```

**API via Main Domain:**
```
https://hlpfl.space/api/health
```

## 🎯 Final URL Structure

Once complete, you'll have:

| Service | URL | Description |
|---------|-----|-------------|
| **Main App** | `https://hlpfl.space` | Enterprise dashboard |
| **Dashboard** | `https://hlpfl.space/dashboard` | Alternative dashboard URL |
| **API** | `https://api.hlpfl.space/*` | All API endpoints |
| **API (Alt)** | `https://hlpfl.space/api/*` | API via main domain |

## 🔄 How It Works

### Workers Configuration:
- **Route 1**: `api.hlpfl.space/*` → Direct API access
- **Route 2**: `hlpfl.space/api/*` → API via main domain  
- **Route 3**: `hlpfl.space/` → Frontend dashboard

### Frontend Logic:
```javascript
// Automatically detects domain and adjusts API URL
this.apiBaseUrl = window.location.origin.includes('hlpfl.space') ? '/api' : 'https://api.hlpfl.space';
```

## ✅ Benefits

1. **Professional Appearance** - Everything on `hlpfl.space`
2. **SEO Friendly** - Single domain for all content
3. **CORS Issues Eliminated** - Same-origin requests
4. **SSL Simplicity** - One certificate for everything
5. **Clean URLs** - Easy to remember and share

## 🆘 Troubleshooting

### If Frontend Still Shows Old URL:
1. Clear browser cache
2. Check Cloudflare Pages custom domain status
3. Verify DNS propagation: `dig hlpfl.space`

### If API Calls Fail:
1. Test: `https://hlpfl.space/api/health`
2. Check browser network tab for CORS errors
3. Verify Workers routes are active

### If SSL Certificate Pending:
- Wait 10-15 minutes for Cloudflare to issue certificate
- Check Cloudflare dashboard for certificate status

## 🎉 Once Complete

Your social media manager will look like a professional SaaS platform:

```
├── https://hlpfl.space/          # Main dashboard
├── https://hlpfl.space/dashboard # Alternative access
├── https://hlpfl.space/api/*     # All API endpoints
└── https://api.hlpfl.space/*     # Direct API access
```

This is how professional platforms like Hootsuite and Buffer structure their domains!

---

## 📱 Mobile Ready

The unified domain setup ensures:
- ✅ Progressive Web App (PWA) compatibility
- ✅ Mobile app store submission ready
- ✅ Professional branding
- ✅ Enterprise-level appearance

**🚀 Your platform will look like a million-dollar SaaS!**