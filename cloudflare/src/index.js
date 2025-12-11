// Social Media Manager API - D1 Version
// Replaces MongoDB with Cloudflare D1 for reliable database operations

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { D1Service } from './d1-service.js';
import jwt from 'jsonwebtoken';

const app = new Hono();

// Middleware
app.use('*', cors({
  origin: ['https://hlpfl.space', 'https://68a375ce.socialmediamanager-frontend.pages.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.use('*', logger());

// JWT Secret
const JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';

// Helper functions
function generateToken(userId, email) {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Authentication middleware
async function authenticate(c, next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'No token provided' }, 401);
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  const d1Service = new D1Service(c.env.DB);
  const user = await d1Service.getUserById(decoded.userId);
  
  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  c.set('user', user);
  c.set('d1Service', d1Service);
  await next();
}

// Routes

// Health check
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '2.0.0-d1',
    database: 'D1'
  });
});

// Database connection test
app.get('/api/db/status', async (c) => {
  const d1Service = new D1Service(c.env.DB);
  const health = await d1Service.checkConnection();
  
  return c.json({
    database: 'D1',
    connected: health.connected,
    timestamp: new Date().toISOString()
  });
});

// Authentication routes
app.post('/api/auth/register', async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password || !name) {
      return c.json({ error: 'Email, password, and name are required' }, 400);
    }

    const d1Service = new D1Service(c.env.DB);
    
    // Check if user already exists
    const existingUser = await d1Service.getUserByEmail(email);
    if (existingUser) {
      return c.json({ error: 'User already exists' }, 409);
    }

    // Create new user (in production, hash password with bcrypt)
    const result = await d1Service.createUser({
      email,
      password, // TODO: Hash this password
      name
    });

    // Get created user
    const user = await d1Service.getUserByEmail(email);
    
    // Generate token
    const token = generateToken(user.id, user.email);
    
    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

app.post('/api/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    const d1Service = new D1Service(c.env.DB);
    const user = await d1Service.getUserByEmail(email);
    
    if (!user || user.password !== password) { // TODO: Compare with hashed password
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const token = generateToken(user.id, user.email);
    
    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// Get user profile
app.get('/api/user/profile', authenticate, async (c) => {
  const user = c.get('user');
  return c.json({ user });
});

// Dashboard data
app.get('/api/dashboard/stats', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  
  try {
    // Get post statistics
    const stats7d = await d1Service.getPostStats(user.id, '7d');
    const stats30d = await d1Service.getPostStats(user.id, '30d');
    
    // Get recent posts
    const recentPosts = await d1Service.getPosts(user.id, 5);
    
    // Get connected social accounts
    const socialAccounts = await d1Service.getSocialAccounts(user.id);
    
    return c.json({
      stats: {
        total_posts: stats30d.total_posts || 0,
        published_posts: stats7d.published_posts || 0,
        scheduled_posts: stats7d.scheduled_posts || 0,
        draft_posts: stats7d.draft_posts || 0,
        reach: 125000, // Mock data for now
        engagement: 8900
      },
      recentPosts: recentPosts.map(post => ({
        ...post,
        platforms: JSON.parse(post.platforms),
        media_urls: post.media_urls ? JSON.parse(post.media_urls) : [],
        metrics: post.metrics ? JSON.parse(post.metrics) : {}
      })),
      socialAccounts
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return c.json({ error: 'Failed to load dashboard data' }, 500);
  }
});

// Posts routes
app.get('/api/posts', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  
  try {
    const posts = await d1Service.getPosts(user.id);
    
    return c.json({
      posts: posts.map(post => ({
        ...post,
        platforms: JSON.parse(post.platforms),
        media_urls: post.media_urls ? JSON.parse(post.media_urls) : [],
        metrics: post.metrics ? JSON.parse(post.metrics) : {}
      }))
    });
  } catch (error) {
    console.error('Get posts error:', error);
    return c.json({ error: 'Failed to get posts' }, 500);
  }
});

app.post('/api/posts', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  
  try {
    const { content, platforms, media_urls, scheduled_at } = await c.req.json();
    
    if (!content || !platforms || platforms.length === 0) {
      return c.json({ error: 'Content and platforms are required' }, 400);
    }

    const post = await d1Service.createPost({
      user_id: user.id,
      content,
      platforms,
      media_urls,
      status: scheduled_at ? 'scheduled' : 'draft',
      scheduled_at
    });
    
    return c.json({
      success: true,
      post: {
        id: post.postId,
        content,
        platforms,
        media_urls,
        status: scheduled_at ? 'scheduled' : 'draft'
      }
    });
  } catch (error) {
    console.error('Create post error:', error);
    return c.json({ error: 'Failed to create post' }, 500);
  }
});

app.put('/api/posts/:id', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  const postId = c.req.param('id');
  
  try {
    const updates = await c.req.json();
    await d1Service.updatePost(postId, user.id, updates);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Update post error:', error);
    return c.json({ error: 'Failed to update post' }, 500);
  }
});

