const { ObjectId } = require('mongodb');

class Post {
    constructor(db) {
        this.collection = db.collection('posts');
    }

    // Create a new post
    async create(postData) {
        try {
            const post = {
                userId: new ObjectId(postData.userId),
                content: postData.content || '',
                platforms: postData.platforms || [],
                mediaFiles: postData.mediaFiles || [],
                status: postData.scheduledTime ? 'scheduled' : 'draft',
                scheduledTime: postData.scheduledTime || null,
                postedAt: null,
                metrics: {
                    reach: 0,
                    likes: 0,
                    comments: 0,
                    shares: 0,
                    clicks: 0
                },
                platformPostIds: {}, // Store platform-specific post IDs
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await this.collection.insertOne(post);
            post._id = result.insertedId;

            return post;
        } catch (error) {
            throw error;
        }
    }

    // Get posts for a user
    async getUserPosts(userId, options = {}) {
        try {
            const {
                page = 1,
                limit = 20,
                status = null,
                platform = null,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = options;

            const query = { userId: new ObjectId(userId) };
            
            if (status) {
                query.status = status;
            }
            
            if (platform) {
                query.platforms = platform;
            }

            const skip = (page - 1) * limit;
            const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

            const posts = await this.collection
                .find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .toArray();

            const total = await this.collection.countDocuments(query);

            return {
                posts,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            throw error;
        }
    }

    // Get single post by ID
    async getById(postId, userId) {
        try {
            const post = await this.collection.findOne({
                _id: new ObjectId(postId),
                userId: new ObjectId(userId)
            });

            if (!post) {
                throw new Error('Post not found');
            }

            return post;
        } catch (error) {
            throw error;
        }
    }

    // Update post
    async update(postId, userId, updateData) {
        try {
            const allowedUpdates = ['content', 'platforms', 'mediaFiles', 'scheduledTime', 'status'];
            const updates = {};
            
            Object.keys(updateData).forEach(key => {
                if (allowedUpdates.includes(key)) {
                    updates[key] = updateData[key];
                }
            });

            updates.updatedAt = new Date();

            const result = await this.collection.updateOne(
                { 
                    _id: new ObjectId(postId),
                    userId: new ObjectId(userId)
                },
                { $set: updates }
            );

            if (result.matchedCount === 0) {
                throw new Error('Post not found');
            }

            return await this.getById(postId, userId);
        } catch (error) {
            throw error;
        }
    }

    // Publish post (mark as posted and set postedAt)
    async publish(postId, userId, platformPostIds = {}) {
        try {
            const result = await this.collection.updateOne(
                { 
                    _id: new ObjectId(postId),
                    userId: new ObjectId(userId)
                },
                { 
                    $set: { 
                        status: 'posted',
                        postedAt: new Date(),
                        platformPostIds: platformPostIds,
                        updatedAt: new Date()
                    }
                }
            );

            if (result.matchedCount === 0) {
                throw new Error('Post not found');
            }

            return await this.getById(postId, userId);
        } catch (error) {
            throw error;
        }
    }

    // Update post metrics
    async updateMetrics(postId, userId, metrics) {
        try {
            const updateData = {};
            
            Object.keys(metrics).forEach(key => {
                if (['reach', 'likes', 'comments', 'shares', 'clicks'].includes(key)) {
                    updateData[`metrics.${key}`] = metrics[key];
                }
            });

            updateData.updatedAt = new Date();

            const result = await this.collection.updateOne(
                { 
                    _id: new ObjectId(postId),
                    userId: new ObjectId(userId)
                },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                throw new Error('Post not found');
            }

            return await this.getById(postId, userId);
        } catch (error) {
            throw error;
        }
    }

    // Delete post
    async delete(postId, userId) {
        try {
            const result = await this.collection.deleteOne({
                _id: new ObjectId(postId),
                userId: new ObjectId(userId)
            });

            if (result.deletedCount === 0) {
                throw new Error('Post not found');
            }

            return { success: true };
        } catch (error) {
            throw error;
        }
    }

    // Get scheduled posts that need to be published
    async getScheduledPostsToPublish() {
        try {
            const now = new Date();
            
            const posts = await this.collection.find({
                status: 'scheduled',
                scheduledTime: { $lte: now }
            }).toArray();

            return posts;
        } catch (error) {
            throw error;
        }
    }

    // Get user's analytics
    async getUserAnalytics(userId, timeframe = '30days') {
        try {
            const now = new Date();
            let startDate;

            switch (timeframe) {
                case '7days':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30days':
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                case '90days':
                    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            }

            const posts = await this.collection.find({
                userId: new ObjectId(userId),
                createdAt: { $gte: startDate }
            }).toArray();

            const analytics = {
                totalPosts: posts.length,
                publishedPosts: posts.filter(p => p.status === 'posted').length,
                scheduledPosts: posts.filter(p => p.status === 'scheduled').length,
                totalReach: posts.reduce((sum, p) => sum + (p.metrics?.reach || 0), 0),
                totalLikes: posts.reduce((sum, p) => sum + (p.metrics?.likes || 0), 0),
                totalComments: posts.reduce((sum, p) => sum + (p.metrics?.comments || 0), 0),
                totalShares: posts.reduce((sum, p) => sum + (p.metrics?.shares || 0), 0),
                totalClicks: posts.reduce((sum, p) => sum + (p.metrics?.clicks || 0), 0),
                platformBreakdown: {},
                dailyBreakdown: {}
            };

            // Platform breakdown
            posts.forEach(post => {
                post.platforms.forEach(platform => {
                    if (!analytics.platformBreakdown[platform]) {
                        analytics.platformBreakdown[platform] = 0;
                    }
                    analytics.platformBreakdown[platform]++;
                });
            });

            // Daily breakdown
            posts.forEach(post => {
                const date = post.createdAt.toISOString().split('T')[0];
                if (!analytics.dailyBreakdown[date]) {
                    analytics.dailyBreakdown[date] = 0;
                }
                analytics.dailyBreakdown[date]++;
            });

            // Calculate engagement rate
            const totalEngagement = analytics.totalLikes + analytics.totalComments + analytics.totalShares;
            analytics.engagementRate = analytics.totalReach > 0 ? 
                ((totalEngagement / analytics.totalReach) * 100).toFixed(2) : 0;

            return analytics;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Post;