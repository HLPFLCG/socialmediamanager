<content>// Fixed OAuth Implementation for Social Media Manager
// This provides a clean, working OAuth flow for all platforms

import { Hono } from 'hono';

const oauth = new Hono();

// Helper function to verify JWT tokens
function verifyToken(token, secret) {
  try {
    // Simple JWT verification (in production, use a proper library)
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp && payload.exp < now) return null;
    return payload;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

// Get user ID from various auth methods
async function getUserId(c) {
  // Method 1: Authorization header
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const jwtSecret = c.env.JWT_SECRET || 'fallback-secret-change-in-production';
      const decoded = verifyToken(token, jwtSecret);
      if (decoded && decoded.userId) {
        return decoded.userId;
      }
    } catch (e) {
      console.error('Token verification failed:', e);
    }
  }
  
  // Method 2: Session cookie
  const sessionCookie = c.req.header('Cookie');
  if (sessionCookie) {
    try {
      const cookies = sessionCookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {});
      if (cookies.session) {
        const session = JSON.parse(atob(cookies.session));
        return session.userId;
      }
    } catch (e) {
      console.error('Session parsing failed:', e);
    }
  }
  
  // Method 3: Query parameter (for OAuth flow)
  const queryUserId = c.req.query('user_id');
  if (queryUserId) {
    return queryUserId;
  }
  
  return null;
}

// OAuth authorize endpoint
oauth.get('/:platform/authorize', async (c) => {
  const platform = c.req.param('platform');
  const userId = await getUserId(c);
  
  if (!userId) {
    return c.json({ error: 'User authentication required' }, 401);
  }
  
  const supportedPlatforms = ['twitter', 'linkedin', 'facebook', 'instagram'];
  if (!supportedPlatforms.includes(platform)) {
    return c.json({ error: 'Unsupported platform' }, 400);
  }
  
  const baseUrl = c.req.url.split('/auth')[0];
  const redirectUri = `${baseUrl}/auth/${platform}/callback`;
  
  // Create state with user info and platform
  const state = btoa(JSON.stringify({ 
    userId, 
    platform, 
    timestamp: Date.now(),
    redirectUri
  }));
  
  let authUrl;
  
  try {
    switch (platform) {
      case 'twitter':
        if (!c.env.TWITTER_API_KEY) {
          return c.json({ error: 'Twitter API credentials not configured' }, 500);
        }
        
        authUrl = `https://twitter.com/i/oauth2/authorize?` +
          `response_type=code&` +
          `client_id=${c.env.TWITTER_API_KEY}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=tweet.read%20tweet.write%20users.read%20offline.access&` +
          `state=${state}&` +
          `code_challenge=challenge&` +
          `code_challenge_method=plain`;
        break;
        
      case 'linkedin':
        if (!c.env.LINKEDIN_CLIENT_ID) {
          return c.json({ error: 'LinkedIn API credentials not configured' }, 500);
        }
        
        authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
          `response_type=code&` +
          `client_id=${c.env.LINKEDIN_CLIENT_ID}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=profile%20email%20w_member_social&` +
          `state=${state}`;
        break;
        
      case 'facebook':
        if (!c.env.FACEBOOK_APP_ID) {
          return c.json({ error: 'Facebook API credentials not configured' }, 500);
        }
        
        authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
          `client_id=${c.env.FACEBOOK_APP_ID}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=pages_manage_posts,pages_read_engagement,pages_show_list&` +
          `state=${state}`;
        break;
        
      case 'instagram':
        if (!c.env.INSTAGRAM_CLIENT_ID) {
          return c.json({ error: 'Instagram API credentials not configured' }, 500);
        }
        
        authUrl = `https://api.instagram.com/oauth/authorize?` +
          `client_id=${c.env.INSTAGRAM_CLIENT_ID}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=user_profile,user_media&` +
          `response_type=code&` +
          `state=${state}`;
        break;
        
      default:
        return c.json({ error: 'Platform not implemented yet' }, 400);
    }
    
    return c.redirect(authUrl);
    
  } catch (error) {
    console.error(`OAuth authorize error for ${platform}:`, error);
    return c.json({ error: 'Failed to generate authorization URL' }, 500);
  }
});

