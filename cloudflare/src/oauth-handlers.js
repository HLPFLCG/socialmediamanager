// OAuth Handlers for All Social Media Platforms
// This file contains OAuth flow implementations for Twitter, LinkedIn, Facebook, Instagram, TikTok, YouTube, and Pinterest

import { Hono } from 'hono';

const oauth = new Hono();

// ============================================
// TWITTER/X OAUTH
// ============================================

oauth.get('/twitter/authorize', async (c) => {
  const clientId = c.env.TWITTER_API_KEY;
  const redirectUri = `${c.req.url.split('/auth')[0]}/auth/twitter/callback`;
  
  const authUrl = `https://twitter.com/i/oauth2/authorize?` +
    `response_type=code&` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=tweet.read%20tweet.write%20users.read%20offline.access&` +
    `state=${Math.random().toString(36).substring(7)}&` +
    `code_challenge=challenge&` +
    `code_challenge_method=plain`;
  
  return c.redirect(authUrl);
});

oauth.get('/twitter/callback', async (c) => {
  const code = c.req.query('code');
  const redirectUri = `${c.req.url.split('/auth')[0]}/auth/twitter/callback`;
  
  try {
    // Exchange code for access token
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
    
    const tokens = await tokenResponse.json();
    
    // Get user info
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    });
    
    const userData = await userResponse.json();
    
    // Store tokens in database
    await c.env.DB.prepare(
      'INSERT INTO social_accounts (user_id, platform, platform_user_id, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      c.get('userId'),
      'twitter',
      userData.data.id,
      tokens.access_token,
      tokens.refresh_token,
      Date.now() + (tokens.expires_in * 1000)
    ).run();
    
    return c.redirect('/dashboard?connected=twitter');
  } catch (error) {
    console.error('Twitter OAuth error:', error);
    return c.redirect('/dashboard?error=twitter_auth_failed');
  }
});

// ============================================
// LINKEDIN OAUTH
// ============================================

oauth.get('/linkedin/authorize', async (c) => {
  const clientId = c.env.LINKEDIN_CLIENT_ID;
  const redirectUri = `${c.req.url.split('/auth')[0]}/auth/linkedin/callback`;
  
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
    `response_type=code&` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=r_liteprofile%20r_emailaddress%20w_member_social&` +
    `state=${Math.random().toString(36).substring(7)}`;
  
  return c.redirect(authUrl);
});

oauth.get('/linkedin/callback', async (c) => {
  const code = c.req.query('code');
  const redirectUri = `${c.req.url.split('/auth')[0]}/auth/linkedin/callback`;
  
  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
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
    
    const tokens = await tokenResponse.json();
    
    // Get user info
    const userResponse = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    });
    
    const userData = await userResponse.json();
    
    // Store tokens in database
    await c.env.DB.prepare(
      'INSERT INTO social_accounts (user_id, platform, platform_user_id, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      c.get('userId'),
      'linkedin',
      userData.id,
      tokens.access_token,
      tokens.refresh_token || null,
      Date.now() + (tokens.expires_in * 1000)
    ).run();
    
    return c.redirect('/dashboard?connected=linkedin');
  } catch (error) {
    console.error('LinkedIn OAuth error:', error);
    return c.redirect('/dashboard?error=linkedin_auth_failed');
  }
});

// ============================================
// FACEBOOK OAUTH
// ============================================

