const express = require('express');
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const SocialAccount = require('../models/SocialAccount');
const scheduler = require('../services/scheduler');
const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { content, mediaUrls, platforms, scheduledFor, tags, categories } = req.body;

    if (!content || !platforms || platforms.length === 0) {
      return res.status(400).json({ error: 'Content and at least one platform are required' });
    }

    const socialAccounts = await SocialAccount.find({
      userId: req.user._id,
      platform: { $in: platforms },
      isActive: true
    });

    if (socialAccounts.length === 0) {
      return res.status(400).json({ error: 'No active social accounts found for selected platforms' });
    }

    const post = new Post({
      userId: req.user._id,
      content,
      mediaUrls: mediaUrls || [],
      platforms,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      tags: tags || [],
      categories: categories || []
    });

    if (scheduledFor) {
      post.status = 'scheduled';
    } else {
      post.status = 'draft';
    }

    await post.save();

    if (post.status === 'scheduled') {
      await scheduler.publishPost(post);
    }

    res.status(201).json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, platform } = req.query;
    const skip = (page - 1) * limit;

    const filter = { userId: req.user._id };
    if (status) filter.status = status;
    if (platform) filter.platforms = platform;

    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

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
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { content, mediaUrls, platforms, scheduledFor, tags, categories } = req.body;
    
    const post = await Post.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.status === 'posted') {
      return res.status(400).json({ error: 'Cannot edit already published post' });
    }

    if (content) post.content = content;
    if (mediaUrls) post.mediaUrls = mediaUrls;
    if (platforms) post.platforms = platforms;
    if (tags) post.tags = tags;
    if (categories) post.categories = categories;

    if (scheduledFor) {
      const scheduledDate = new Date(scheduledFor);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ error: 'Scheduled time must be in the future' });
      }
      post.scheduledFor = scheduledDate;
      post.status = 'scheduled';
    } else if (post.status !== 'draft') {
      post.status = 'draft';
      post.scheduledFor = null;
    }

    await post.save();

    if (post.status === 'scheduled') {
      await scheduler.publishPost(post);
    }

    res.json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.status === 'posted') {
      return res.status(400).json({ error: 'Cannot delete already published post' });
    }

    await Post.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/publish', auth, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.status === 'posted') {
      return res.status(400).json({ error: 'Post already published' });
    }

    post.status = 'pending';
    await post.save();

    await scheduler.publishPost(post);

    const updatedPost = await Post.findById(req.params.id);

    res.json({
      success: true,
      post: updatedPost
    });
  } catch (error) {
    console.error('Publish post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/schedule', auth, async (req, res) => {
  try {
    const { scheduledTime } = req.body;
    
    if (!scheduledTime) {
      return res.status(400).json({ error: 'Scheduled time is required' });
    }

    const scheduledDate = new Date(scheduledTime);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ error: 'Scheduled time must be in the future' });
    }

    const post = await Post.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.status === 'posted') {
      return res.status(400).json({ error: 'Cannot schedule already published post' });
    }

    post.status = 'scheduled';
    post.scheduledFor = scheduledDate;
    await post.save();

    res.json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Schedule post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/scheduled/list', auth, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const result = await scheduler.getScheduledPosts(req.user._id, parseInt(limit));
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      success: true,
      posts: result.posts
    });
  } catch (error) {
    console.error('Get scheduled posts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const originalPost = await Post.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!originalPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const duplicatedPost = new Post({
      userId: req.user._id,
      content: originalPost.content,
      mediaUrls: [...originalPost.mediaUrls],
      platforms: [...originalPost.platforms],
      tags: [...originalPost.tags],
      categories: [...originalPost.categories],
      status: 'draft'
    });

    await duplicatedPost.save();

    res.status(201).json({
      success: true,
      post: duplicatedPost
    });
  } catch (error) {
    console.error('Duplicate post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;