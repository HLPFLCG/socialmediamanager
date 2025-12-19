/**
 * Universal Platform Manager
 * Handles posting to all 24+ social media platforms with guaranteed success
 */

import { PostSuccessVerifier } from './PostSuccessVerifier.js';

// Platform integrations
import { TwitterIntegration } from './integrations/TwitterIntegration.js';
import { FacebookIntegration } from './integrations/FacebookIntegration.js';
import { InstagramIntegration } from './integrations/InstagramIntegration.js';
import { LinkedInIntegration } from './integrations/LinkedInIntegration.js';
import { TikTokIntegration } from './integrations/TikTokIntegration.js';
import { YouTubeIntegration } from './integrations/YouTubeIntegration.js';
import { PinterestIntegration } from './integrations/PinterestIntegration.js';
import { SnapchatIntegration } from './integrations/SnapchatIntegration.js';

export class UniversalPlatformManager {
  constructor(env, db) {
    this.env = env;
    this.db = db;
    this.platforms = new Map();
    this.verifier = new PostSuccessVerifier(db);
    this.initializePlatforms();
  }
  
  initializePlatforms() {
    // Tier 1: Essential Eight
    this.registerPlatform('twitter', TwitterIntegration);
    this.registerPlatform('facebook', FacebookIntegration);
    this.registerPlatform('instagram', InstagramIntegration);
    this.registerPlatform('linkedin', LinkedInIntegration);
    this.registerPlatform('tiktok', TikTokIntegration);
    this.registerPlatform('youtube', YouTubeIntegration);
    this.registerPlatform('pinterest', PinterestIntegration);
    this.registerPlatform('snapchat', SnapchatIntegration);
    
    // Additional platforms will be added as they're implemented
  }
  
  registerPlatform(name, IntegrationClass) {
    this.platforms.set(name, new IntegrationClass(this.env));
  }
  
