# 📱 Instagram Posting Setup Guide

## 🔑 Required Instagram API Access

### Step 1: Facebook Developer Account
1. Go to: https://developers.facebook.com/
2. Click "Create App" 
3. Choose "Business" app type
4. Add "Instagram Basic Display" product
5. Add "Instagram Graph API" for business features

### Step 2: Instagram App Configuration
```
App ID: Get from Facebook Developers
App Secret: Get from Facebook Developers
Redirect URI: https://hlpfl.space/auth/instagram/callback
```

### Step 3: Instagram Account Requirements
- Instagram Business Account (recommended) OR
- Instagram Creator Account
- Must be connected to a Facebook Page

## 🚀 Two Ways to Post on Instagram

### Option A: Instagram Basic Display API (Personal)
- ✅ Post photos and videos
- ✅ Get user profile info
- ❌ Limited analytics
- ❌ No hashtag suggestions
- ✅ Easier to set up

### Option B: Instagram Graph API (Business) 
- ✅ Advanced posting features
- ✅ Rich analytics and insights
- ✅ Hashtag performance tracking
- ✅ Multiple account management
- ❌ Requires Business account

## 📋 Setup Instructions

### 1. Get Instagram Credentials

**In Facebook Developers:**
```bash
# These go into your Cloudflare Workers environment variables
INSTAGRAM_APP_ID=your_app_id_here
INSTAGRAM_APP_SECRET=your_app_secret_here
```

### 2. Configure Instagram Account Type

**For Personal Account:**
1. Convert to Creator Account: Settings → Account → Switch to Professional Account
2. Choose "Creator" (not "Business")

**For Business Account:**
1. Connect to Facebook Page
2. Verify Business verification if needed

### 3. Add Environment Variables

In your Cloudflare Workers dashboard, add:
```env
INSTAGRAM_APP_ID=your_app_id
INSTAGRAM_APP_SECRET=your_app_secret
```

### 4. Test Instagram Connection

Once set up, test by:
1. Go to: https://hlpfl.space
2. Click "Accounts"
3. Click "Connect Instagram"
4. Authorize the app
5. Try posting!

## 🎯 Instagram Posting Features

### What You Can Post:
- ✅ **Photos**: JPG, PNG (max 30MB)
- ✅ **Videos**: MP4 (max 100MB, 60 seconds)
- ✅ **Stories**: Photos and videos
- ✅ **Reels**: Short videos
- ✅ **Carousels**: Multiple images

### Content Requirements:
- **Caption**: Up to 2,200 characters
- **Hashtags**: Up to 30 per post
- **Mentions**: @username format
- **Media**: At least 1 image/video required

### Best Practices:
- 📸 **High-quality images** (1080x1080px recommended)
- 🎵 **Engaging captions** with questions
- #️⃣ **15-30 relevant hashtags**
- ⏰ **Post during peak hours** (usually 6-8pm)
- 💬 **Engage with comments** quickly

## 🛠️ Troubleshooting

### Common Issues:

**"Instagram requires media" Error:**
- Instagram ALWAYS requires an image or video
- Cannot post text-only content

**"Invalid redirect URI" Error:**
- Make sure redirect URI matches exactly in Facebook Developers
- Should be: `https://hlpfl.space/auth/instagram/callback`

**"Insufficient permissions" Error:**
- Check you requested correct scopes:
  - `user_profile` (basic)
  - `user_media` (basic)
  - `instagram_content_publish` (business)

**Media upload fails:**
- Check file size limits
- Verify supported formats
- Ensure internet connection is stable

## 🔧 Advanced Setup

### Instagram Business Account Setup:
1. **Create Facebook Page**: If you don't have one
2. **Connect Instagram**: Settings → Account → Linked Accounts
3. **Switch to Business**: Professional Account → Business
4. **Add Business Info**: Category, contact info, etc.

### Instagram Graph API Scopes:
```javascript
// Advanced permissions for business features
const scopes = [
  'instagram_basic',
  'instagram_content_publish', 
  'instagram_manage_comments',
  'instagram_manage_insights',
  'pages_show_list',
  'business_management'
];
```

## 📊 Analytics Available

Once connected, you can track:
- **Impressions**: How many times your post was seen
- **Reach**: Unique accounts that saw your post
- **Engagement**: Likes, comments, saves, shares
- **Follower Growth**: Over time
- **Best Times**: When your audience is most active
- **Top Posts**: Your best-performing content

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Instagram appears in connected accounts
- ✅ Can upload media in composer
- ✅ Post button is enabled when media selected
- ✅ Posts appear successfully on Instagram
- ✅ Analytics show in dashboard

---

## 🆘 Need Help?

If you get stuck:
1. Check Facebook Developers app status
2. Verify Instagram account type
3. Ensure correct redirect URI
4. Test with a simple photo first
5. Check browser console for errors

**🎯 Once set up, you'll be able to schedule and post to Instagram just like Hootsuite!**