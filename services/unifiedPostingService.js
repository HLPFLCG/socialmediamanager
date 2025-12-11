const TwitterService = require('./twitterService');
const LinkedInService = require('./linkedinService');
const FacebookService = require('./facebookService');
const InstagramService = require('./instagramService');
const TikTokService = require('./tiktokService');
const YouTubeService = require('./youtubeService');
const Post = require('../models/Post');
const SocialAccount = require('../models/SocialAccount');

class UnifiedPostingService {
    constructor() {
        this.services = {
            twitter: new TwitterService(),
            linkedin: new LinkedInService(),
            facebook: new FacebookService(),
            instagram: new InstagramService(),
            tiktok: new TikTokService(),
            youtube: new YouTubeService()
        };
    }

    // Post to multiple platforms simultaneously
    async postToMultiplePlatforms(userId, postData) {
        const { content, platforms, mediaFiles, scheduledTime } = postData;
        const results = [];
        const errors = [];

        try {
            // Get user's social accounts for selected platforms
            const socialAccounts = await SocialAccount.find({
                userId: userId,
                platform: { $in: platforms },
                isActive: true
            });

            // Create post record
            const post = new Post({
                userId: userId,
                content: content,
                platforms: platforms,
                mediaFiles: mediaFiles || [],
                status: scheduledTime ? 'scheduled' : 'processing',
                scheduledTime: scheduledTime
            });

            await post.save();

            // Process each platform
            for (const platform of platforms) {
                try {
                    const account = socialAccounts.find(acc => acc.platform === platform);
                    if (!account) {
                        throw new Error(`No connected ${platform} account found`);
                    }

                    const result = await this.postToPlatform(
                        platform, 
                        account, 
                        content, 
                        mediaFiles
                    );

                    results.push({
                        platform,
                        success: true,
                        data: result
                    });

                    // Update post record with platform result
                    post.platformResults.push({
                        platform,
                        status: 'posted',
                        postedAt: new Date(),
                        platformPostId: result.id || result.postId,
                        platformUrl: result.url || result.permalink
                    });

                } catch (error) {
                    const errorMsg = `${platform} error: ${error.message}`;
                    errors.push(errorMsg);

                    results.push({
                        platform,
                        success: false,
                        error: error.message
                    });

                    post.platformResults.push({
                        platform,
                        status: 'failed',
                        error: error.message,
                        attemptedAt: new Date()
                    });
                }
            }

            // Update post status
            if (errors.length === 0) {
                post.status = 'posted';
                post.postedAt = new Date();
            } else if (results.length > 0) {
                post.status = 'partial';
            } else {
                post.status = 'failed';
            }

            await post.save();

            return {
                success: errors.length === 0,
                results: results,
                errors: errors,
                postId: post._id
            };

        } catch (error) {
            throw new Error(`Unified posting failed: ${error.message}`);
        }
    }

