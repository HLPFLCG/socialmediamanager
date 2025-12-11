const express = require('express');
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const scheduler = require('../services/scheduler');
const router = express.Router();

router.get('/calendar', auth, async (req, res) => {
  try {
    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    const posts = await Post.find({
      userId: req.user._id,
      scheduledFor: {
        $gte: startDate,
        $lte: endDate
      }
    }).select('content platforms scheduledFor status createdAt');

    const calendarEvents = posts.map(post => ({
      id: post._id,
      title: `${post.platforms.join(', ')} - ${post.content.substring(0, 50)}...`,
      start: post.scheduledFor,
      status: post.status,
      platforms: post.platforms,
      content: post.content
    }));

    res.json({
      success: true,
      events: calendarEvents
    });
  } catch (error) {
    console.error('Calendar schedule error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/list', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, platform } = req.query;
    const skip = (page - 1) * limit;

    const filter = { 
      userId: req.user._id,
      status: { $in: ['scheduled', 'pending'] }
    };

    if (status) filter.status = status;
    if (platform) filter.platforms = platform;

    const posts = await Post.find(filter)
      .sort({ scheduledFor: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('content platforms scheduledFor status createdAt');

    const total = await Post.countDocuments(filter);

    res.json({
      success: true,
      posts,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get scheduled posts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/bulk', auth, async (req, res) => {
  try {
    const { posts, scheduledDate } = req.body;

    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      return res.status(400).json({ error: 'Posts array is required' });
    }

    if (!scheduledDate) {
      return res.status(400).json({ error: 'Scheduled date is required' });
    }

    const results = [];

    for (const postData of posts) {
      try {
        const post = new Post({
          userId: req.user._id,
          content: postData.content,
          mediaUrls: postData.mediaUrls || [],
          platforms: postData.platforms,
          scheduledFor: new Date(scheduledDate),
          status: 'scheduled',
          tags: postData.tags || [],
          categories: postData.categories || []
        });

        await post.save();
        results.push({ success: true, post });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      success: true,
      results: {
        total: posts.length,
        successful,
        failed,
        details: results
      }
    });
  } catch (error) {
    console.error('Bulk schedule error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/recurring', auth, async (req, res) => {
  try {
    const { 
      content, 
      mediaUrls, 
      platforms, 
      startDate, 
      endDate, 
      frequency, 
      interval 
    } = req.body;

    if (!content || !platforms || !startDate || !frequency) {
      return res.status(400).json({ 
        error: 'Content, platforms, start date, and frequency are required' 
      });
    }

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const intervalValue = interval || 1;

    const posts = [];
    let currentDate = new Date(start);

    while (currentDate <= end) {
      const post = new Post({
        userId: req.user._id,
        content,
        mediaUrls: mediaUrls || [],
        platforms,
        scheduledFor: new Date(currentDate),
        status: 'scheduled',
        tags: [],
        categories: []
      });

      await post.save();
      posts.push(post);

      switch (frequency) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + intervalValue);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + (7 * intervalValue));
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + intervalValue);
          break;
        default:
          currentDate.setDate(currentDate.getDate() + intervalValue);
      }
    }

    res.status(201).json({
      success: true,
      posts,
      message: `Created ${posts.length} recurring posts`
    });
  } catch (error) {
    console.error('Recurring schedule error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:postId/reschedule', auth, async (req, res) => {
  try {
    const { scheduledTime } = req.body;
    
    if (!scheduledTime) {
      return res.status(400).json({ error: 'Scheduled time is required' });
    }

    const post = await Post.findOne({ 
      _id: req.params.postId, 
      userId: req.user._id 
    });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.status === 'posted') {
      return res.status(400).json({ error: 'Cannot reschedule already published post' });
    }

    const scheduledDate = new Date(scheduledTime);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ error: 'Scheduled time must be in the future' });
    }

    post.scheduledFor = scheduledDate;
    post.status = 'scheduled';
    await post.save();

    res.json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Reschedule post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:postId', auth, async (req, res) => {
  try {
    const post = await Post.findOne({ 
      _id: req.params.postId, 
      userId: req.user._id 
    });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.status === 'posted') {
      return res.status(400).json({ error: 'Cannot delete already published post' });
    }

    await Post.findByIdAndDelete(req.params.postId);

    res.json({
      success: true,
      message: 'Scheduled post deleted successfully'
    });
  } catch (error) {
    console.error('Delete scheduled post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/optimal-times', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const engagementByHour = await Post.aggregate([
      { $match: { 
        userId: req.user._id, 
        status: 'posted', 
        postedAt: { $gte: startDate } 
      }},
      { $unwind: '$platformPosts' },
      { $match: { 'platformPosts.status': 'posted' } },
      {
        $addFields: {
          totalEngagement: { 
            $add: [
              '$platformPosts.metrics.likes', 
              '$platformPosts.metrics.shares', 
              '$platformPosts.metrics.comments'
            ] 
          },
          hour: { $hour: '$postedAt' }
        }
      },
      {
        $group: {
          _id: '$hour',
          totalEngagement: { $sum: '$totalEngagement' },
          postCount: { $sum: 1 },
          avgEngagement: { $avg: '$totalEngagement' }
        }
      },
      { $sort: { avgEngagement: -1 } }
    ]);

    const optimalTimes = engagementByHour.map(stat => ({
      hour: stat._id,
      totalEngagement: stat.totalEngagement,
      postCount: stat.postCount,
      avgEngagement: Math.round(stat.avgEngagement * 100) / 100
    }));

    res.json({
      success: true,
      optimalTimes,
      period: `${days} days`
    });
  } catch (error) {
    console.error('Optimal times error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;