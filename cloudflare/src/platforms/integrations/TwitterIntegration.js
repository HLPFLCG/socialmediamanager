/**
 * Twitter/X Integration
 * Complete implementation for posting to Twitter with media support
 */

export class TwitterIntegration {
  constructor(env) {
    this.env = env;
    this.baseUrl = 'https://api.twitter.com/2';
    this.uploadUrl = 'https://upload.twitter.com/1.1';
  }
  
  /**
   * Post to Twitter
   * @param {Object} account - Twitter account with access token
   * @param {Object} content - Content to post
   * @param {Object} options - Additional options
   * @returns {Object} Post result with ID and URL
   */
  async post(account, content, options = {}) {
    const payload = {
      text: content.text
    };
    
    // Add media if present
    if (content.media && content.media.length > 0) {
      const mediaIds = await this.uploadMedia(account, content.media);
      payload.media = { media_ids: mediaIds };
    }
    
    // Add poll if present
    if (content.poll) {
      payload.poll = {
        options: content.poll.options,
        duration_minutes: content.poll.duration || 1440
      };
    }
    
    // Add reply settings
    if (content.reply_settings) {
      payload.reply_settings = content.reply_settings;
    }
    
    // Add quote tweet if present
    if (content.quote_tweet_id) {
      payload.quote_tweet_id = content.quote_tweet_id;
    }
    
    // Add reply if present
    if (content.reply_to_tweet_id) {
      payload.reply = {
        in_reply_to_tweet_id: content.reply_to_tweet_id
      };
    }
    
    const response = await fetch(`${this.baseUrl}/tweets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Twitter API error: ${error.detail || error.title || response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      id: data.data.id,
      url: `https://twitter.com/${account.username}/status/${data.data.id}`,
      platform: 'twitter',
      text: data.data.text
    };
  }
  
  /**
   * Upload media to Twitter
   * @param {Object} account - Twitter account
   * @param {Array} mediaUrls - Array of media URLs
   * @returns {Array} Array of media IDs
   */
  async uploadMedia(account, mediaUrls) {
    const mediaIds = [];
    
    for (const url of mediaUrls) {
      try {
        const mediaId = await this.uploadSingleMedia(account, url);
        mediaIds.push(mediaId);
      } catch (error) {
        console.error(`Failed to upload media ${url}:`, error);
        // Continue with other media
      }
    }
    
    return mediaIds;
  }
  
  /**
   * Upload single media file to Twitter
   * @param {Object} account - Twitter account
   * @param {String} url - Media URL
   * @returns {String} Media ID
   */
  async uploadSingleMedia(account, url) {
    // Download media
    const mediaResponse = await fetch(url);
    if (!mediaResponse.ok) {
      throw new Error(`Failed to download media from ${url}`);
    }
    
    const mediaBuffer = await mediaResponse.arrayBuffer();
    const mediaType = mediaResponse.headers.get('content-type');
    const mediaSize = mediaBuffer.byteLength;
    
    // Determine media category
    const mediaCategory = this.getMediaCategory(mediaType);
    
    // Step 1: Initialize upload
    const initResponse = await fetch(`${this.uploadUrl}/media/upload.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        command: 'INIT',
        total_bytes: mediaSize.toString(),
        media_type: mediaType,
        media_category: mediaCategory
      })
    });
    
    if (!initResponse.ok) {
      const error = await initResponse.json();
      throw new Error(`Twitter media init error: ${JSON.stringify(error)}`);
    }
    
    const initData = await initResponse.json();
    const mediaId = initData.media_id_string;
    
    // Step 2: Append media data (chunked for large files)
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    const chunks = Math.ceil(mediaSize / chunkSize);
    
    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, mediaSize);
      const chunk = mediaBuffer.slice(start, end);
      const chunkBase64 = this.arrayBufferToBase64(chunk);
      
      const appendResponse = await fetch(`${this.uploadUrl}/media/upload.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          command: 'APPEND',
          media_id: mediaId,
          media_data: chunkBase64,
          segment_index: i.toString()
        })
      });
      
      if (!appendResponse.ok) {
        const error = await appendResponse.json();
        throw new Error(`Twitter media append error: ${JSON.stringify(error)}`);
      }
    }
    
    // Step 3: Finalize upload
    const finalizeResponse = await fetch(`${this.uploadUrl}/media/upload.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        command: 'FINALIZE',
        media_id: mediaId
      })
    });
    
    if (!finalizeResponse.ok) {
      const error = await finalizeResponse.json();
      throw new Error(`Twitter media finalize error: ${JSON.stringify(error)}`);
    }
    
    const finalizeData = await finalizeResponse.json();
    
    // Step 4: Wait for processing if needed
    if (finalizeData.processing_info) {
      await this.waitForProcessing(account, mediaId, finalizeData.processing_info);
    }
    
    return mediaId;
  }
  
  /**
   * Wait for media processing to complete
   */
  async waitForProcessing(account, mediaId, processingInfo) {
    const maxWaitTime = 60000; // 60 seconds
    const startTime = Date.now();
    
    while (processingInfo.state === 'pending' || processingInfo.state === 'in_progress') {
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error('Media processing timeout');
      }
      
      // Wait for check_after_secs
      await this.sleep((processingInfo.check_after_secs || 1) * 1000);
      
      // Check status
      const statusResponse = await fetch(
        `${this.uploadUrl}/media/upload.json?command=STATUS&media_id=${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${account.access_token}`
          }
        }
      );
      
      const statusData = await statusResponse.json();
      processingInfo = statusData.processing_info;
      
      if (processingInfo.state === 'failed') {
        throw new Error(`Media processing failed: ${processingInfo.error?.message || 'Unknown error'}`);
      }
    }
  }
  
  /**
   * Post a thread (multiple tweets)
   */
  async postThread(account, tweets, options = {}) {
    const results = [];
    let previousTweetId = null;
    
    for (const tweet of tweets) {
      const content = {
        ...tweet,
        reply_to_tweet_id: previousTweetId
      };
      
      const result = await this.post(account, content, options);
      results.push(result);
      previousTweetId = result.id;
    }
    
    return {
      thread: results,
      firstTweetUrl: results[0].url,
      tweetCount: results.length
    };
  }
  
  /**
   * Delete a tweet
   */
  async deleteTweet(account, tweetId) {
    const response = await fetch(`${this.baseUrl}/tweets/${tweetId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${account.access_token}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Twitter delete error: ${error.detail || response.statusText}`);
    }
    
    return { deleted: true, tweetId: tweetId };
  }
  
  /**
   * Get tweet details
   */
  async getTweet(account, tweetId) {
    const response = await fetch(
      `${this.baseUrl}/tweets/${tweetId}?tweet.fields=created_at,public_metrics,entities`,
      {
        headers: {
          'Authorization': `Bearer ${account.access_token}`
        }
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Twitter get tweet error: ${error.detail || response.statusText}`);
    }
    
    return await response.json();
  }
  
  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.env.TWITTER_CLIENT_ID}:${this.env.TWITTER_CLIENT_SECRET}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.env.TWITTER_CLIENT_ID
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Twitter token refresh error: ${error.error_description || response.statusText}`);
    }
    
    return await response.json();
  }
  
  // Helper methods
  getMediaCategory(mediaType) {
    if (mediaType.startsWith('image/')) return 'tweet_image';
    if (mediaType.startsWith('video/')) return 'tweet_video';
    if (mediaType === 'image/gif') return 'tweet_gif';
    return 'tweet_image';
  }
  
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}