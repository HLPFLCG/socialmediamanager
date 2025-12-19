/**
 * Twitter OAuth 2.0 Handler
 * Implements PKCE flow for secure authentication
 */

export class TwitterOAuth {
  constructor(env, db) {
    this.env = env;
    this.db = db;
    this.authUrl = 'https://twitter.com/i/oauth2/authorize';
    this.tokenUrl = 'https://api.twitter.com/2/oauth2/token';
    this.userUrl = 'https://api.twitter.com/2/users/me';
  }
  
  /**
   * Initiate OAuth flow
   * @param {Number} userId - User ID
   * @returns {String} Authorization URL
   */
  async initiateOAuth(userId) {
    // Generate state and PKCE parameters
    const state = this.generateSecureState();
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    
    // Store state and verifier in database
    await this.db.prepare(`
      INSERT INTO oauth_states (user_id, state, code_verifier, platform, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      userId,
      state,
      codeVerifier,
      'twitter',
      new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
    ).run();
    
    // Build authorization URL
    const authUrl = new URL(this.authUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', this.env.TWITTER_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', `${this.env.APP_URL}/auth/twitter/callback`);
    authUrl.searchParams.set('scope', 'tweet.read tweet.write users.read offline.access');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    
    return authUrl.toString();
  }
  
  /**
   * Handle OAuth callback
   * @param {String} code - Authorization code
   * @param {String} state - State parameter
   * @returns {Object} Account information
   */
  async handleCallback(code, state) {
    // Verify state
    const oauthState = await this.db.prepare(`
      SELECT * FROM oauth_states 
      WHERE state = ? AND platform = ? AND expires_at > ?
    `).bind(state, 'twitter', new Date().toISOString()).first();
    
    if (!oauthState) {
      throw new Error('Invalid or expired state');
    }
    
    // Exchange code for tokens
    const tokenResponse = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.env.TWITTER_CLIENT_ID}:${this.env.TWITTER_CLIENT_SECRET}`)}`
      },
      body: new URLSearchParams({
        code: code,
        grant_type: 'authorization_code',
        client_id: this.env.TWITTER_CLIENT_ID,
        redirect_uri: `${this.env.APP_URL}/auth/twitter/callback`,
        code_verifier: oauthState.code_verifier
      })
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      throw new Error(`Token exchange failed: ${error.error_description || tokenResponse.statusText}`);
    }
    
    const tokens = await tokenResponse.json();
    
    // Get user information
    const userResponse = await fetch(this.userUrl, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    });
    
    if (!userResponse.ok) {
      throw new Error('Failed to fetch user information');
    }
    
    const userData = await userResponse.json();
    
    // Store or update account
    const existingAccount = await this.db.prepare(`
      SELECT id FROM social_accounts 
      WHERE user_id = ? AND platform = ? AND account_id = ?
    `).bind(oauthState.user_id, 'twitter', userData.data.id).first();
    
    if (existingAccount) {
      // Update existing account
      await this.db.prepare(`
        UPDATE social_accounts
        SET access_token = ?,
            refresh_token = ?,
            token_expires_at = ?,
            username = ?,
            is_active = 1,
            updated_at = ?
        WHERE id = ?
      `).bind(
        tokens.access_token,
        tokens.refresh_token,
        new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        userData.data.username,
        new Date().toISOString(),
        existingAccount.id
      ).run();
    } else {
      // Create new account
      await this.db.prepare(`
        INSERT INTO social_accounts (
          user_id, platform, account_id, username,
          access_token, refresh_token, token_expires_at,
          is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        oauthState.user_id,
        'twitter',
        userData.data.id,
        userData.data.username,
        tokens.access_token,
        tokens.refresh_token,
        new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        1,
        new Date().toISOString()
      ).run();
    }
    
    // Clean up state
    await this.db.prepare(
      'DELETE FROM oauth_states WHERE state = ?'
    ).bind(state).run();
    
    return {
      platform: 'twitter',
      accountId: userData.data.id,
      username: userData.data.username,
      name: userData.data.name
    };
  }
  
  /**
   * Disconnect Twitter account
   */
  async disconnect(userId, accountId) {
    await this.db.prepare(`
      UPDATE social_accounts
      SET is_active = 0,
          updated_at = ?
      WHERE user_id = ? AND id = ? AND platform = ?
    `).bind(
      new Date().toISOString(),
      userId,
      accountId,
      'twitter'
    ).run();
    
    return { success: true };
  }
  
  // Helper methods for PKCE
  generateSecureState() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64URLEncode(array);
  }
  
  async generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return this.base64URLEncode(new Uint8Array(hash));
  }
  
  base64URLEncode(buffer) {
    const base64 = btoa(String.fromCharCode(...buffer));
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}