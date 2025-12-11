const axios = require('axios');

class YouTubeService {
    constructor() {
        this.baseURL = 'https://www.googleapis.com/youtube/v3';
        this.uploadURL = 'https://www.googleapis.com/upload/youtube/v3';
        this.apiKey = process.env.YOUTUBE_API_KEY;
        this.accessToken = null;
        this.channelId = null;
    }

    // Get authorization URL for OAuth
    getAuthUrl(redirectUri) {
        const scopes = [
            'https://www.googleapis.com/auth/youtube.upload',
            'https://www.googleapis.com/auth/youtube.readonly',
            'https://www.googleapis.com/auth/youtubepartner'
        ];

        return `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
            `redirect_uri=${redirectUri}&` +
            `response_type=code&` +
            `scope=${scopes.join(' ')}&` +
            `access_type=offline&` +
            `prompt=consent`;
    }

    // Exchange authorization code for access token
    async getAccessToken(code, redirectUri) {
        try {
            const response = await axios.post('https://oauth2.googleapis.com/token', {
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri
            });

            this.accessToken = response.data.access_token;
            return response.data;
        } catch (error) {
            throw new Error(`YouTube auth failed: ${error.response?.data?.error_description || error.message}`);
        }
    }

    // Refresh access token
    async refreshAccessToken(refreshToken) {
        try {
            const response = await axios.post('https://oauth2.googleapis.com/token', {
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            });

            this.accessToken = response.data.access_token;
            return response.data;
        } catch (error) {
            throw new Error(`YouTube token refresh failed: ${error.response?.data?.error_description || error.message}`);
        }
    }

    // Get user's channel information
    async getChannelInfo() {
        try {
            const response = await axios.get(`${this.baseURL}/channels`, {
                params: {
                    part: 'snippet,statistics,contentDetails',
                    mine: true
                },
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            this.channelId = response.data.items[0]?.id;
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get YouTube channel: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    // Upload video to YouTube
    async uploadVideo(videoBuffer, title, description, tags = [], privacy = 'public') {
        try {
            // First, get upload URL
            const uploadResponse = await axios.post(`${this.uploadURL}/videos?uploadType=resumable&part=snippet,status`, {
                snippet: {
                    title: title,
                    description: description,
                    tags: tags,
                    categoryId: '22' // People & Blogs category
                },
                status: {
                    privacyStatus: privacy,
                    selfDeclaredMadeForKids: false
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Upload-Content-Length': videoBuffer.length,
                    'X-Upload-Content-Type': 'video/*'
                }
            });

            const uploadUrl = uploadResponse.headers.location;

            // Upload the actual video file
            const videoResponse = await axios.put(uploadUrl, videoBuffer, {
                headers: {
                    'Content-Type': 'video/*',
                    'Content-Length': videoBuffer.length
                }
            });

            return videoResponse.data;
        } catch (error) {
            throw new Error(`YouTube video upload failed: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    // Update video metadata
    async updateVideo(videoId, title, description, tags, privacy = 'public') {
        try {
            const response = await axios.put(`${this.baseURL}/videos`, {
                id: videoId,
                snippet: {
                    title: title,
                    description: description,
                    tags: tags,
                    categoryId: '22'
                },
                status: {
                    privacyStatus: privacy
                }
            }, {
                params: {
                    part: 'snippet,status'
                },
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to update YouTube video: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    // Get video details
    async getVideoDetails(videoId) {
        try {
            const response = await axios.get(`${this.baseURL}/videos`, {
                params: {
                    part: 'snippet,statistics,contentDetails,player',
                    id: videoId
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to get YouTube video: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    // Get channel videos
    async getChannelVideos(maxResults = 50) {
        try {
            const response = await axios.get(`${this.baseURL}/search`, {
                params: {
                    part: 'snippet',
                    channelId: this.channelId,
                    maxResults: maxResults,
                    order: 'date',
                    type: 'video'
                },
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to get YouTube channel videos: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    // Get video analytics
    async getVideoAnalytics(videoId, startDate, endDate) {
        try {
            const response = await axios.get(`${this.baseURL}/reports`, {
                params: {
                    ids: `channel==${this.channelId}`,
                    startDate: startDate,
                    endDate: endDate,
                    metrics: 'views,estimatedMinutesWatched,averageViewDuration,likes,dislikes,comments',
                    filters: `video==${videoId}`,
                    dimensions: 'video'
                },
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to get YouTube analytics: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    // Upload thumbnail for video
    async uploadThumbnail(videoId, thumbnailBuffer) {
        try {
            const response = await axios.post(`${this.baseURL}/thumbnails/set`, {
                videoId: videoId
            }, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            // Upload the actual thumbnail image
            const thumbnailUploadResponse = await axios.post(response.data.url, thumbnailBuffer, {
                headers: {
                    'Content-Type': 'image/jpeg',
                    'Content-Length': thumbnailBuffer.length
                }
            });

            return thumbnailUploadResponse.data;
        } catch (error) {
            throw new Error(`Failed to upload YouTube thumbnail: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    // Add video to playlist
    async addToPlaylist(playlistId, videoId) {
        try {
            const response = await axios.post(`${this.baseURL}/playlistItems`, {
                snippet: {
                    playlistId: playlistId,
                    resourceId: {
                        kind: 'youtube#video',
                        videoId: videoId
                    }
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to add video to playlist: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    // Get channel playlists
    async getPlaylists() {
        try {
            const response = await axios.get(`${this.baseURL}/playlists`, {
                params: {
                    part: 'snippet,contentDetails',
                    mine: true
                },
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to get YouTube playlists: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    // Create new playlist
    async createPlaylist(title, description = '') {
        try {
            const response = await axios.post(`${this.baseURL}/playlists`, {
                snippet: {
                    title: title,
                    description: description
                },
                status: {
                    privacyStatus: 'public'
                }
            }, {
                params: {
                    part: 'snippet,status'
                },
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to create YouTube playlist: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    // Get trending videos
    async getTrendingVideos(regionCode = 'US', categoryId = '0') {
        try {
            const response = await axios.get(`${this.baseURL}/videos`, {
                params: {
                    part: 'snippet,statistics',
                    chart: 'mostPopular',
                    regionCode: regionCode,
                    videoCategoryId: categoryId,
                    maxResults: 50
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to get trending videos: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    // Search videos
    async searchVideos(query, maxResults = 25) {
        try {
            const response = await axios.get(`${this.baseURL}/search`, {
                params: {
                    part: 'snippet',
                    q: query,
                    maxResults: maxResults,
                    type: 'video',
                    order: 'relevance'
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to search YouTube videos: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    // Get video comments
    async getVideoComments(videoId, maxResults = 20) {
        try {
            const response = await axios.get(`${this.baseURL}/commentThreads`, {
                params: {
                    part: 'snippet',
                    videoId: videoId,
                    maxResults: maxResults,
                    order: 'relevance'
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to get YouTube comments: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    // Reply to comment
    async replyToComment(parentCommentId, text) {
        try {
            const response = await axios.post(`${this.baseURL}/comments`, {
                snippet: {
                    parentId: parentCommentId,
                    textOriginal: text
                }
            }, {
                params: {
                    part: 'snippet'
                },
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Failed to reply to YouTube comment: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    // Get hashtag suggestions based on content
    async getHashtagSuggestions(content) {
        const popularYouTubeHashtags = [
            'youtube', 'youtuber', 'newvideo', 'video', 'viral',
            'trending', 'subscribe', 'like', 'comment', 'share',
            'contentcreator', 'tech', 'tutorial', 'review', 'howto',
            'education', 'learning', 'tips', 'guide', 'awesome'
        ];

        const words = content.toLowerCase().split(/\s+/);
        const relevantHashtags = [];

        // Extract relevant keywords
        words.forEach(word => {
            if (word.length > 3 && !word.startsWith('#') && !['this', 'that', 'with', 'from'].includes(word)) {
                relevantHashtags.push(word.replace(/[^a-zA-Z0-9]/g, ''));
            }
        });

        // Combine with popular hashtags and return unique suggestions
        return [...new Set([...relevantHashtags.slice(0, 8), ...popularYouTubeHashtags.slice(0, 12)])];
    }

    // Validate content for YouTube
    validateContent(content, videoBuffer) {
        const errors = [];

        // Check video length (max 12 hours for most accounts)
        // Note: This would need video duration analysis
        
        // Check file size (max 256GB)
        if (videoBuffer.length > 256 * 1024 * 1024 * 1024) {
            errors.push('Video size exceeds 256GB limit');
        }

        // Check title length (max 100 characters)
        if (content.length > 100 && content.includes('title=')) {
            errors.push('Title exceeds 100 character limit');
        }

        // Check description length (max 5000 characters)
        if (content.length > 5000) {
            errors.push('Description exceeds 5000 character limit');
        }

        // Check for restricted content
        const restrictedTerms = ['copyright', 'violence', 'hate', 'spam'];
        const lowerContent = content.toLowerCase();
        
        restrictedTerms.forEach(term => {
            if (lowerContent.includes(term)) {
                errors.push(`Content may violate YouTube policies: ${term}`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Get video processing status
    async getVideoProcessingStatus(videoId) {
        try {
            const response = await axios.get(`${this.baseURL}/videos`, {
                params: {
                    part: 'status,processingDetails',
                    id: videoId
                },
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            return response.data.items[0]?.processingDetails;
        } catch (error) {
            throw new Error(`Failed to get video processing status: ${error.response?.data?.error?.message || error.message}`);
        }
    }
}

module.exports = YouTubeService;