oauth.get('/facebook/authorize', async (c) => {
  const clientId = c.env.FACEBOOK_APP_ID;
  const redirectUri = `${c.req.url.split('/auth')[0]}/auth/facebook/callback`;
  
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=pages_manage_posts,pages_read_engagement,pages_show_list&` +
    `state=${Math.random().toString(36).substring(7)}`;
  
  return c.redirect(authUrl);
});

oauth.get('/facebook/callback', async (c) => {
  const code = c.req.query('code');
  const redirectUri = `${c.req.url.split('/auth')[0]}/auth/facebook/callback`;
  
  try {
    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${c.env.FACEBOOK_APP_ID}&` +
      `client_secret=${c.env.FACEBOOK_APP_SECRET}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `code=${code}`
    );
    
    const tokens = await tokenResponse.json();
    
    // Get user info
    const userResponse = await fetch(
      `https://graph.facebook.com/me?access_token=${tokens.access_token}`
    );
    
    const userData = await userResponse.json();
    
    // Store tokens in database
    await c.env.DB.prepare(
      'INSERT INTO social_accounts (user_id, platform, platform_user_id, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      c.get('userId'),
      'facebook',
      userData.id,
      tokens.access_token,
      null,
      Date.now() + (tokens.expires_in * 1000)
    ).run();
    
    return c.redirect('/dashboard?connected=facebook');
  } catch (error) {
    console.error('Facebook OAuth error:', error);
    return c.redirect('/dashboard?error=facebook_auth_failed');
  }
});

// ============================================
// INSTAGRAM OAUTH
// ============================================

oauth.get('/instagram/authorize', async (c) => {
  const clientId = c.env.INSTAGRAM_CLIENT_ID;
  const redirectUri = `${c.req.url.split('/auth')[0]}/auth/instagram/callback`;
  
  const authUrl = `https://api.instagram.com/oauth/authorize?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=user_profile,user_media&` +
    `response_type=code`;
  
  return c.redirect(authUrl);
});

oauth.get('/instagram/callback', async (c) => {
  const code = c.req.query('code');
  const redirectUri = `${c.req.url.split('/auth')[0]}/auth/instagram/callback`;
  
  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
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
    
    const tokens = await tokenResponse.json();
    
    // Store tokens in database
    await c.env.DB.prepare(
      'INSERT INTO social_accounts (user_id, platform, platform_user_id, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      c.get('userId'),
      'instagram',
      tokens.user_id,
      tokens.access_token,
      null,
      Date.now() + (60 * 24 * 60 * 60 * 1000) // 60 days
    ).run();
    
    return c.redirect('/dashboard?connected=instagram');
  } catch (error) {
    console.error('Instagram OAuth error:', error);
    return c.redirect('/dashboard?error=instagram_auth_failed');
  }
});

// ============================================
// TIKTOK OAUTH
// ============================================

oauth.get('/tiktok/authorize', async (c) => {
  const clientKey = c.env.TIKTOK_CLIENT_KEY;
  const redirectUri = `${c.req.url.split('/auth')[0]}/auth/tiktok/callback`;
  
  const authUrl = `https://www.tiktok.com/auth/authorize/?` +
    `client_key=${clientKey}&` +
    `scope=user.info.basic,video.publish,video.list&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${Math.random().toString(36).substring(7)}`;
  
  return c.redirect(authUrl);
});

oauth.get('/tiktok/callback', async (c) => {
  const code = c.req.query('code');
  const redirectUri = `${c.req.url.split('/auth')[0]}/auth/tiktok/callback`;
  
  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://open-api.tiktok.com/oauth/access_token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_key: c.env.TIKTOK_CLIENT_KEY,
        client_secret: c.env.TIKTOK_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });
    
    const tokens = await tokenResponse.json();
    
    // Store tokens in database
    await c.env.DB.prepare(
      'INSERT INTO social_accounts (user_id, platform, platform_user_id, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      c.get('userId'),
      'tiktok',
      tokens.data.open_id,
      tokens.data.access_token,
      tokens.data.refresh_token,
      Date.now() + (tokens.data.expires_in * 1000)
    ).run();
    
    return c.redirect('/dashboard?connected=tiktok');
  } catch (error) {
    console.error('TikTok OAuth error:', error);
    return c.redirect('/dashboard?error=tiktok_auth_failed');
  }
});

// ============================================
// YOUTUBE OAUTH
// ============================================

