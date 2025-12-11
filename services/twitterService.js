const { TwitterApi } = require('twitter-api-v2');

class TwitterService {
  constructor() {
    this.client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });

    this.bearerClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
  }

  async postTweet(content, mediaIds = []) {
    try {
      const twitterClient = this.client.readWrite;
      
      let tweetParams = { text: content };
      
      if (mediaIds.length > 0) {
        tweetParams.media = { media_ids: mediaIds };
      }

      const response = await twitterClient.v2.tweet(tweetParams);
      return {
        success: true,
        postId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('Twitter post error:', error);
      return {
        success: false,
        error: error.message || 'Failed to post tweet'
      };
    }
  }

  async uploadMedia(mediaBuffer, mediaType) {
    try {
      const twitterClient = this.client.readWrite;
      
      const mediaResponse = await twitterClient.v1.uploadMedia(mediaBuffer, {
        mimeType: mediaType
      });

      return {
        success: true,
        mediaId: mediaResponse.mediaIdString
      };
    } catch (error) {
      console.error('Twitter media upload error:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload media'
      };
    }
  }

  async getUserProfile(accessToken, accessTokenSecret) {
    try {
      const client = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken,
        accessSecret: accessTokenSecret,
      });

      const userResponse = await client.v2.me({
        'user.fields': ['profile_image_url', 'public_metrics', 'description']
      });

      return {
        success: true,
        user: userResponse.data
      };
    } catch (error) {
      console.error('Twitter profile error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get user profile'
      };
    }
  }

  async getTweetMetrics(tweetId) {
    try {
      const response = await this.bearerClient.v2.tweet(tweetId, {
        'tweet.fields': ['public_metrics']
      });

      return {
        success: true,
        metrics: response.data.public_metrics
      };
    } catch (error) {
      console.error('Twitter metrics error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get tweet metrics'
      };
    }
  }

  getAuthUrl() {
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
    });

    const authLink = client.generateOAuth2AuthLink(
      process.env.TWITTER_REDIRECT_URI || 'http://localhost:3000/auth/twitter/callback',
      { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] }
    );

    return authLink.url;
  }

  async getAccessToken(code) {
    try {
      const client = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
      });

      const { client: loggedClient, accessToken, refreshToken } = await client.loginWithOAuth2(code);

      return {
        success: true,
        accessToken,
        refreshToken,
        client: loggedClient
      };
    } catch (error) {
      console.error('Twitter token exchange error:', error);
      return {
        success: false,
        error: error.message || 'Failed to exchange code for token'
      };
    }
  }
}

module.exports = new TwitterService();