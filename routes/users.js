const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const SocialAccount = require('../models/SocialAccount');
const Post = require('../models/Post');
const router = express.Router();

router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const [totalPosts, scheduledPosts, publishedPosts, connectedAccounts, recentPosts] = await Promise.all([
      Post.countDocuments({ userId }),
      Post.countDocuments({ userId, status: 'scheduled' }),
      Post.countDocuments({ userId, status: 'posted' }),
      SocialAccount.countDocuments({ userId, isActive: true }),
      Post.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('content status createdAt platforms')
    ]);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const postsLast30Days = await Post.countDocuments({
      userId,
      createdAt: { $gte: thirtyDaysAgo }
    });

    const accountsByPlatform = await SocialAccount.aggregate([
      { $match: { userId, isActive: true } },
      { $group: { _id: '$platform', count: { $sum: 1 } } }
    ]);

    const platformBreakdown = accountsByPlatform.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const engagementStats = await Post.aggregate([
      { $match: { userId, status: 'posted' } },
      { $unwind: '$platformPosts' },
      { $match: { 'platformPosts.status': 'posted' } },
      { $group: {
        _id: null,
        totalLikes: { $sum: '$platformPosts.metrics.likes' },
        totalShares: { $sum: '$platformPosts.metrics.shares' },
        totalComments: { $sum: '$platformPosts.metrics.comments' },
        totalViews: { $sum: '$platformPosts.metrics.views' }
      }}
    ]);

    const stats = engagementStats[0] || {
      totalLikes: 0,
      totalShares: 0,
      totalComments: 0,
      totalViews: 0
    };

    res.json({
      success: true,
      dashboard: {
        overview: {
          totalPosts,
          scheduledPosts,
          publishedPosts,
          connectedAccounts,
          postsLast30Days
        },
        platformBreakdown,
        engagement: stats,
        recentPosts
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      settings: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
        timezone: user.timezone,
        subscription: user.subscription
      }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/settings', auth, async (req, res) => {
  try {
    const { firstName, lastName, avatar, timezone } = req.body;
    const updateData = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (timezone) updateData.timezone = timezone;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      settings: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
        timezone: user.timezone,
        subscription: user.subscription
      }
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/subscription', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('subscription');
    
    const subscriptionPlans = {
      free: {
        name: 'Free',
        posts: 30,
        accounts: 3,
        scheduling: true,
        analytics: false,
        priority: 1
      },
      pro: {
        name: 'Pro',
        posts: 300,
        accounts: 10,
        scheduling: true,
        analytics: true,
        priority: 2
      },
      enterprise: {
        name: 'Enterprise',
        posts: -1,
        accounts: -1,
        scheduling: true,
        analytics: true,
        priority: 3
      }
    };

    const currentPlan = subscriptionPlans[user.subscription];

    res.json({
      success: true,
      subscription: {
        current: user.subscription,
        plan: currentPlan
      }
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/activity', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, action } = req.query;
    const skip = (page - 1) * limit;

    const filter = { userId: req.user._id };
    if (action) filter.status = action;

    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('content status createdAt platforms postedAt scheduledFor');

    const total = await Post.countDocuments(filter);

    res.json({
      success: true,
      activities: posts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;