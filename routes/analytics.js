const express = require('express');
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const SocialAccount = require('../models/SocialAccount');
const router = express.Router();

router.get('/overview', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { days = 30 } = req.query;
    
    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const [totalPosts, publishedPosts, accounts, engagement] = await Promise.all([
      Post.countDocuments({ userId, createdAt: { $gte: startDate } }),
      Post.countDocuments({ userId, status: 'posted', postedAt: { $gte: startDate } }),
      SocialAccount.countDocuments({ userId, isActive: true }),
      Post.aggregate([
        { $match: { userId, status: 'posted', postedAt: { $gte: startDate } } },
        { $unwind: '$platformPosts' },
        { $match: { 'platformPosts.status': 'posted' } },
        { $group: {
          _id: null,
          totalLikes: { $sum: '$platformPosts.metrics.likes' },
          totalShares: { $sum: '$platformPosts.metrics.shares' },
          totalComments: { $sum: '$platformPosts.metrics.comments' },
          totalViews: { $sum: '$platformPosts.metrics.views' }
        }}
      ])
    ]);

    const engagementStats = engagement[0] || {
      totalLikes: 0,
      totalShares: 0,
      totalComments: 0,
      totalViews: 0
    };

    res.json({
      success: true,
      overview: {
        totalPosts,
        publishedPosts,
        connectedAccounts: accounts,
        engagement: engagementStats,
        period: `${days} days`
      }
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/posts', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { days = 30, platform } = req.query;
    
    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const matchStage = {
      userId,
      status: 'posted',
      postedAt: { $gte: startDate }
    };

    if (platform) {
      matchStage['platformPosts.platform'] = platform;
    }

    const posts = await Post.aggregate([
      { $match: matchStage },
      { $unwind: '$platformPosts' },
      { $match: { 'platformPosts.status': 'posted' } },
      ...(platform ? [{ $match: { 'platformPosts.platform': platform } }] : []),
      {
        $project: {
          _id: 1,
          content: 1,
          postedAt: 1,
          platform: '$platformPosts.platform',
          platformPostId: '$platformPosts.platformPostId',
          metrics: '$platformPosts.metrics'
        }
      },
      { $sort: { postedAt: -1 } }
    ]);

    res.json({
      success: true,
      posts
    });
  } catch (error) {
    console.error('Posts analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/platforms', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { days = 30 } = req.query;
    
    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const platformStats = await Post.aggregate([
      { $match: { userId, status: 'posted', postedAt: { $gte: startDate } } },
      { $unwind: '$platformPosts' },
      { $match: { 'platformPosts.status': 'posted' } },
      { $group: {
        _id: '$platformPosts.platform',
        posts: { $sum: 1 },
        likes: { $sum: '$platformPosts.metrics.likes' },
        shares: { $sum: '$platformPosts.metrics.shares' },
        comments: { $sum: '$platformPosts.metrics.comments' },
        views: { $sum: '$platformPosts.metrics.views' }
      }},
      { $sort: { posts: -1 } }
    ]);

    res.json({
      success: true,
      platforms: platformStats
    });
  } catch (error) {
    console.error('Platform analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/timeline', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { days = 30 } = req.query;
    
    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const timelineStats = await Post.aggregate([
      { $match: { userId, postedAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$postedAt' },
            month: { $month: '$postedAt' },
            day: { $dayOfMonth: '$postedAt' }
          },
          totalPosts: { $sum: 1 },
          publishedPosts: {
            $sum: { $cond: [{ $eq: ['$status', 'posted'] }, 1, 0] }
          },
          scheduledPosts: {
            $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.json({
      success: true,
      timeline: timelineStats
    });
  } catch (error) {
    console.error('Timeline analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/engagement', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { days = 30, platform } = req.query;
    
    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const matchStage = {
      userId,
      status: 'posted',
      postedAt: { $gte: startDate }
    };

    if (platform) {
      matchStage['platformPosts.platform'] = platform;
    }

    const engagementStats = await Post.aggregate([
      { $match: matchStage },
      { $unwind: '$platformPosts' },
      { $match: { 'platformPosts.status': 'posted' } },
      ...(platform ? [{ $match: { 'platformPosts.platform': platform } }] : []),
      {
        $group: {
          _id: null,
          avgLikes: { $avg: '$platformPosts.metrics.likes' },
          avgShares: { $avg: '$platformPosts.metrics.shares' },
          avgComments: { $avg: '$platformPosts.metrics.comments' },
          avgViews: { $avg: '$platformPosts.metrics.views' },
          totalEngagement: { $sum: { $add: ['$platformPosts.metrics.likes', '$platformPosts.metrics.shares', '$platformPosts.metrics.comments'] } }
        }
      }
    ]);

    const topPerforming = await Post.aggregate([
      { $match: matchStage },
      { $unwind: '$platformPosts' },
      { $match: { 'platformPosts.status': 'posted' } },
      ...(platform ? [{ $match: { 'platformPosts.platform': platform } }] : []),
      {
        $addFields: {
          totalEngagement: { $add: ['$platformPosts.metrics.likes', '$platformPosts.metrics.shares', '$platformPosts.metrics.comments'] }
        }
      },
      { $sort: { totalEngagement: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 1,
          content: 1,
          postedAt: 1,
          platform: '$platformPosts.platform',
          metrics: '$platformPosts.metrics',
          totalEngagement: 1
        }
      }
    ]);

    const stats = engagementStats[0] || {
      avgLikes: 0,
      avgShares: 0,
      avgComments: 0,
      avgViews: 0,
      totalEngagement: 0
    };

    res.json({
      success: true,
      engagement: {
        averages: stats,
        topPerforming,
        period: `${days} days`
      }
    });
  } catch (error) {
    console.error('Engagement analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/export', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { format = 'json', days = 30, platform } = req.query;
    
    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const matchStage = {
      userId,
      status: 'posted',
      postedAt: { $gte: startDate }
    };

    if (platform) {
      matchStage['platformPosts.platform'] = platform;
    }

    const data = await Post.aggregate([
      { $match: matchStage },
      { $unwind: '$platformPosts' },
      { $match: { 'platformPosts.status': 'posted' } },
      ...(platform ? [{ $match: { 'platformPosts.platform': platform } }] : []),
      {
        $project: {
          content: 1,
          postedAt: 1,
          platform: '$platformPosts.platform',
          platformPostId: '$platformPosts.platformPostId',
          likes: '$platformPosts.metrics.likes',
          shares: '$platformPosts.metrics.shares',
          comments: '$platformPosts.metrics.comments',
          views: '$platformPosts.metrics.views'
        }
      },
      { $sort: { postedAt: -1 } }
    ]);

    if (format === 'csv') {
      const csv = [
        'Date,Platform,Content,Likes,Shares,Comments,Views',
        ...data.map(post => [
          post.postedAt.toISOString().split('T')[0],
          post.platform,
          `"${post.content.replace(/"/g, '""')}"`,
          post.likes || 0,
          post.shares || 0,
          post.comments || 0,
          post.views || 0
        ].join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="social-analytics-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      res.json({
        success: true,
        data,
        exportedAt: new Date().toISOString(),
        period: `${days} days`,
        platform: platform || 'all'
      });
    }
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;