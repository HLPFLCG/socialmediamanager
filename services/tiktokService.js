const axios = require('axios');

class TikTokService {
    constructor() {
        this.baseURL = 'https://open.tiktokapis.com/v2';
        this.clientKey = process.env.TIKTOK_CLIENT_KEY;
        this.clientSecret = process.env.TIKTOK_CLIENT_SECRET;
        this.accessToken = null;
    }

    // Get authorization URL for OAuth
    getAuthUrl(redirectUri) {
        const scopes = [
            'user.info.basic',
            'video.list',
            'video.upload'
        ].join(',');

        return `https://www.tiktok.com/v2/auth/authorize/?client_key=${this.clientKey}&scope=${scopes}&response_type=code&redirect_uri=${redirectUri}`;
    }

    // Exchange authorization code for access token
    async getAccessToken(code, redirectUri) {
        try {
            const response = await axios.post(`${this.baseURL}/oauth/token/`, {
                client_key: this.clientKey,
                client_secret: this.clientSecret,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri
            });

            this.accessToken = response.data.access_token;
            return response.data;
        } catch (error) {
            throw new Error(`TikTok auth failed: ${error.response?.data?.message || error.message}`);
        }
    }

    // Get user information
    async getUserInfo() {
        try {
            const response = await axios.get(`${this.baseURL}/user/info/`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to get TikTok user info: ${error.response?.data?.message || error.message}`);
        }
    }

    // Upload video to TikTok
    async uploadVideo(videoBuffer, caption, hashtags = []) {
        try {
            // First, initialize upload
            const initResponse = await axios.post(`${this.baseURL}/video/upload/`, {
                video_size: videoBuffer.length,
                chunk_size: 1048576, // 1MB chunks
                total_chunk_count: Math.ceil(videoBuffer.length / 1048576)
            }, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const { upload_url, video_id } = initResponse.data.data;

            // Upload video in chunks
            const chunkSize = 1048576;
            const totalChunks = Math.ceil(videoBuffer.length / chunkSize);

            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                const start = chunkIndex * chunkSize;
                const end = Math.min(start + chunkSize, videoBuffer.length);
                const chunk = videoBuffer.slice(start, end);

                await axios.put(upload_url, chunk, {
                    headers: {
                        'Content-Range': `bytes ${start}-${end - 1}/${videoBuffer.length}`,
                        'Content-Type': 'application/octet-stream'
                    }
                });
            }

            // Publish the video with caption and hashtags
            const publishResponse = await axios.post(`${this.baseURL}/video/publish/`, {
                video_id: video_id,
                caption: `${caption} ${hashtags.map(tag => `#${tag}`).join(' ')}`,
                privacy_level: 'public_to_everyone',
                allow_duet: true,
                allow_stitch: true,
                comment_disabled: false
            }, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return publishResponse.data;
        } catch (error) {
            throw new Error(`TikTok video upload failed: ${error.response?.data?.message || error.message}`);
        }
    }

    // Get user's video list
    async getVideoList(maxCount = 20) {
        try {
            const response = await axios.get(`${this.baseURL}/video/list/?max_count=${maxCount}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to get TikTok video list: ${error.response?.data?.message || error.message}`);
        }
    }

    // Get video analytics
    async getVideoAnalytics(videoId) {
        try {
            const response = await axios.get(`${this.baseURL}/video/analytics/?video_id=${videoId}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to get TikTok video analytics: ${error.response?.data?.message || error.message}`);
        }
    }

    // Get hashtag suggestions based on content
    async getHashtagSuggestions(content) {
        // TikTok doesn't have a hashtag suggestion API, so we'll use a basic algorithm
        const commonHashtags = [
            'fyp', 'foryou', 'viral', 'trending', 'tiktok', 'socialmedia',
            'contentcreator', 'digitalmarketing', 'business', 'entrepreneur'
        ];

        const words = content.toLowerCase().split(/\s+/);
        const relevantHashtags = [];

        // Extract potential hashtags from content
        words.forEach(word => {
            if (word.length > 3 && !word.startsWith('#')) {
                relevantHashtags.push(word.replace(/[^a-zA-Z0-9]/g, ''));
            }
        });

        // Combine with common hashtags and return top 5
        return [...new Set([...relevantHashtags.slice(0, 3), ...commonHashtags.slice(0, 2)])];
    }

    // Check if content meets TikTok guidelines
    validateContent(content, videoBuffer) {
        const errors = [];

        // Check video length (15 seconds to 10 minutes for most accounts)
        // Note: This would need video duration analysis, simplified for now
        if (videoBuffer.length > 100 * 1024 * 1024) { // 100MB limit
            errors.push('Video size exceeds 100MB limit');
        }

        // Check caption length (max 150 characters for TikTok)
        if (content.length > 150) {
            errors.push('Caption exceeds 150 character limit');
        }

        // Check for restricted content
        const restrictedWords = ['spam', 'scam', 'illegal', 'violence'];
        const lowerContent = content.toLowerCase();
        
        restrictedWords.forEach(word => {
            if (lowerContent.includes(word)) {
                errors.push(`Content contains restricted word: ${word}`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = TikTokService;