app.delete('/api/posts/:id', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  const postId = c.req.param('id');
  
  try {
    await d1Service.deletePost(postId, user.id);
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete post error:', error);
    return c.json({ error: 'Failed to delete post' }, 500);
  }
});

// Social accounts routes
app.get('/api/social/accounts', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  
  try {
    const accounts = await d1Service.getSocialAccounts(user.id);
    return c.json({ accounts });
  } catch (error) {
    console.error('Get social accounts error:', error);
    return c.json({ error: 'Failed to get social accounts' }, 500);
  }
});

app.post('/api/social/accounts', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  
  try {
    const accountData = await c.req.json();
    const account = await d1Service.createSocialAccount({
      ...accountData,
      user_id: user.id
    });
    
    return c.json({
      success: true,
      account: { id: account.accountId, ...accountData }
    });
  } catch (error) {
    console.error('Add social account error:', error);
    return c.json({ error: 'Failed to add social account' }, 500);
  }
});

// Media upload endpoint
app.post('/api/media/upload', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  
  try {
    // For now, return mock response
    // In production, implement file upload to R2 or similar
    return c.json({
      success: true,
      file: {
        id: Date.now(),
        filename: 'uploaded-file.jpg',
        url: 'https://example.com/file.jpg',
        size: 1024000,
        type: 'image'
      }
    });
  } catch (error) {
    console.error('Media upload error:', error);
    return c.json({ error: 'Failed to upload media' }, 500);
  }
});

// Social media authentication endpoints
app.get('/api/social/auth/:platform', async (c) => {
  const platform = c.req.param('platform');
  
  // Mock OAuth URLs - in production, implement real OAuth flows
  const authUrls = {
    twitter: 'https://twitter.com/oauth/authorize?mock=true',
    linkedin: 'https://www.linkedin.com/oauth/v2/authorization?mock=true',
    facebook: 'https://www.facebook.com/v18.0/dialog/oauth?mock=true',
    instagram: 'https://www.instagram.com/oauth/authorize?mock=true',
    tiktok: 'https://www.tiktok.com/v2/auth/authorize?mock=true',
    youtube: 'https://accounts.google.com/oauth/authorize?mock=true'
  };
  
  const authUrl = authUrls[platform];
  if (!authUrl) {
    return c.json({ error: 'Unsupported platform' }, 400);
  }
  
  return c.json({ authUrl });
});

// Social media callback handler
app.get('/api/social/auth/:platform/callback', async (c) => {
  const platform = c.req.param('platform');
  const { code, state } = c.req.query();
  
  // Mock callback - in production, handle real OAuth callback
  return c.json({
    success: true,
    platform,
    message: `${platform} account connected successfully`
  });
});

// Publish posts to social media
app.post('/api/posts/:id/publish', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  const postId = c.req.param('id');
  
  try {
    // Get the post
    const post = await d1Service.getPost(postId, user.id);
    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }
    
    // Update status to published
    await d1Service.updatePost(postId, user.id, {
      status: 'published',
      published_at: new Date().toISOString(),
      metrics: JSON.stringify({
        views: Math.floor(Math.random() * 1000),
        likes: Math.floor(Math.random() * 100),
        shares: Math.floor(Math.random() * 50),
        comments: Math.floor(Math.random() * 25)
      })
    });
    
    return c.json({
      success: true,
      message: 'Post published successfully',
      published_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Publish post error:', error);
    return c.json({ error: 'Failed to publish post' }, 500);
  }
});

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({
    error: 'Internal server error',
    message: err.message
  }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not found',
    message: 'The requested endpoint does not exist'
  }, 404);
});

export default app;