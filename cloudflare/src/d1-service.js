// D1 Database Service for Social Media Manager
// Replaces MongoDB with native Cloudflare D1

export class D1Service {
  constructor(db) {
    this.db = db;
  }

  // User operations
  async createUser(userData) {
    const { email, password, name } = userData;
    const stmt = this.db.prepare(`
      INSERT INTO users (email, password, name) 
      VALUES (?, ?, ?)
    `);
    
    const result = await stmt.bind(email, password, name).run();
    return { success: true, userId: result.meta.last_row_id };
  }

  async getUserByEmail(email) {
    const stmt = this.db.prepare(`
      SELECT * FROM users WHERE email = ?
    `);
    
    const result = await stmt.bind(email).first();
    return result;
  }

  async getUserById(userId) {
    const stmt = this.db.prepare(`
      SELECT id, email, name, avatar_url, created_at, updated_at 
      FROM users WHERE id = ?
    `);
    
    const result = await stmt.bind(userId).first();
    return result;
  }

  async updateUser(userId, updateData) {
    const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    
    const stmt = this.db.prepare(`
      UPDATE users 
      SET ${fields}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    
    await stmt.bind(...values, userId).run();
    return { success: true };
  }

  // Social account operations
  async createSocialAccount(accountData) {
    const { user_id, platform, account_id, username, access_token, refresh_token, profile_data } = accountData;
    const stmt = this.db.prepare(`
      INSERT INTO social_accounts (user_id, platform, account_id, username, access_token, refresh_token, profile_data) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = await stmt.bind(user_id, platform, account_id, username, access_token, refresh_token, profile_data).run();
    return { success: true, accountId: result.meta.last_row_id };
  }

  async getSocialAccounts(userId) {
    const stmt = this.db.prepare(`
      SELECT * FROM social_accounts WHERE user_id = ?
    `);
    
    const result = await stmt.bind(userId).all();
    return result.results || [];
  }

  async getSocialAccount(userId, platform) {
    const stmt = this.db.prepare(`
      SELECT * FROM social_accounts 
      WHERE user_id = ? AND platform = ?
    `);
    
    const result = await stmt.bind(userId, platform).first();
    return result;
  }

  async updateSocialAccount(accountId, updateData) {
    const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    
    const stmt = this.db.prepare(`
      UPDATE social_accounts 
      SET ${fields}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    
    await stmt.bind(...values, accountId).run();
    return { success: true };
  }

  async deleteSocialAccount(accountId) {
    const stmt = this.db.prepare(`
      DELETE FROM social_accounts WHERE id = ?
    `);
    
    await stmt.bind(accountId).run();
    return { success: true };
  }

  // Post operations
  async createPost(postData) {
    const { user_id, content, platforms, media_urls, status, scheduled_at } = postData;
    const platforms_json = JSON.stringify(platforms);
    const media_urls_json = media_urls ? JSON.stringify(media_urls) : null;
    
    try {
      const stmt = this.db.prepare(`
        INSERT INTO posts (user_id, content, platforms, media_urls, status, scheduled_at) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const result = await stmt.bind(user_id, content, platforms_json, media_urls_json, status, scheduled_at).run();
      return { success: true, postId: result.meta.last_row_id };
    } catch (error) {
      console.error('Error creating post:', error);
      return { success: false, error: error.message };
    }
  }

  async getPosts(userId, limit = 50, offset = 0) {
    const stmt = this.db.prepare(`
      SELECT * FROM posts 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    
    const result = await stmt.bind(userId, limit, offset).all();
    return result.results || [];
  }

  async getPost(postId, userId) {
    const stmt = this.db.prepare(`
      SELECT * FROM posts 
      WHERE id = ? AND user_id = ?
    `);
    
    const result = await stmt.bind(postId, userId).first();
    return result;
  }

  async updatePost(postId, userId, updateData) {
    const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    
    const stmt = this.db.prepare(`
      UPDATE posts 
      SET ${fields}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND user_id = ?
    `);
    
    await stmt.bind(...values, postId, userId).run();
    return { success: true };
  }

  async deletePost(postId, userId) {
    const stmt = this.db.prepare(`
      DELETE FROM posts WHERE id = ? AND user_id = ?
    `);
    
    await stmt.bind(postId, userId).run();
    return { success: true };
  }

  async getPostStats(userId, timeframe = '7d') {
    let dateFilter = '';
    if (timeframe === '7d') {
      dateFilter = "AND created_at >= datetime('now', '-7 days')";
    } else if (timeframe === '30d') {
      dateFilter = "AND created_at >= datetime('now', '-30 days')";
    }

    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total_posts,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_posts,
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_posts,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_posts
      FROM posts 
      WHERE user_id = ? ${dateFilter}
    `);
    
    const result = await stmt.bind(userId).first();
    return result;
  }

  // Media file operations
  async createMediaFile(mediaData) {
    const { user_id, filename, original_name, file_type, file_size, file_url } = mediaData;
    const stmt = this.db.prepare(`
      INSERT INTO media_files (user_id, filename, original_name, file_type, file_size, file_url) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = await stmt.bind(user_id, filename, original_name, file_type, file_size, file_url).run();
    return { success: true, fileId: result.meta.last_row_id };
  }

  async getMediaFiles(userId, limit = 50) {
    const stmt = this.db.prepare(`
      SELECT * FROM media_files 
      WHERE user_id = ? 
      ORDER BY uploaded_at DESC 
      LIMIT ?
    `);
    
    const result = await stmt.bind(userId, limit).all();
    return result.results || [];
  }

  async deleteMediaFile(fileId, userId) {
    const stmt = this.db.prepare(`
      DELETE FROM media_files WHERE id = ? AND user_id = ?
    `);
    
    await stmt.bind(fileId, userId).run();
    return { success: true };
  }

  // Analytics operations
  async recordAnalytics(analyticsData) {
    const { post_id, platform, metric_type, metric_value } = analyticsData;
    const stmt = this.db.prepare(`
      INSERT INTO analytics (post_id, platform, metric_type, metric_value) 
      VALUES (?, ?, ?, ?)
    `);
    
    const result = await stmt.bind(post_id, platform, metric_type, metric_value).run();
    return { success: true, analyticsId: result.meta.last_row_id };
  }

  async getPostAnalytics(postId) {
    const stmt = this.db.prepare(`
      SELECT platform, metric_type, SUM(metric_value) as total_value
      FROM analytics 
      WHERE post_id = ? 
      GROUP BY platform, metric_type
    `);
    
    const result = await stmt.bind(postId).all();
    return result.results || [];
  }

  // Database health check
  async checkConnection() {
    try {
      const stmt = this.db.prepare('SELECT 1 as test');
      const result = await stmt.first();
      return { connected: true, result };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }
}