oauth.get('/youtube/authorize', async (c) => {
  const clientId = c.env.YOUTUBE_CLIENT_ID;
  const redirectUri = `${c.req.url.split('/auth')[0]}/auth/youtube/callback`;
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=https://www.googleapis.com/auth/youtube.upload%20https://www.googleapis.com/auth/youtube.readonly&` +
    `access_type=offline&` +
    `prompt=consent&` +
    `state=${Math.random().toString(36).substring(7)}`;
  
  return c.redirect(authUrl);
});

oauth.get('/youtube/callback', async (c) => {
  const code = c.req.query('code');
  const redirectUri = `${c.req.url.split('/auth')[0]}/auth/youtube/callback`;
  
  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id: c.env.YOUTUBE_CLIENT_ID,
        client_secret: c.env.YOUTUBE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });
    
    const tokens = await tokenResponse.json();
    
    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    });
    
    const userData = await userResponse.json();
    
    // Store tokens in database
    await c.env.DB.prepare(
      'INSERT INTO social_accounts (user_id, platform, platform_user_id, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      c.get('userId'),
      'youtube',
      userData.items[0].id,
      tokens.access_token,
      tokens.refresh_token,
      Date.now() + (tokens.expires_in * 1000)
    ).run();
    
    return c.redirect('/dashboard?connected=youtube');
  } catch (error) {
    console.error('YouTube OAuth error:', error);
    return c.redirect('/dashboard?error=youtube_auth_failed');
  }
});

// ============================================
// PINTEREST OAUTH
// ============================================

oauth.get('/pinterest/authorize', async (c) => {
  const clientId = c.env.PINTEREST_APP_ID;
  const redirectUri = `${c.req.url.split('/auth')[0]}/auth/pinterest/callback`;
  
  const authUrl = `https://www.pinterest.com/oauth/?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=boards:read,pins:read,pins:write&` +
    `state=${Math.random().toString(36).substring(7)}`;
  
  return c.redirect(authUrl);
});

oauth.get('/pinterest/callback', async (c) => {
  const code = c.req.query('code');
  const redirectUri = `${c.req.url.split('/auth')[0]}/auth/pinterest/callback`;
  
  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${c.env.PINTEREST_APP_ID}:${c.env.PINTEREST_APP_SECRET}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });
    
    const tokens = await tokenResponse.json();
    
    // Get user info
    const userResponse = await fetch('https://api.pinterest.com/v5/user_account', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    });
    
    const userData = await userResponse.json();
    
    // Store tokens in database
    await c.env.DB.prepare(
      'INSERT INTO social_accounts (user_id, platform, platform_user_id, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      c.get('userId'),
      'pinterest',
      userData.username,
      tokens.access_token,
      tokens.refresh_token,
      Date.now() + (tokens.expires_in * 1000)
    ).run();
    
    return c.redirect('/dashboard?connected=pinterest');
  } catch (error) {
    console.error('Pinterest OAuth error:', error);
    return c.redirect('/dashboard?error=pinterest_auth_failed');
  }
});

// ============================================
// DISCONNECT SOCIAL ACCOUNT
// ============================================

oauth.delete('/disconnect/:platform', async (c) => {
  const platform = c.req.param('platform');
  const userId = c.get('userId');
  
  try {
    await c.env.DB.prepare(
      'DELETE FROM social_accounts WHERE user_id = ? AND platform = ?'
    ).bind(userId, platform).run();
    
    return c.json({ success: true, message: `${platform} account disconnected` });
  } catch (error) {
    console.error('Disconnect error:', error);
    return c.json({ success: false, error: 'Failed to disconnect account' }, 500);
  }
});

// ============================================
// GET CONNECTED ACCOUNTS
// ============================================

oauth.get('/accounts', async (c) => {
  const userId = c.get('userId');
  
  try {
    const accounts = await c.env.DB.prepare(
      'SELECT platform, platform_user_id, created_at FROM social_accounts WHERE user_id = ?'
    ).bind(userId).all();
    
    return c.json({ success: true, accounts: accounts.results });
  } catch (error) {
    console.error('Get accounts error:', error);
    return c.json({ success: false, error: 'Failed to fetch accounts' }, 500);
  }
});

export default oauth;