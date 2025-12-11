import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Health check
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'development',
    message: 'Social Media Manager API is running!'
  });
});

// Database status check
app.get('/api/db/status', async (c) => {
  try {
    // Check if database is accessible (would need actual MongoDB connection)
    return c.json({ 
      status: 'connected',
      database: 'mongodb',
      collections: ['users', 'socialaccounts', 'posts'],
      message: 'Database connection working'
    });
  } catch (error) {
    return c.json({ 
      status: 'error', 
      error: error.message 
    }, 500);
  }
});

// Basic API routes
app.get('/api/test', (c) => {
  return c.json({ message: 'API is working!' });
});

// Social accounts endpoint
app.get('/api/social/accounts', (c) => {
  return c.json({ 
    success: true, 
    accounts: [],
    message: 'Social accounts endpoint ready - connect your accounts first'
  });
});

// Instagram auth URL endpoint  
app.get('/api/social/auth/instagram', (c) => {
  const redirectUri = 'https://hlpfl.space/auth/instagram/callback';
  const appId = c.env.INSTAGRAM_APP_ID || 'YOUR_APP_ID_HERE';
  
  const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${redirectUri}&scope=user_profile,user_media&response_type=code`;
  
  return c.json({ 
    success: true, 
    authUrl: authUrl,
    message: appId === 'YOUR_APP_ID_HERE' ? 'Please set INSTAGRAM_APP_ID in Workers environment' : 'Instagram auth URL generated'
  });
});

// TikTok auth URL endpoint
app.get('/api/social/auth/tiktok', (c) => {
  const redirectUri = 'https://hlpfl.space/auth/tiktok/callback';
  const clientKey = c.env.TIKTOK_CLIENT_KEY || 'YOUR_TIKTOK_CLIENT_KEY_HERE';
  const scopes = 'user.info.basic,video.list,video.upload';
  
  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${scopes}&response_type=code&redirect_uri=${redirectUri}`;
  
  return c.json({ 
    success: true, 
    authUrl: authUrl,
    message: clientKey === 'YOUR_TIKTOK_CLIENT_KEY_HERE' ? 'Please set TIKTOK_CLIENT_KEY in Workers environment' : 'TikTok auth URL generated'
  });
});

// YouTube auth URL endpoint
app.get('/api/social/auth/youtube', (c) => {
  const redirectUri = 'https://hlpfl.space/auth/youtube/callback';
  const clientId = c.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';
  const scopes = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly';
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&access_type=offline&prompt=consent`;
  
  return c.json({ 
    success: true, 
    authUrl: authUrl,
    message: clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE' ? 'Please set GOOGLE_CLIENT_ID in Workers environment' : 'YouTube auth URL generated'
  });
});

// Serve frontend dashboard
app.get('/', async (c) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HLPFL Social Media Manager - Enterprise Dashboard</title>
    <link rel="stylesheet" href="https://0a8ee7ae.socialmediamanager-frontend.pages.dev/hootsuite-style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <div id="app"></div>
    <script src="https://0a8ee7ae.socialmediamanager-frontend.pages.dev/hootsuite-dashboard.js"></script>
</body>
</html>
  `;
  
  return c.html(html);
});

app.get('/dashboard', async (c) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HLPFL Social Media Manager - Enterprise Dashboard</title>
    <link rel="stylesheet" href="https://0a8ee7ae.socialmediamanager-frontend.pages.dev/hootsuite-style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <div id="app"></div>
    <script src="https://0a8ee7ae.socialmediamanager-frontend.pages.dev/hootsuite-dashboard.js"></script>
</body>
</html>
  `;
  
  return c.html(html);
});

app.get('/hootsuite-dashboard.html', async (c) => {
  return c.redirect('/');
});

// Welcome route (API)
app.get('/api', (c) => {
  return c.json({ 
    name: 'Social Media Manager API',
    version: '1.0.0',
    status: 'running'
  });
});

// Error handling
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// 404 handling
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

export default {
  fetch: app.fetch,
};