// OAuth callback endpoint
oauth.get('/:platform/callback', async (c) => {
  const platform = c.req.param('platform');
  const code = c.req.query('code');
  const error = c.req.query('error');
  const state = c.req.query('state');
  
  if (error) {
    console.error(`${platform} OAuth error:`, error);
    return c.redirect(`/?error=${platform}_auth_failed&message=${encodeURIComponent(error)}`);
  }
  
  if (!code || !state) {
    return c.redirect(`/?error=${platform}_auth_failed&message=missing_code_or_state`);
  }
  
  try {
    // Decode state to get user info
    const stateData = JSON.parse(atob(state));
    const userId = stateData.userId;
    
    if (!userId) {
      return c.redirect(`/?error=${platform}_auth_failed&message=invalid_state`);
    }
    
    // Exchange code for tokens based on platform
    let tokens, userData;
    const baseUrl = c.req.url.split('/auth')[0];
    const redirectUri = `${baseUrl}/auth/${platform}/callback`;
    
    switch (platform) {
      case 'twitter':
        const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${c.env.TWITTER_API_KEY}:${c.env.TWITTER_API_SECRET}`)}`
          },
          body: new URLSearchParams({
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code_verifier: 'challenge'
          })
        });
        
        if (!tokenResponse.ok) {
          throw new Error(`Twitter token exchange failed: ${tokenResponse.statusText}`);
        }
        
        tokens = await tokenResponse.json();
        
        const userResponse = await fetch('https://api.twitter.com/2/users/me', {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`
          }
        });
        
        if (!userResponse.ok) {
          throw new Error(`Twitter user info failed: ${userResponse.statusText}`);
        }
        
        userData = await userResponse.json();
        break;
        
      case 'linkedin':
        const linkedinTokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: c.env.LINKEDIN_CLIENT_ID,
            client_secret: c.env.LINKEDIN_CLIENT_SECRET
          })
        });
        
        if (!linkedinTokenResponse.ok) {
          throw new Error(`LinkedIn token exchange failed: ${linkedinTokenResponse.statusText}`);
        }
        
        tokens = await linkedinTokenResponse.json();
        
        const linkedinUserResponse = await fetch('https://api.linkedin.com/v2/people/~:(id,firstName,lastName,emailAddress)', {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`
          }
        });
        
        if (!linkedinUserResponse.ok) {
          throw new Error(`LinkedIn user info failed: ${linkedinUserResponse.statusText}`);
        }
        
        userData = await linkedinUserResponse.json();
        break;
        
      case 'facebook':
        const facebookTokenResponse = await fetch(
          `https://graph.facebook.com/v18.0/oauth/access_token?` +
          `client_id=${c.env.FACEBOOK_APP_ID}&` +
          `client_secret=${c.env.FACEBOOK_APP_SECRET}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `code=${code}`
        );
        
        if (!facebookTokenResponse.ok) {
          throw new Error(`Facebook token exchange failed: ${facebookTokenResponse.statusText}`);
        }
        
        tokens = await facebookTokenResponse.json();
        
        const facebookUserResponse = await fetch(
          `https://graph.facebook.com/me?access_token=${tokens.access_token}`
        );
        
        if (!facebookUserResponse.ok) {
          throw new Error(`Facebook user info failed: ${facebookUserResponse.statusText}`);
        }
        
        userData = await facebookUserResponse.json();
        break;
        
      case 'instagram':
        const instagramTokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            client_id: c.env.INSTAGRAM_CLIENT_ID,
            client_secret: c.env.INSTAGRAM_CLIENT_SECRET,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code
          })
        });
        
        if (!instagramTokenResponse.ok) {
          throw new Error(`Instagram token exchange failed: ${instagramTokenResponse.statusText}`);
        }
        
        tokens = await instagramTokenResponse.json();
        
        const instagramUserResponse = await fetch('https://graph.instagram.com/me', {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`
          }
        });
        
        if (!instagramUserResponse.ok) {
          throw new Error(`Instagram user info failed: ${instagramUserResponse.statusText}`);
        }
        
        userData = await instagramUserResponse.json();
        break;
        
      default:
        return c.redirect(`/?error=${platform}_not_implemented`);
    }
    
    // Store tokens in database
    await c.env.DB.prepare(
      'INSERT OR REPLACE INTO social_accounts (user_id, platform, platform_user_id, access_token, refresh_token, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      userId,
      platform,
      userData.id || userData.data?.id || userData.sub,
      tokens.access_token,
      tokens.refresh_token || null,
      tokens.expires_in ? Date.now() + (tokens.expires_in * 1000) : null,
      Date.now(),
      Date.now()
    ).run();
    
    // Redirect back to frontend with success
    return c.redirect(`/?connected=${platform}&success=true`);
    
  } catch (error) {
    console.error(`${platform} OAuth callback error:`, error);
    return c.redirect(`/?error=${platform}_auth_failed&message=${encodeURIComponent(error.message)}`);
  }
});

// Get connected accounts
oauth.get('/accounts', async (c) => {
  const userId = await getUserId(c);
  
  if (!userId) {
    return c.json({ error: 'User authentication required' }, 401);
  }
  
  try {
    const accounts = await c.env.DB.prepare(
      'SELECT platform, platform_user_id, created_at FROM social_accounts WHERE user_id = ?'
    ).bind(userId).all();
    
    return c.json({ success: true, accounts: accounts.results || [] });
  } catch (error) {
    console.error('Get accounts error:', error);
    return c.json({ success: false, error: 'Failed to fetch accounts' }, 500);
  }
});

// Disconnect social account
oauth.delete('/accounts/:platform', async (c) => {
  const platform = c.req.param('platform');
  const userId = await getUserId(c);
  
  if (!userId) {
    return c.json({ error: 'User authentication required' }, 401);
  }
  
  try {
    const result = await c.env.DB.prepare(
      'DELETE FROM social_accounts WHERE user_id = ? AND platform = ?'
    ).bind(userId, platform).run();
    
    if (result.changes === 0) {
      return c.json({ success: false, error: 'Account not found' }, 404);
    }
    
    return c.json({ success: true, message: `${platform} account disconnected` });
  } catch (error) {
    console.error('Disconnect error:', error);
    return c.json({ success: false, error: 'Failed to disconnect account' }, 500);
  }
});

export default oauth;
</content>