    // Post to a specific platform
    async postToPlatform(platform, account, content, mediaFiles) {
        const service = this.services[platform];
        
        // Set access tokens for the service
        await this.setServiceTokens(service, platform, account);

        // Get platform-specific content
        const platformContent = await this.optimizeContentForPlatform(platform, content);

        switch (platform) {
            case 'twitter':
                return await this.postToTwitter(service, platformContent, mediaFiles);
            
            case 'linkedin':
                return await this.postToLinkedIn(service, platformContent, mediaFiles);
            
            case 'facebook':
                return await this.postToFacebook(service, platformContent, mediaFiles);
            
            case 'instagram':
                return await this.postToInstagram(service, platformContent, mediaFiles);
            
            case 'tiktok':
                return await this.postToTikTok(service, platformContent, mediaFiles);
            
            case 'youtube':
                return await this.postToYouTube(service, platformContent, mediaFiles);
            
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    }

    // Set service tokens based on account
    async setServiceTokens(service, platform, account) {
        switch (platform) {
            case 'twitter':
                service.accessToken = account.accessToken;
                service.accessTokenSecret = account.refreshToken; // Using refreshToken for OAuth secret
                break;
            
            case 'linkedin':
                service.accessToken = account.accessToken;
                break;
            
            case 'facebook':
                service.accessToken = account.accessToken;
                if (account.platformData?.facebook?.pageToken) {
                    service.pageAccessToken = account.platformData.facebook.pageToken;
                }
                break;
            
            case 'instagram':
                service.accessToken = account.accessToken;
                break;
            
            case 'tiktok':
                service.accessToken = account.accessToken;
                break;
            
            case 'youtube':
                service.accessToken = account.accessToken;
                if (account.platformData?.youtube?.channelId) {
                    service.channelId = account.platformData.youtube.channelId;
                }
                break;
        }
    }

    // Optimize content for specific platform
    async optimizeContentForPlatform(platform, content) {
        const hashtags = this.extractHashtags(content);
        const cleanContent = this.removeHashtags(content);

        switch (platform) {
            case 'twitter':
                return {
                    text: this.truncateText(content, 280),
                    hashtags: hashtags.slice(0, 2) // Twitter performs better with fewer hashtags
                };
            
            case 'linkedin':
                return {
                    text: this.formatForLinkedIn(cleanContent),
                    hashtags: hashtags.slice(0, 3)
                };
            
            case 'facebook':
                return {
                    text: content,
                    hashtags: hashtags
                };
            
            case 'instagram':
                return {
                    text: cleanContent,
                    hashtags: hashtags.slice(0, 30) // Instagram allows up to 30 hashtags
                };
            
            case 'tiktok':
                return {
                    text: this.truncateText(cleanContent, 150),
                    hashtags: hashtags.slice(0, 5)
                };
            
            case 'youtube':
                return {
                    title: this.extractTitle(content),
                    description: content,
                    tags: hashtags
                };
            
            default:
                return { text: content, hashtags: hashtags };
        }
    }

    // Platform-specific posting methods
    async postToTwitter(service, content, mediaFiles) {
        let mediaIds = [];

        // Upload media if provided
        if (mediaFiles && mediaFiles.length > 0) {
            for (const mediaFile of mediaFiles) {
                const mediaResult = await service.uploadMedia(mediaFile.buffer, mediaFile.mimeType);
                mediaIds.push(mediaResult.media_id_string);
            }
        }

        // Post tweet
        const result = await service.postTweet(content.text, mediaIds);
        return {
            id: result.id_str,
            url: `https://twitter.com/i/web/status/${result.id_str}`,
            text: result.text
        };
    }

    async postToLinkedIn(service, content, mediaFiles) {
        let mediaAssets = [];

        // Upload media if provided
        if (mediaFiles && mediaFiles.length > 0) {
            for (const mediaFile of mediaFiles) {
                const mediaResult = await service.uploadImage(mediaFile.buffer);
                mediaAssets.push(mediaResult);
            }
        }

        // Post to LinkedIn
        const result = await service.sharePost(content.text, mediaAssets);
        return {
            id: result.id,
            url: result.headers?.location || '',
            text: content.text
        };
    }

    async postToFacebook(service, content, mediaFiles) {
        let mediaData = {};

        // Upload media if provided
        if (mediaFiles && mediaFiles.length > 0) {
            if (mediaFiles[0].mimeType.startsWith('video/')) {
                mediaData = await service.uploadVideo(mediaFiles[0].buffer);
            } else {
                mediaData = await service.uploadPhoto(mediaFiles[0].buffer, content.text);
            }
        }

        // Post to Facebook
        const result = await service.postPagePost(content.text, mediaData);
        return {
            id: result.id,
            url: result.post_id ? `https://facebook.com/${result.post_id}` : '',
            text: content.text
        };
    }

    async postToInstagram(service, content, mediaFiles) {
        if (!mediaFiles || mediaFiles.length === 0) {
            throw new Error('Instagram requires at least one image or video');
        }

        const mediaFile = mediaFiles[0];
        const fullCaption = `${content.text} ${content.hashtags.map(tag => `#${tag}`).join(' ')}`;

        let result;
        if (mediaFile.mimeType.startsWith('video/')) {
            result = await service.uploadVideo(mediaFile.buffer, fullCaption);
        } else {
            result = await service.uploadImage(mediaFile.buffer, fullCaption);
        }

        return {
            id: result.id,
            url: result.permalink || '',
            text: fullCaption
        };
    }

    async postToTikTok(service, content, mediaFiles) {
        if (!mediaFiles || mediaFiles.length === 0) {
            throw new Error('TikTok requires a video');
        }

        const mediaFile = mediaFiles[0];
        if (!mediaFile.mimeType.startsWith('video/')) {
            throw new Error('TikTok only supports video content');
        }

        const fullCaption = `${content.text} ${content.hashtags.map(tag => `#${tag}`).join(' ')}`;
        const result = await service.uploadVideo(mediaFile.buffer, fullCaption, content.hashtags);

        return {
            id: result.data?.video_id,
            url: '', // TikTok doesn't provide direct URLs in API response
            text: fullCaption
        };
    }

    async postToYouTube(service, content, mediaFiles) {
        if (!mediaFiles || mediaFiles.length === 0) {
            throw new Error('YouTube requires a video');
        }

        const mediaFile = mediaFiles[0];
        if (!mediaFile.mimeType.startsWith('video/')) {
            throw new Error('YouTube only supports video content');
        }

        const fullDescription = `${content.text}\n\n${content.tags.map(tag => `#${tag}`).join(' ')}`;
        const result = await service.uploadVideo(
            mediaFile.buffer,
            content.title,
            fullDescription,
            content.tags,
            'public'
        );

        return {
            id: result.id,
            url: `https://youtube.com/watch?v=${result.id}`,
            text: content.title
        };
    }

    // Content optimization utilities
    extractHashtags(content) {
        const hashtags = content.match(/#\w+/g) || [];
        return hashtags.map(tag => tag.substring(1).toLowerCase());
    }

    removeHashtags(content) {
        return content.replace(/#\w+/g, '').trim();
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    formatForLinkedIn(content) {
        // LinkedIn posts perform better with proper formatting
        return content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n\n');
    }

    extractTitle(content) {
        // Extract first line or first 60 characters as title
        const firstLine = content.split('\n')[0].trim();
        if (firstLine.length <= 60) return firstLine;
        return content.substring(0, 60).trim() + '...';
    }

    // Get posting analytics across all platforms
    async getUnifiedAnalytics(userId, startDate, endDate) {
        try {
            const posts = await Post.find({
                userId: userId,
                status: 'posted',
                postedAt: { $gte: startDate, $lte: endDate }
            }).populate('platformResults');

            const analytics = {
                totalPosts: posts.length,
                platforms: {},
                engagement: {
                    totalLikes: 0,
                    totalComments: 0,
                    totalShares: 0,
                    totalViews: 0
                },
                bestPerformingPlatforms: [],
                postingTimes: []
            };

            posts.forEach(post => {
                post.platformResults.forEach(result => {
                    if (!analytics.platforms[result.platform]) {
                        analytics.platforms[result.platform] = {
                            posts: 0,
                            successful: 0,
                            failed: 0,
                            totalEngagement: 0
                        };
                    }

                    analytics.platforms[result.platform].posts++;
                    if (result.status === 'posted') {
                        analytics.platforms[result.platform].successful++;
                    } else if (result.status === 'failed') {
                        analytics.platforms[result.platform].failed++;
                    }
                });

                // Track posting times for optimization
                if (post.postedAt) {
                    analytics.postingTimes.push(post.postedAt.getHours());
                }
            });

            return analytics;
        } catch (error) {
            throw new Error(`Analytics failed: ${error.message}`);
        }
    }

    // Get best posting times based on historical data
    async getBestPostingTimes(userId) {
        try {
            const posts = await Post.find({
                userId: userId,
                status: 'posted'
            });

            // Analyze posting times and engagement patterns
            const hourAnalytics = {};
            
            for (let hour = 0; hour < 24; hour++) {
                hourAnalytics[hour] = {
                    posts: 0,
                    avgEngagement: 0,
                    totalEngagement: 0
                };
            }

            posts.forEach(post => {
                const hour = post.postedAt.getHours();
                hourAnalytics[hour].posts++;
                // Add engagement calculation here based on platform metrics
            });

            // Sort by average engagement
            const bestHours = Object.entries(hourAnalytics)
                .filter(([_, data]) => data.posts >= 3) // Only consider hours with at least 3 posts
                .sort((a, b) => b[1].avgEngagement - a[1].avgEngagement)
                .slice(0, 5)
                .map(([hour, _]) => parseInt(hour));

            return bestHours;
        } catch (error) {
            throw new Error(`Best posting times analysis failed: ${error.message}`);
        }
    }
}

module.exports = UnifiedPostingService;