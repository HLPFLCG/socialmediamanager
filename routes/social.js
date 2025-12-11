const express = require('express');
const auth = require('../middleware/auth');
const SocialAccount = require('../models/SocialAccount');
const twitterService = require('../services/twitterService');
const linkedinService = require('../services/linkedinService');
const facebookService = require('../services/facebookService');
const TikTokService = require('../services/tiktokService');
const InstagramService = require('../services/instagramService');
const YouTubeService = require('../services/youtubeService');

const tikTokService = new TikTokService();
const instagramService = new InstagramService();
const youtubeService = new YouTubeService();
const router = express.Router();

router.get('/accounts', auth, async (req, res) => {
  try {
    const accounts = await SocialAccount.find({ 
      userId: req.user._id,
      isActive: true 
    }).sort({ platform: 1, username: 1 });

    res.json({
      success: true,
      accounts
    });
  } catch (error) {
    console.error('Get social accounts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/connect', auth, async (req, res) => {
  try {
    const { platform, accessToken, refreshToken, platformId, username, displayName } = req.body;

    if (!platform || !accessToken || !platformId || !username) {
      return res.status(400).json({ error: 'Platform, access token, platform ID, and username are required' });
    }

    const existingAccount = await SocialAccount.findOne({
      userId: req.user._id,
      platform,
      platformId
    });

    if (existingAccount) {
      existingAccount.accessToken = accessToken;
      existingAccount.refreshToken = refreshToken;
      existingAccount.isActive = true;
      existingAccount.displayName = displayName || username;
      await existingAccount.save();

      return res.json({
        success: true,
        account: existingAccount,
        message: 'Account reconnected successfully'
      });
    }

    const socialAccount = new SocialAccount({
      userId: req.user._id,
      platform,
      accessToken,
      refreshToken,
      platformId,
      username,
      displayName: displayName || username
    });

    await socialAccount.save();

    res.status(201).json({
      success: true,
      account: socialAccount
    });
  } catch (error) {
    console.error('Connect social account error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/disconnect/:accountId', auth, async (req, res) => {
  try {
    const account = await SocialAccount.findOne({
      _id: req.params.accountId,
      userId: req.user._id
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    account.isActive = false;
    await account.save();

    res.json({
      success: true,
      message: 'Account disconnected successfully'
    });
  } catch (error) {
    console.error('Disconnect social account error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/auth-url/:platform', auth, async (req, res) => {
  try {
    const { platform } = req.params;

    let authUrl;

    switch (platform) {
      case 'twitter':
        authUrl = twitterService.getAuthUrl();
        break;
      case 'linkedin':
        authUrl = linkedinService.getAuthUrl();
        break;
      case 'facebook':
        authUrl = facebookService.getAuthUrl();
        break;
      case 'tiktok':
        authUrl = tikTokService.getAuthUrl(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/tiktok/callback`);
        break;
      case 'instagram':
        const { type } = req.query;
        if (type === 'business') {
          authUrl = instagramService.getBusinessAuthUrl(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/instagram/callback`);
        } else {
          authUrl = instagramService.getAuthUrl(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/instagram/callback`);
        }
        break;
      case 'youtube':
        authUrl = youtubeService.getAuthUrl(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/youtube/callback`);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported platform' });
    }

    res.json({
      success: true,
      authUrl
    });
  } catch (error) {
    console.error('Get auth URL error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/auth/callback/:platform', auth, async (req, res) => {
  try {
    const { platform } = req.params;
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    let result;

    switch (platform) {
      case 'twitter':
        result = await twitterService.getAccessToken(code);
        if (result.success) {
          const profileResult = await twitterService.getUserProfile(result.accessToken, result.refreshToken);
          if (profileResult.success) {
            result.profile = profileResult.user;
          }
        }
        break;
      case 'linkedin':
        result = await linkedinService.getAccessToken(code);
        if (result.success) {
          const profileResult = await linkedinService.getUserProfile(result.accessToken);
          if (profileResult.success) {
            result.profile = profileResult.profile;
            result.email = profileResult.email;
          }
        }
        break;
      case 'facebook':
        result = await facebookService.getAccessToken(code);
        if (result.success) {
          const longLivedResult = await facebookService.getLongLivedToken(result.accessToken);
          if (longLivedResult.success) {
            result.accessToken = longLivedResult.accessToken;
          }
          
          const pagesResult = await facebookService.getUserPages(result.accessToken);
          if (pagesResult.success) {
            result.pages = pagesResult.pages;
          }
        }
        break;
      case 'tiktok':
        result = await tikTokService.getAccessToken(code, `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/tiktok/callback`);
        if (result.access_token) {
          tikTokService.accessToken = result.access_token;
          const profileResult = await tikTokService.getUserInfo();
          result.profile = profileResult.data.user;
        }
        break;
      case 'instagram':
        result = await instagramService.getAccessToken(code, `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/instagram/callback`);
        if (result.access_token) {
          const longLivedResult = await instagramService.getLongLivedToken(result.access_token);
          result.access_token = longLivedResult.access_token;
          instagramService.accessToken = longLivedResult.access_token;
          const profileResult = await instagramService.getUserProfile();
          result.profile = profileResult;
        }
        break;
      case 'youtube':
        result = await youtubeService.getAccessToken(code, `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/youtube/callback`);
        if (result.access_token) {
          youtubeService.accessToken = result.access_token;
          const profileResult = await youtubeService.getChannelInfo();
          result.profile = profileResult.items[0];
        }
        break;
      default:
        return res.status(400).json({ error: 'Unsupported platform' });
    }

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Auth callback error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/test-connection/:accountId', auth, async (req, res) => {
  try {
    const account = await SocialAccount.findOne({
      _id: req.params.accountId,
      userId: req.user._id,
      isActive: true
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found or inactive' });
    }

    let testResult;

    switch (account.platform) {
      case 'twitter':
        testResult = await twitterService.getUserProfile(account.accessToken, account.refreshToken);
        break;
      case 'linkedin':
        testResult = await linkedinService.getUserProfile(account.accessToken);
        break;
      case 'facebook':
        testResult = await facebookService.getUserPages(account.accessToken);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported platform' });
    }

    if (testResult.success) {
      res.json({
        success: true,
        message: 'Connection test successful',
        data: testResult.user || testResult.pages || testResult.profile
      });
    } else {
      res.status(400).json({
        success: false,
        error: testResult.error
      });
    }
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/platform-limits/:platform', auth, async (req, res) => {
  try {
    const { platform } = req.params;

    const limits = {
      twitter: {
        maxLength: 280,
        maxMedia: 4,
        supportedMedia: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4']
      },
      linkedin: {
        maxLength: 3000,
        maxMedia: 1,
        supportedMedia: ['image/jpeg', 'image/png', 'video/mp4']
      },
      facebook: {
        maxLength: 63206,
        maxMedia: 10,
        supportedMedia: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4']
      },
      instagram: {
        maxLength: 2200,
        maxMedia: 10,
        supportedMedia: ['image/jpeg', 'image/png', 'video/mp4'],
        requiresMedia: true
      },
      tiktok: {
        maxLength: 150,
        maxMedia: 1,
        supportedMedia: ['video/mp4'],
        requiresMedia: true,
        maxVideoSize: '100MB'
      },
      youtube: {
        maxLength: 5000,
        maxMedia: 1,
        supportedMedia: ['video/mp4'],
        requiresMedia: true,
        maxVideoSize: '256GB',
        titleRequired: true
      }
    };

    const platformLimits = limits[platform];
    if (!platformLimits) {
      return res.status(400).json({ error: 'Unsupported platform' });
    }

    res.json({
      success: true,
      limits: platformLimits
    });
  } catch (error) {
    console.error('Get platform limits error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;