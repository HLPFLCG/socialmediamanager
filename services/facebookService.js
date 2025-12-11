const axios = require('axios');

class FacebookService {
  constructor() {
    this.appId = process.env.FACEBOOK_APP_ID;
    this.appSecret = process.env.FACEBOOK_APP_SECRET;
    this.redirectUri = process.env.FACEBOOK_REDIRECT_URI;
    this.apiVersion = 'v18.0';
  }

  getAuthUrl() {
    const scopes = [
      'pages_read_engagement',
      'pages_manage_posts',
      'pages_manage_metadata',
      'pages_read_user_content',
      'instagram_basic',
      'instagram_content_publish',
      'publish_to_groups'
    ];

    return `https://www.facebook.com/${this.apiVersion}/dialog/oauth?client_id=${this.appId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=${scopes.join(',')}&response_type=code`;
  }

  async getAccessToken(code) {
    try {
      const response = await axios.get(`https://graph.facebook.com/${this.apiVersion}/oauth/access_token`, {
        params: {
          client_id: this.appId,
          client_secret: this.appSecret,
          redirect_uri: this.redirectUri,
          code
        }
      });

      return {
        success: true,
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in
      };
    } catch (error) {
      console.error('Facebook token exchange error:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed to exchange code for token'
      };
    }
  }

  async getLongLivedToken(accessToken) {
    try {
      const response = await axios.get(`https://graph.facebook.com/${this.apiVersion}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: this.appId,
          client_secret: this.appSecret,
          fb_exchange_token: accessToken
        }
      });

      return {
        success: true,
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in
      };
    } catch (error) {
      console.error('Facebook long-lived token error:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed to get long-lived token'
      };
    }
  }

  async getUserPages(accessToken) {
    try {
      const response = await axios.get(`https://graph.facebook.com/${this.apiVersion}/me/accounts`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,access_token,category,username,fan_count,picture'
        }
      });

      return {
        success: true,
        pages: response.data.data
      };
    } catch (error) {
      console.error('Facebook pages error:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed to get user pages'
      };
    }
  }

  async postToFacebook(pageId, pageAccessToken, content, mediaUrls = []) {
    try {
      let postData = {
        message: content,
        access_token: pageAccessToken
      };

      if (mediaUrls.length > 0) {
        postData.attached_media = mediaUrls.map((url, index) => ({
          media_fbid: url
        }));

        const response = await axios.post(`https://graph.facebook.com/${this.apiVersion}/${pageId}/feed`, postData);
        return {
          success: true,
          postId: response.data.id,
          data: response.data
        };
      } else {
        const response = await axios.post(`https://graph.facebook.com/${this.apiVersion}/${pageId}/feed`, postData);
        return {
          success: true,
          postId: response.data.id,
          data: response.data
        };
      }
    } catch (error) {
      console.error('Facebook post error:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed to post to Facebook'
      };
    }
  }

  async uploadPhoto(pageId, pageAccessToken, photoUrl, caption = '') {
    try {
      const response = await axios.post(`https://graph.facebook.com/${this.apiVersion}/${pageId}/photos`, {
        url: photoUrl,
        caption,
        access_token: pageAccessToken,
        published: false
      });

      return {
        success: true,
        photoId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('Facebook photo upload error:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed to upload photo'
      };
    }
  }

  async uploadVideo(pageId, pageAccessToken, videoUrl, title = '', description = '') {
    try {
      const response = await axios.post(`https://graph.facebook.com/${this.apiVersion}/${pageId}/videos`, {
        file_url: videoUrl,
        title,
        description,
        access_token: pageAccessToken
      });

      return {
        success: true,
        videoId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('Facebook video upload error:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed to upload video'
      };
    }
  }

  async getPostMetrics(postId, pageAccessToken) {
    try {
      const response = await axios.get(`https://graph.facebook.com/${this.apiVersion}/${postId}/insights`, {
        params: {
          metric: 'post_impressions,post_clicks,post_reactions_total,post_shares',
          access_token: pageAccessToken
        }
      });

      return {
        success: true,
        metrics: response.data.data
      };
    } catch (error) {
      console.error('Facebook metrics error:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed to get post metrics'
      };
    }
  }

  async getInstagramBusinessAccounts(accessToken) {
    try {
      const response = await axios.get(`https://graph.facebook.com/${this.apiVersion}/me/accounts`, {
        params: {
          access_token: accessToken,
          fields: 'instagram_business_account'
        }
      });

      const instagramAccounts = response.data.data
        .filter(account => account.instagram_business_account)
        .map(account => account.instagram_business_account);

      return {
        success: true,
        accounts: instagramAccounts
      };
    } catch (error) {
      console.error('Instagram accounts error:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed to get Instagram accounts'
      };
    }
  }

  async postToInstagram(instagramAccountId, accessToken, content, mediaUrl) {
    try {
      const createResponse = await axios.post(`https://graph.facebook.com/${this.apiVersion}/${instagramAccountId}/media`, {
        image_url: mediaUrl,
        caption: content,
        access_token: accessToken
      });

      const publishResponse = await axios.post(`https://graph.facebook.com/${this.apiVersion}/${instagramAccountId}/media_publish`, {
        creation_id: createResponse.data.id,
        access_token: accessToken
      });

      return {
        success: true,
        postId: publishResponse.data.id,
        data: publishResponse.data
      };
    } catch (error) {
      console.error('Instagram post error:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed to post to Instagram'
      };
    }
  }
}

module.exports = new FacebookService();