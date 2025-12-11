const axios = require('axios');

class InstagramService {
    constructor() {
        this.baseURL = 'https://graph.instagram.com';
        this.baseURLFB = 'https://graph.facebook.com';
        this.appId = process.env.INSTAGRAM_APP_ID;
        this.appSecret = process.env.INSTAGRAM_APP_SECRET;
        this.accessToken = null;
        this.pageId = null;
    }

    // Get authorization URL for Instagram Basic Display API
    getAuthUrl(redirectUri) {
        const scopes = [
            'user_profile',
            'user_media'
        ].join(',');

        return `https://api.instagram.com/oauth/authorize?client_id=${this.appId}&redirect_uri=${redirectUri}&scope=${scopes}&response_type=code`;
    }

    // Get Facebook Page authorization URL for Instagram Business API
    getBusinessAuthUrl(redirectUri) {
        const scopes = [
            'instagram_basic',
            'instagram_content_publish',
            'pages_show_list',
            'pages_read_engagement',
            'business_management'
        ].join(',');

        return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${this.appId}&redirect_uri=${redirectUri}&scope=${scopes}&response_type=code`;
    }

    // Exchange authorization code for access token
    async getAccessToken(code, redirectUri) {
        try {
            const response = await axios.post(`https://api.instagram.com/oauth/access_token`, {
                client_id: this.appId,
                client_secret: this.appSecret,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
                code: code
            });

            this.accessToken = response.data.access_token;
            return response.data;
        } catch (error) {
            throw new Error(`Instagram auth failed: ${error.response?.data?.error_message || error.message}`);
        }
    }

    // Get long-lived access token
    async getLongLivedToken(shortLivedToken) {
        try {
            const response = await axios.get(`${this.baseURL}/access_token`, {
                params: {
                    grant_type: 'ig_exchange_token',
                    client_secret: this.appSecret,
                    access_token: shortLivedToken
                }
            });

            this.accessToken = response.data.access_token;
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get long-lived token: ${error.response?.data?.error_message || error.message}`);
        }
    }

    // Get user profile information
    async getUserProfile() {
        try {
            const response = await axios.get(`${this.baseURL}/me`, {
                params: {
                    fields: 'id,username,account_type,media_count,followers_count,follows_count'
                },
                paramsSerializer: {
                    indexes: null
                }
            });

            // Add authorization header
            response.config.headers = {
                'Authorization': `Bearer ${this.accessToken}`
            };

            return response.data;
        } catch (error) {
            throw new Error(`Failed to get Instagram profile: ${error.response?.data?.error_message || error.message}`);
        }
    }

    // Get user's media
    async getUserMedia(limit = 20) {
        try {
            const response = await axios.get(`${this.baseURL}/me/media`, {
                params: {
                    fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count',
                    limit: limit
                },
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to get Instagram media: ${error.response?.data?.error_message || error.message}`);
        }
    }

    // Create Instagram media container (for posts and stories)
    async createMediaContainer(imageUrl, caption, mediaType = 'IMAGE') {
        try {
            const response = await axios.post(`${this.baseURL}/me/media`, {
                image_url: imageUrl,
                caption: caption,
                media_type: mediaType
            }, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to create Instagram media container: ${error.response?.data?.error_message || error.message}`);
        }
    }

    // Create Instagram media container with video
    async createVideoMediaContainer(videoUrl, caption) {
        try {
            const response = await axios.post(`${this.baseURL}/me/media`, {
                video_url: videoUrl,
                caption: caption,
                media_type: 'VIDEO'
            }, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to create Instagram video container: ${error.response?.data?.error_message || error.message}`);
        }
    }

    // Publish media to Instagram
    async publishMedia(mediaId) {
        try {
            const response = await axios.post(`${this.baseURL}/me/media_publish`, {
                creation_id: mediaId
            }, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to publish Instagram media: ${error.response?.data?.error_message || error.message}`);
        }
    }

    // Get Instagram business accounts for a Facebook page
    async getBusinessAccounts(pageAccessToken) {
        try {
            const response = await axios.get(`${this.baseURLFB}/me/accounts`, {
                params: {
                    fields: 'id,name,instagram_business_account'
                },
                headers: {
                    'Authorization': `Bearer ${pageAccessToken}`
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to get business accounts: ${error.response?.data?.error_message || error.message}`);
        }
    }

    // Get Instagram business account insights
    async getBusinessInsights(businessAccountId, metric = 'impressions', period = 'day') {
        try {
            const response = await axios.get(`${this.baseURL}/${businessAccountId}/insights`, {
                params: {
                    metric: metric,
                    period: period
                },
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to get Instagram insights: ${error.response?.data?.error_message || error.message}`);
        }
    }

    // Upload image to Instagram (requires uploading to a publicly accessible URL first)
    async uploadImage(imageBuffer, caption) {
        // Note: Instagram requires images to be hosted on a public URL
        // This is a simplified version - in production, you'd upload to a cloud storage service
        try {
            // For demo purposes, we'll assume image is uploaded and returns a public URL
            const imageUrl = await this.uploadToCloudStorage(imageBuffer);
            
            const container = await this.createMediaContainer(imageUrl, caption);
            const result = await this.publishMedia(container.id);
            
            return result;
        } catch (error) {
            throw new Error(`Instagram image upload failed: ${error.message}`);
        }
    }

    // Upload video to Instagram
    async uploadVideo(videoBuffer, caption) {
        try {
            const videoUrl = await this.uploadToCloudStorage(videoBuffer);
            
            const container = await this.createVideoMediaContainer(videoUrl, caption);
            
            // Wait for video processing
            await this.waitForMediaProcessing(container.id);
            
            const result = await this.publishMedia(container.id);
            return result;
        } catch (error) {
            throw new Error(`Instagram video upload failed: ${error.message}`);
        }
    }

    // Check media processing status
    async getMediaStatus(mediaId) {
        try {
            const response = await axios.get(`${this.baseURL}/${mediaId}`, {
                params: {
                    fields: 'status_code'
                },
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to get media status: ${error.response?.data?.error_message || error.message}`);
        }
    }

    // Wait for media to finish processing
    async waitForMediaProcessing(mediaId, maxWaitTime = 60000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            const status = await this.getMediaStatus(mediaId);
            
            if (status.status_code === 'FINISHED') {
                return true;
            } else if (status.status_code === 'ERROR') {
                throw new Error('Media processing failed');
            }
            
            // Wait 2 seconds before checking again
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        throw new Error('Media processing timeout');
    }

    // Helper method to upload file to cloud storage (placeholder)
    async uploadToCloudStorage(fileBuffer) {
        // In production, this would upload to AWS S3, Google Cloud Storage, or similar
        // For now, return a placeholder URL
        return `https://your-cdn.com/uploads/${Date.now()}.jpg`;
    }

    // Get hashtag suggestions based on content
    async getHashtagSuggestions(content) {
        const businessHashtags = [
            'business', 'entrepreneur', 'startup', 'marketing', 'digitalmarketing',
            'socialmedia', 'contentmarketing', 'branding', 'success', 'motivation',
            'instagood', 'photooftheday', 'instadaily', 'bestoftheday'
        ];

        const words = content.toLowerCase().split(/\s+/);
        const relevantHashtags = [];

        // Extract relevant keywords
        words.forEach(word => {
            if (word.length > 3 && !word.startsWith('#') && !['the', 'and', 'for', 'are', 'with'].includes(word)) {
                relevantHashtags.push(word.replace(/[^a-zA-Z0-9]/g, ''));
            }
        });

        // Return unique hashtags (max 30 for Instagram)
        return [...new Set([...relevantHashtags.slice(0, 10), ...businessHashtags.slice(0, 20)])];
    }

    // Validate content for Instagram
    validateContent(content, mediaBuffer) {
        const errors = [];

        // Check caption length (max 2200 characters for Instagram)
        if (content.length > 2200) {
            errors.push('Caption exceeds 2200 character limit');
        }

        // Check hashtag count (max 30)
        const hashtagCount = (content.match(/#/g) || []).length;
        if (hashtagCount > 30) {
            errors.push('Too many hashtags (max 30 allowed)');
        }

        // Check file size (images: max 30MB, videos: max 100MB)
        if (mediaBuffer.length > 100 * 1024 * 1024) {
            errors.push('File size exceeds Instagram limits');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Get media insights
    async getMediaInsights(mediaId) {
        try {
            const response = await axios.get(`${this.baseURL}/${mediaId}/insights`, {
                params: {
                    metric: 'impressions,reach,likes,comments,shares,saves'
                },
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to get media insights: ${error.response?.data?.error_message || error.message}`);
        }
    }
}

module.exports = InstagramService;