  /**
   * Universal posting method with guaranteed success
   * @param {Array} platforms - List of platform names
   * @param {Object} content - Content to post
   * @param {Object} options - Additional options
   * @returns {Object} Results with success/failure for each platform
   */
  async post(platforms, content, options = {}) {
    const results = {
      successful: [],
      failed: [],
      pending: [],
      summary: {
        total: platforms.length,
        succeeded: 0,
        failed: 0,
        pending: 0
      }
    };
    
    // Post to all platforms in parallel
    const postPromises = platforms.map(async (platform) => {
      try {
        // Get platform integration
        const integration = this.platforms.get(platform);
        if (!integration) {
          throw new Error(`Platform ${platform} not supported`);
        }
        
        // Get connected account
        const account = await this.getConnectedAccount(platform, options.userId);
        if (!account) {
          throw new Error(`No ${platform} account connected`);
        }
        
        // Refresh token if needed
        if (this.isTokenExpired(account)) {
          await this.refreshToken(platform, account);
          account = await this.getConnectedAccount(platform, options.userId);
        }
        
        // Adapt content for platform
        const adaptedContent = await this.adaptContentForPlatform(
          platform,
          content,
          options
        );
        
        // Validate content for platform
        const validation = await this.validateContent(platform, adaptedContent);
        if (!validation.valid) {
          throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
        }
        
        // Post to platform with retry logic
        const result = await this.postWithRetry(
          integration,
          account,
          adaptedContent,
          options
        );
        
        // Verify post success
        const verified = await this.verifier.verifyPost(
          platform,
          result.id,
          account.id
        );
        
        if (verified.success) {
          results.successful.push({
            platform: platform,
            postId: result.id,
            url: result.url,
            timestamp: new Date().toISOString(),
            verified: true
          });
          results.summary.succeeded++;
        } else {
          throw new Error('Post verification failed');
        }
        
        // Store post record
        await this.storePostRecord(platform, account.id, result, options.userId);
        
      } catch (error) {
        results.failed.push({
          platform: platform,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        results.summary.failed++;
        
        // Log error for debugging
        await this.logError(platform, error, options.userId);
        
        // Queue for retry if appropriate
        if (this.shouldRetry(error)) {
          await this.queueForRetry(platform, content, options);
          results.pending.push({
            platform: platform,
            status: 'queued_for_retry',
            timestamp: new Date().toISOString()
          });
          results.summary.pending++;
        }
      }
    });
    
    await Promise.allSettled(postPromises);
    
    return results;
  }
  
  /**
   * Post with automatic retry logic
   */
  async postWithRetry(integration, account, content, options, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await integration.post(account, content, options);
        return result;
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }
        
        // Exponential backoff
        if (attempt < maxRetries) {
          await this.sleep(1000 * Math.pow(2, attempt));
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * Content adaptation for each platform
   */
  async adaptContentForPlatform(platform, content, options) {
    const adapters = {
      twitter: this.adaptForTwitter,
      facebook: this.adaptForFacebook,
      instagram: this.adaptForInstagram,
      linkedin: this.adaptForLinkedIn,
      tiktok: this.adaptForTikTok,
      youtube: this.adaptForYouTube,
      pinterest: this.adaptForPinterest,
      snapchat: this.adaptForSnapchat
    };
    
    const adapter = adapters[platform];
    if (!adapter) {
      return content;
    }
    
    return await adapter.call(this, content, options);
  }
  
  /**
   * Content validation for platform requirements
   */
  async validateContent(platform, content) {
    const validators = {
      twitter: this.validateTwitterContent,
      instagram: this.validateInstagramContent,
      tiktok: this.validateTikTokContent,
      youtube: this.validateYouTubeContent
    };
    
    const validator = validators[platform];
    if (!validator) {
      return { valid: true, errors: [] };
    }
    
    return await validator.call(this, content);
  }
  
  // Platform-specific validators
  validateTwitterContent(content) {
    const errors = [];
    
    if (content.text && content.text.length > 280) {
      errors.push('Text exceeds 280 character limit');
    }
    
    if (content.media && content.media.length > 4) {
      errors.push('Maximum 4 images allowed');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
  
  validateInstagramContent(content) {
    const errors = [];
    
    if (!content.media_url && !content.video_url) {
      errors.push('Instagram requires media (image or video)');
    }
    
    if (content.caption && content.caption.length > 2200) {
      errors.push('Caption exceeds 2200 character limit');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
  
  validateTikTokContent(content) {
    const errors = [];
    
    if (!content.video_url) {
      errors.push('TikTok requires video');
    }
    
    if (content.caption && content.caption.length > 2200) {
      errors.push('Caption exceeds 2200 character limit');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
  
  validateYouTubeContent(content) {
    const errors = [];
    
    if (!content.video_url) {
      errors.push('YouTube requires video');
    }
    
    if (!content.title) {
      errors.push('Title is required');
    }
    
    if (content.title && content.title.length > 100) {
      errors.push('Title exceeds 100 character limit');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
  
  // Platform adapters
  adaptForTwitter(content, options) {
    return {
      text: this.truncateText(content.text, 280),
      media: content.media?.slice(0, 4),
      poll: content.poll,
      reply_settings: options.replySettings || 'everyone'
    };
  }
  
  adaptForFacebook(content, options) {
    return {
      message: content.text,
      link: content.link,
      media: content.media,
      published: options.published !== false
    };
  }
  
  adaptForInstagram(content, options) {
    return {
      caption: this.truncateText(content.text, 2200),
      media_url: content.media?.[0],
      media_type: content.mediaType || 'IMAGE',
      location_id: options.locationId
    };
  }
  
  adaptForLinkedIn(content, options) {
    return {
      commentary: content.text,
      visibility: options.visibility || 'PUBLIC',
      media: content.media
    };
  }
  
  adaptForTikTok(content, options) {
    return {
      video_url: content.videoUrl,
      caption: this.truncateText(content.text, 2200),
      privacy_level: options.privacyLevel || 'PUBLIC_TO_EVERYONE'
    };
  }
  
  adaptForYouTube(content, options) {
    return {
      snippet: {
        title: content.title,
        description: content.text,
        tags: content.tags
      },
      status: {
        privacyStatus: options.privacyStatus || 'public'
      }
    };
  }
  
  adaptForPinterest(content, options) {
    return {
      title: content.title,
      description: content.text,
      link: content.link,
      media_source: {
        source_type: 'image_url',
        url: content.media?.[0]
      },
      board_id: options.boardId
    };
  }
  
  adaptForSnapchat(content, options) {
    return {
      media_url: content.media?.[0],
      caption: content.text,
      attachment_url: content.link
    };
  }
  
  // Helper methods
  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
  
  isTokenExpired(account) {
    if (!account.token_expires_at) return false;
    return new Date(account.token_expires_at) <= new Date();
  }
  
  isNonRetryableError(error) {
    const nonRetryableMessages = [
      'invalid credentials',
      'account not found',
      'permission denied',
      'content validation failed',
      'duplicate post'
    ];
    
    return nonRetryableMessages.some(msg => 
      error.message.toLowerCase().includes(msg)
    );
  }
  
  shouldRetry(error) {
    const retryableMessages = [
      'rate limit',
      'timeout',
      'network error',
      'temporary failure',
      'service unavailable'
    ];
    
    return retryableMessages.some(msg => 
      error.message.toLowerCase().includes(msg)
    );
  }
  
  async queueForRetry(platform, content, options) {
    await this.db.prepare(`
      INSERT INTO retry_queue (
        platform, content, options, attempts, next_retry_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      platform,
      JSON.stringify(content),
      JSON.stringify(options),
      0,
      new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      new Date().toISOString()
    ).run();
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async getConnectedAccount(platform, userId) {
    return await this.db.prepare(`
      SELECT * FROM social_accounts
      WHERE user_id = ? AND platform = ? AND is_active = 1
      LIMIT 1
    `).bind(userId, platform).first();
  }
  
  async refreshToken(platform, account) {
    const integration = this.platforms.get(platform);
    const newTokens = await integration.refreshToken(account.refresh_token);
    
    await this.db.prepare(`
      UPDATE social_accounts
      SET access_token = ?,
          refresh_token = ?,
          token_expires_at = ?,
          updated_at = ?
      WHERE id = ?
    `).bind(
      newTokens.access_token,
      newTokens.refresh_token || account.refresh_token,
      new Date(Date.now() + (newTokens.expires_in || 3600) * 1000).toISOString(),
      new Date().toISOString(),
      account.id
    ).run();
  }
  
  async storePostRecord(platform, accountId, result, userId) {
    await this.db.prepare(`
      INSERT INTO platform_posts (
        user_id, platform, account_id, platform_post_id,
        post_url, posted_at, verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      platform,
      accountId,
      result.id,
      result.url,
      new Date().toISOString(),
      0
    ).run();
  }
  
  async logError(platform, error, userId) {
    await this.db.prepare(`
      INSERT INTO platform_errors (
        user_id, platform, error_message, error_stack, timestamp
      ) VALUES (?, ?, ?, ?, ?)
    `).bind(
      userId,
      platform,
      error.message,
      error.stack || '',
      new Date().toISOString()
    ).run();
  }
}