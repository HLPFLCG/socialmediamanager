const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');

class LinkedInService {
  constructor() {
    this.clientId = process.env.LINKEDIN_CLIENT_ID;
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    this.redirectUri = process.env.LINKEDIN_REDIRECT_URI;
    this.baseUrl = 'https://api.linkedin.com/v2';
  }

  getAuthUrl() {
    const scopes = [
      'r_liteprofile',
      'r_emailaddress',
      'w_member_social',
      'w_organization_social',
      'rw_organization_admin'
    ];

    return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=${scopes.join('%20')}`;
  }

  async getAccessToken(code) {
    try {
      const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', {
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return {
        success: true,
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in
      };
    } catch (error) {
      console.error('LinkedIn token exchange error:', error);
      return {
        success: false,
        error: error.response?.data?.error_description || 'Failed to exchange code for token'
      };
    }
  }

  async getUserProfile(accessToken) {
    try {
      const profileResponse = await axios.get(`${this.baseUrl}/people/~:(id,firstName,lastName,profilePicture(displayImage~:playableStreams))`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const emailResponse = await axios.get(`${this.baseUrl}/emailAddress?q=members&projection=(elements*(handle~))`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return {
        success: true,
        profile: profileResponse.data,
        email: emailResponse.data
      };
    } catch (error) {
      console.error('LinkedIn profile error:', error);
      return {
        success: false,
        error: error.response?.data || 'Failed to get user profile'
      };
    }
  }

  async postToLinkedIn(accessToken, content, title = '', shareUrl = '') {
    try {
      let shareContent = {
        shareCommentary: {
          text: content
        },
        shareMediaCategory: 'NONE'
      };

      if (shareUrl) {
        shareContent = {
          shareCommentary: {
            text: content
          },
          shareMediaCategory: 'ARTICLE',
          media: [{
            status: 'READY',
            description: {
              text: title || content.substring(0, 200)
            },
            originalUrl: shareUrl,
            title: {
              text: title || content.substring(0, 100)
            }
          }]
        };
      }

      const response = await axios.post(`${this.baseUrl}/shares`, shareContent, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        postId: response.data.id,
        data: response.data
      };
    } catch (error) {
      console.error('LinkedIn post error:', error);
      return {
        success: false,
        error: error.response?.data || 'Failed to post to LinkedIn'
      };
    }
  }

  async uploadMedia(accessToken, registerUploadResponse, mediaBuffer, mediaType) {
    try {
      await axios.put(registerUploadResponse.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl, 
        mediaBuffer, 
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': mediaType
          }
        }
      );

      return { success: true };
    } catch (error) {
      console.error('LinkedIn media upload error:', error);
      return {
        success: false,
        error: error.response?.data || 'Failed to upload media'
      };
    }
  }

  async registerMediaUpload(accessToken, mediaName) {
    try {
      const response = await axios.post(`${this.baseUrl}/assets?action=registerUpload`, {
        registerUploadRequest: {
          owner: `urn:li:person:${mediaName}`,
          recipes: [
            'urn:li:digitalmediaRecipe:feedshare-video'
          ],
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent'
            }
          ],
          supportedUploadMechanism: [
            'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
          ]
        }
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('LinkedIn media register error:', error);
      return {
        success: false,
        error: error.response?.data || 'Failed to register media upload'
      };
    }
  }

  async getPostMetrics(postId, accessToken) {
    try {
      const response = await axios.get(`${this.baseUrl}/socialActions/${postId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return {
        success: true,
        metrics: response.data
      };
    } catch (error) {
      console.error('LinkedIn metrics error:', error);
      return {
        success: false,
        error: error.response?.data || 'Failed to get post metrics'
      };
    }
  }
}

module.exports = new LinkedInService();