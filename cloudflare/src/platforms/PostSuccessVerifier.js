/**
 * Post Success Verifier
 * Verifies that posts were successfully published to each platform
 */

export class PostSuccessVerifier {
  constructor(db) {
    this.db = db;
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 seconds
  }
  
  /**
   * Verify that a post was successfully published
   */
  async verifyPost(platform, postId, accountId) {
    let retries = 0;
    
    while (retries < this.maxRetries) {
      try {
        const exists = await this.checkPostExists(platform, postId, accountId);
        
        if (exists) {
          await this.markPostAsVerified(platform, postId);
          return {
            success: true,
            verified: true,
            platform: platform,
            postId: postId,
            attempts: retries + 1
          };
        }
        
        retries++;
        if (retries < this.maxRetries) {
          await this.sleep(this.retryDelay * retries);
        }
        
      } catch (error) {
        retries++;
        if (retries >= this.maxRetries) {
          await this.markPostAsFailed(platform, postId, error.message);
          return {
            success: false,
            verified: false,
            platform: platform,
            postId: postId,
            error: error.message,
            attempts: retries
          };
        }
      }
    }
    
    await this.markPostAsFailed(platform, postId, 'Verification timeout');
    return {
      success: false,
      verified: false,
      platform: platform,
      postId: postId,
      error: 'Verification timeout after ' + this.maxRetries + ' attempts',
      attempts: retries
    };
  }
  
  /**
   * Check if post exists on platform
   */
  async checkPostExists(platform, postId, accountId) {
    const verifiers = {
      twitter: this.verifyTwitterPost,
      facebook: this.verifyFacebookPost,
      instagram: this.verifyInstagramPost,
      linkedin: this.verifyLinkedInPost,
      tiktok: this.verifyTikTokPost,
      youtube: this.verifyYouTubePost,
      pinterest: this.verifyPinterestPost,
      snapchat: this.verifySnapchatPost
    };
    
    const verifier = verifiers[platform];
    if (!verifier) {
      return true; // Assume success if no verifier
    }
    
    return await verifier.call(this, postId, accountId);
  }
  
  // Platform-specific verifiers
  async verifyTwitterPost(postId, accountId) {
    const account = await this.getAccount(accountId);
    
    const response = await fetch(
      `https://api.twitter.com/2/tweets/${postId}`,
      {
        headers: {
          'Authorization': `Bearer ${account.access_token}`
        }
      }
    );
    
    return response.ok;
  }
  
  async verifyFacebookPost(postId, accountId) {
    const account = await this.getAccount(accountId);
    
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${postId}?access_token=${account.access_token}`
    );
    
    return response.ok;
  }
  
  async verifyInstagramPost(postId, accountId) {
    const account = await this.getAccount(accountId);
    
    const response = await fetch(
      `https://graph.instagram.com/${postId}?fields=id&access_token=${account.access_token}`
    );
    
    return response.ok;
  }
  
  async verifyLinkedInPost(postId, accountId) {
    const account = await this.getAccount(accountId);
    
    const response = await fetch(
      `https://api.linkedin.com/v2/ugcPosts/${postId}`,
      {
        headers: {
          'Authorization': `Bearer ${account.access_token}`
        }
      }
    );
    
    return response.ok;
  }
  
  async verifyTikTokPost(postId, accountId) {
    const account = await this.getAccount(accountId);
    
    const response = await fetch(
      `https://open.tiktokapis.com/v2/video/query/?fields=id&video_id=${postId}`,
      {
        headers: {
          'Authorization': `Bearer ${account.access_token}`
        }
      }
    );
    
    return response.ok;
  }
  
  async verifyYouTubePost(postId, accountId) {
    const account = await this.getAccount(accountId);
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=id&id=${postId}`,
      {
        headers: {
          'Authorization': `Bearer ${account.access_token}`
        }
      }
    );
    
    const data = await response.json();
    return data.items && data.items.length > 0;
  }
  
  async verifyPinterestPost(postId, accountId) {
    const account = await this.getAccount(accountId);
    
    const response = await fetch(
      `https://api.pinterest.com/v5/pins/${postId}`,
      {
        headers: {
          'Authorization': `Bearer ${account.access_token}`
        }
      }
    );
    
    return response.ok;
  }
  
  async verifySnapchatPost(postId, accountId) {
    // Snapchat doesn't provide a verification API
    // Assume success if post was created
    return true;
  }
  
  // Helper methods
  async getAccount(accountId) {
    return await this.db.prepare(
      'SELECT * FROM social_accounts WHERE id = ?'
    ).bind(accountId).first();
  }
  
  async markPostAsVerified(platform, postId) {
    await this.db.prepare(`
      UPDATE platform_posts
      SET verified = 1,
          verified_at = ?
      WHERE platform = ? AND platform_post_id = ?
    `).bind(
      new Date().toISOString(),
      platform,
      postId
    ).run();
  }
  
  async markPostAsFailed(platform, postId, error) {
    await this.db.prepare(`
      UPDATE platform_posts
      SET verified = 0,
          verification_error = ?,
          verified_at = ?
      WHERE platform = ? AND platform_post_id = ?
    `).bind(
      error,
      new Date().toISOString(),
      platform,
      postId
    ).run();
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}