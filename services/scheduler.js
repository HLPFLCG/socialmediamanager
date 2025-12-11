const cron = require('node-cron');
const Post = require('../models/Post');
const SocialAccount = require('../models/SocialAccount');
const twitterService = require('./twitterService');
const linkedinService = require('./linkedinService');
const facebookService = require('./facebookService');
const logger = require('../utils/logger');
const redis = require('../config/redis');

class Scheduler {
  constructor() {
    this.isRunning = false;
    this.processingLock = 'scheduler:processing';
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting social media post scheduler');

    cron.schedule('* * * * *', async () => {
      await this.processScheduledPosts();
    });

    cron.schedule('0 */6 * * *', async () => {
      await this.updatePostMetrics();
    });

    cron.schedule('0 0 * * *', async () => {
      await this.cleanupFailedPosts();
    });

    logger.info('Scheduler started successfully');
  }

  async stop() {
    this.isRunning = false;
    logger.info('Scheduler stopped');
  }

  async processScheduledPosts() {
    try {
      const lock = await redis.get(this.processingLock);
      if (lock) {
        return;
      }

      await redis.setex(this.processingLock, 50, 'true');

      const now = new Date();
      const scheduledPosts = await Post.find({
        status: 'scheduled',
        scheduledFor: { $lte: now }
      }).populate('userId');

      if (scheduledPosts.length === 0) {
        await redis.del(this.processingLock);
        return;
      }

      logger.info(`Processing ${scheduledPosts.length} scheduled posts`);

      for (const post of scheduledPosts) {
        await this.publishPost(post);
      }

      await redis.del(this.processingLock);
    } catch (error) {
      logger.error('Error processing scheduled posts:', error);
      await redis.del(this.processingLock);
    }
  }

  async publishPost(post) {
    try {
      post.status = 'pending';
      await post.save();

      const socialAccounts = await SocialAccount.find({
        userId: post.userId,
        platform: { $in: post.platforms },
        isActive: true
      });

      for (const platform of post.platforms) {
        const account = socialAccounts.find(acc => acc.platform === platform);
        if (!account) {
          this.updatePlatformPostStatus(post, platform, 'failed', 'Account not found or inactive');
          continue;
        }

        const result = await this.publishToPlatform(post, account);
        
        if (result.success) {
          this.updatePlatformPostStatus(post, platform, 'posted', null, result.postId);
          account.lastPosted = new Date();
          account.postCount += 1;
          await account.save();
        } else {
          this.updatePlatformPostStatus(post, platform, 'failed', result.error);
        }
      }

      const allPosted = post.platformPosts.every(p => p.status === 'posted');
      const anyPosted = post.platformPosts.some(p => p.status === 'posted');

      if (allPosted) {
        post.status = 'posted';
        post.postedAt = new Date();
      } else if (anyPosted) {
        post.status = 'posted';
        post.postedAt = new Date();
      } else {
        post.status = 'failed';
      }

      await post.save();

      logger.info(`Post ${post._id} processed with status: ${post.status}`);
    } catch (error) {
      logger.error(`Error publishing post ${post._id}:`, error);
      post.status = 'failed';
      await post.save();
    }
  }

  async publishToPlatform(post, account) {
    switch (account.platform) {
      case 'twitter':
        return await twitterService.postTweet(post.content, post.mediaUrls);
      case 'linkedin':
        return await linkedinService.postToLinkedIn(account.accessToken, post.content);
      case 'facebook':
        return await facebookService.postToFacebook(account.platformId, account.accessToken, post.content, post.mediaUrls);
      case 'instagram':
        if (post.mediaUrls.length > 0) {
          return await facebookService.postToInstagram(account.platformId, account.accessToken, post.content, post.mediaUrls[0]);
        } else {
          return { success: false, error: 'Instagram requires at least one media file' };
        }
      default:
        return { success: false, error: 'Unsupported platform' };
    }
  }

  updatePlatformPostStatus(post, platform, status, error = null, postId = null) {
    const platformPost = post.platformPosts.find(p => p.platform === platform);
    if (platformPost) {
      platformPost.status = status;
      platformPost.error = error;
      platformPost.postedAt = status === 'posted' ? new Date() : undefined;
      if (postId) {
        platformPost.platformPostId = postId;
      }
    } else {
      post.platformPosts.push({
        platform,
        status,
        error,
        postedAt: status === 'posted' ? new Date() : undefined,
        platformPostId: postId
      });
    }
  }

  async updatePostMetrics() {
    try {
      const posts = await Post.find({
        status: 'posted',
        postedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      for (const post of posts) {
        for (const platformPost of post.platformPosts) {
          if (platformPost.status === 'posted' && platformPost.platformPostId) {
            await this.updatePlatformMetrics(post, platformPost);
          }
        }
      }

      await Post.bulkSave(posts);
      logger.info(`Updated metrics for ${posts.length} posts`);
    } catch (error) {
      logger.error('Error updating post metrics:', error);
    }
  }

  async updatePlatformMetrics(post, platformPost) {
    try {
      let metrics = null;

      switch (platformPost.platform) {
        case 'twitter':
          const twitterResult = await twitterService.getTweetMetrics(platformPost.platformPostId);
          if (twitterResult.success) {
            metrics = {
              likes: twitterResult.metrics.like_count || 0,
              shares: twitterResult.metrics.retweet_count || 0,
              comments: twitterResult.metrics.reply_count || 0,
              views: twitterResult.metrics.impression_count || 0
            };
          }
          break;
        case 'facebook':
        case 'linkedin':
          break;
      }

      if (metrics) {
        platformPost.metrics = {
          ...platformPost.metrics,
          ...metrics
        };
      }
    } catch (error) {
      logger.error(`Error updating metrics for ${platformPost.platform} post:`, error);
    }
  }

  async cleanupFailedPosts() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      await Post.deleteMany({
        status: 'failed',
        createdAt: { $lt: thirtyDaysAgo }
      });

      logger.info('Cleaned up old failed posts');
    } catch (error) {
      logger.error('Error cleaning up failed posts:', error);
    }
  }

  async schedulePost(postId, scheduledTime) {
    try {
      const post = await Post.findById(postId);
      if (!post) {
        throw new Error('Post not found');
      }

      if (scheduledTime <= new Date()) {
        throw new Error('Scheduled time must be in the future');
      }

      post.status = 'scheduled';
      post.scheduledFor = scheduledTime;
      await post.save();

      logger.info(`Post ${postId} scheduled for ${scheduledTime}`);
      return { success: true };
    } catch (error) {
      logger.error('Error scheduling post:', error);
      return { success: false, error: error.message };
    }
  }

  async getScheduledPosts(userId, limit = 20) {
    try {
      const posts = await Post.find({
        userId,
        status: 'scheduled'
      })
      .sort({ scheduledFor: 1 })
      .limit(limit);

      return { success: true, posts };
    } catch (error) {
      logger.error('Error getting scheduled posts:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new Scheduler();