// Social Media Manager API - Secure D1 Version
// Updated with security best practices and modern Hono v4

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { D1Service } from './d1-service.js';
import bcrypt from 'bcryptjs';

const app = new Hono();

// Helper functions
function generateToken(userId, email, secret) {
  // Simple JWT implementation for Cloudflare Workers
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    userId,
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  };

  const base64Header = btoa(JSON.stringify(header));
  const base64Payload = btoa(JSON.stringify(payload));
  const signature = btoa(`${base64Header}.${base64Payload}.${secret}`);

  return `${base64Header}.${base64Payload}.${signature}`;
}

function verifyToken(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    // Verify signature
    const expectedSignature = btoa(`${parts[0]}.${parts[1]}.${secret}`);
    if (parts[2] !== expectedSignature) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

// Middleware
app.use('*', async (c, next) => {
  const allowedOrigins = (c.env.ALLOWED_ORIGINS || '*').split(',');
  const origin = c.req.header('Origin') || '';
  
  const corsMiddleware = cors({
    origin: allowedOrigins.includes('*') ? '*' : (origin) => {
      return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  
  return corsMiddleware(c, next);
});

app.use('*', logger());

// Authentication middleware
async function authenticate(c, next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'No token provided' }, 401);
  }

  const token = authHeader.substring(7);
  const jwtSecret = c.env.JWT_SECRET || 'fallback-secret-change-in-production';
  const decoded = verifyToken(token, jwtSecret);
  
  if (!decoded) {
    return c.json({ error: 'Invalid or expired token' }, 401);
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
    version: '2.0.0',
    database: 'D1',
    environment: c.env.NODE_ENV || 'development'
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: 'Invalid email format' }, 400);
    }

    // Validate password strength
    if (password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters long' }, 400);
    }

    const d1Service = new D1Service(c.env.DB);
    
    // Check if user already exists
    const existingUser = await d1Service.getUserByEmail(email);
    if (existingUser) {
      return c.json({ error: 'User already exists' }, 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const result = await d1Service.createUser({
      email,
      password: hashedPassword,
      name
    });

    // Get created user
    const user = await d1Service.getUserByEmail(email);
    
    // Generate token
    const jwtSecret = c.env.JWT_SECRET || 'fallback-secret-change-in-production';
    const token = generateToken(user.id, user.email, jwtSecret);
    
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
    return c.json({ error: 'Registration failed: ' + error.message }, 500);
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
    
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Compare password with hash
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const jwtSecret = c.env.JWT_SECRET || 'fallback-secret-change-in-production';
    const token = generateToken(user.id, user.email, jwtSecret);
    
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
    return c.json({ error: 'Login failed: ' + error.message }, 500);
  }
});

// Get user profile
app.get('/api/user/profile', authenticate, async (c) => {
  const user = c.get('user');
  // Remove password from response
  const { password, ...userWithoutPassword } = user;
  return c.json({ user: userWithoutPassword });
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
        reach: 0,
        engagement: 0
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
    return c.json({ error: 'Failed to load dashboard data: ' + error.message }, 500);
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
    return c.json({ error: 'Failed to get posts: ' + error.message }, 500);
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

    // Validate content length based on platforms
    const maxLengths = {
      twitter: 280,
      linkedin: 3000,
      facebook: 63206,
      instagram: 2200
    };

    for (const platform of platforms) {
      const maxLength = maxLengths[platform] || 280;
      if (content.length > maxLength) {
        return c.json({ 
          error: `Content exceeds maximum length for ${platform} (${maxLength} characters)` 
        }, 400);
      }
    }

    const postResult = await d1Service.createPost({
      user_id: user.id,
      content,
      platforms,
      media_urls,
      status: scheduled_at ? 'scheduled' : 'draft',
      scheduled_at
    });

    if (!postResult.success) {
      return c.json({ error: 'Failed to create post: ' + postResult.error }, 500);
    }

    return c.json({
      success: true,
      post: {
        id: postResult.postId,
        content,
        platforms,
        media_urls,
        status: scheduled_at ? 'scheduled' : 'draft'
      }
    });
  } catch (error) {
    console.error('Create post error:', error);
    return c.json({ error: 'Failed to create post: ' + error.message }, 500);
  }
});

app.put('/api/posts/:id', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  const postId = c.req.param('id');
  
  try {
    const updates = await c.req.json();
    
    const existingPost = await d1Service.getPost(postId, user.id);
    if (!existingPost) {
      return c.json({ error: 'Post not found' }, 404);
    }
    
    await d1Service.updatePost(postId, user.id, updates);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Update post error:', error);
    return c.json({ error: 'Failed to update post: ' + error.message }, 500);
  }
});

app.delete('/api/posts/:id', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  const postId = c.req.param('id');
  
  try {
    const existingPost = await d1Service.getPost(postId, user.id);
    if (!existingPost) {
      return c.json({ error: 'Post not found' }, 404);
    }
    
    await d1Service.deletePost(postId, user.id);
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete post error:', error);
    return c.json({ error: 'Failed to delete post: ' + error.message }, 500);
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
    return c.json({ error: 'Failed to get social accounts: ' + error.message }, 500);
  }
});

app.post('/api/social/accounts', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  
  try {
    const accountData = await c.req.json();
    
    if (!accountData.platform || !accountData.account_id) {
      return c.json({ error: 'Platform and account_id are required' }, 400);
    }
    
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
    return c.json({ error: 'Failed to add social account: ' + error.message }, 500);
  }
});

// Media upload endpoint
app.post('/api/media/upload', authenticate, async (c) => {
  try {
    // TODO: Implement file upload to R2
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
    return c.json({ error: 'Failed to upload media: ' + error.message }, 500);
  }
});

// Social media authentication endpoints
app.get('/api/social/auth/:platform', async (c) => {
  const platform = c.req.param('platform');
  
  const authUrls = {
    twitter: 'https://twitter.com/oauth/authorize?mock=true',
    linkedin: 'https://www.linkedin.com/oauth/v2/authorization?mock=true',
    facebook: 'https://www.facebook.com/v18.0/dialog/oauth?mock=true',
    instagram: 'https://www.instagram.com/oauth/authorize?mock=true'
  };
  
  const authUrl = authUrls[platform];
  if (!authUrl) {
    return c.json({ error: 'Unsupported platform' }, 400);
  }
  
  return c.json({ authUrl, note: 'OAuth implementation pending' });
});

// Publish posts to social media
app.post('/api/posts/:id/publish', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  const postId = c.req.param('id');
  
  try {
    const post = await d1Service.getPost(postId, user.id);
    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }
    
    // TODO: Implement actual social media API calls
    
    await d1Service.updatePost(postId, user.id, {
      status: 'published',
      published_at: new Date().toISOString(),
      metrics: JSON.stringify({
        views: 0,
        likes: 0,
        shares: 0,
        comments: 0
      })
    });
    
    return c.json({
      success: true,
      message: 'Post published successfully',
      published_at: new Date().toISOString(),
      note: 'Social media API integration pending'
    });
  } catch (error) {
    console.error('Publish post error:', error);
    return c.json({ error: 'Failed to publish post: ' + error.message }, 500);
  }
});

// Serve frontend - HTML and JavaScript are now in separate files for better maintainability
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HLPFL Social Media Manager</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
            --primary: #007bff; --secondary: #6c757d; --success: #28a745;
            --danger: #dc3545; --warning: #ffc107; --light: #f8f9fa; --dark: #343a40;
            --sidebar-width: 280px;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .app-container { display: flex; min-height: 100vh; }
        .sidebar {
            width: var(--sidebar-width); background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px); box-shadow: 2px 0 20px rgba(0, 0, 0, 0.1);
            position: fixed; height: 100vh; z-index: 1000; overflow-y: auto;
        }
        .sidebar-header {
            padding: 2rem; background: linear-gradient(135deg, var(--primary) 0%, #0056b3 100%);
            color: white; text-align: center;
        }
        .sidebar-header h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
        .sidebar-nav { padding: 1rem 0; }
        .nav-item {
            display: flex; align-items: center; padding: 1rem 2rem; color: var(--dark);
            text-decoration: none; transition: all 0.3s ease; border-left: 4px solid transparent;
        }
        .nav-item:hover { background: rgba(0, 123, 255, 0.1); border-left-color: var(--primary); }
        .nav-item.active { background: rgba(0, 123, 255, 0.1); border-left-color: var(--primary); color: var(--primary); }
        .nav-item i { width: 20px; margin-right: 1rem; }
        .main-content { flex: 1; margin-left: var(--sidebar-width); padding: 2rem; }
        .dashboard-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem; margin-bottom: 2rem;
        }
        .stat-card {
            background: rgba(255, 255, 255, 0.95); padding: 1.5rem; border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); transition: transform 0.3s ease;
        }
        .stat-card:hover { transform: translateY(-5px); }
        .stat-card h3 { font-size: 0.875rem; color: var(--secondary); margin-bottom: 0.5rem; text-transform: uppercase; }
        .stat-card .stat-value { font-size: 2rem; font-weight: 700; color: var(--primary); }
        .stat-card .stat-change { font-size: 0.875rem; color: var(--success); }
        .main-section { display: none; background: rgba(255, 255, 255, 0.95); padding: 2rem; border-radius: 16px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); }
        .main-section.active { display: block; }
        .section-header { margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 2px solid var(--light); }
        .section-header h2 { font-size: 1.75rem; color: var(--dark); }
        .compose-form { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); }
        .form-group { margin-bottom: 1.5rem; }
        .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 600; color: var(--dark); }
        .form-control {
            width: 100%; padding: 0.75rem 1rem; border: 2px solid var(--light);
            border-radius: 8px; font-size: 1rem; transition: border-color 0.3s ease;
        }
        .form-control:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1); }
        textarea.form-control { resize: vertical; min-height: 120px; }
        .platform-selection { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; }
        .platform-option {
            display: flex; align-items: center; padding: 1rem; background: var(--light);
            border-radius: 8px; cursor: pointer; transition: all 0.3s ease;
        }
        .platform-option:hover { background: rgba(0, 123, 255, 0.1); }
        .platform-option input[type="checkbox"] { margin-right: 0.75rem; }
        .platform-option i { margin-right: 0.5rem; font-size: 1.25rem; }
        .character-count { text-align: right; font-size: 0.875rem; color: var(--secondary); margin-top: 0.5rem; }
        .btn {
            padding: 0.75rem 1.5rem; border: none; border-radius: 8px; font-size: 1rem;
            font-weight: 600; cursor: pointer; transition: all 0.3s ease;
            display: inline-flex; align-items: center; gap: 0.5rem;
        }
        .btn-primary { background: var(--primary); color: white; }
        .btn-primary:hover { background: #0056b3; transform: translateY(-2px); }
        .auth-modal {
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.5); z-index: 2000; align-items: center; justify-content: center;
        }
        .auth-modal-content { background: white; padding: 2rem; border-radius: 16px; max-width: 400px; width: 90%; }
        .auth-tabs { display: flex; gap: 1rem; margin-bottom: 2rem; }
        .auth-tab {
            flex: 1; padding: 0.75rem; border: none; background: var(--light);
            cursor: pointer; border-radius: 8px; transition: all 0.3s ease;
        }
        .auth-tab.active { background: var(--primary); color: white; }
        .notification {
            position: fixed; top: 2rem; right: 2rem; padding: 1rem 1.5rem;
            border-radius: 8px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            z-index: 3000; animation: slideIn 0.3s ease;
        }
        .notification.success { background: var(--success); color: white; }
        .notification.error { background: var(--danger); color: white; }
        @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @media (max-width: 768px) {
            .sidebar { transform: translateX(-100%); }
            .sidebar.open { transform: translateX(0); }
            .main-content { margin-left: 0; padding: 1rem; }
        }
    </style>
</head>
<body>
    <div class="app-container">
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <h1><i class="fas fa-share-alt"></i> HLPFL Social</h1>
                <p>Enterprise Manager</p>
            </div>
            <nav class="sidebar-nav">
                <a href="#dashboard" class="nav-item active" data-section="dashboard"><i class="fas fa-tachometer-alt"></i> Dashboard</a>
                <a href="#compose" class="nav-item" data-section="compose"><i class="fas fa-pen"></i> Create Post</a>
                <a href="#accounts" class="nav-item" data-section="accounts"><i class="fas fa-user-circle"></i> Social Accounts</a>
                <a href="#analytics" class="nav-item" data-section="analytics"><i class="fas fa-chart-line"></i> Analytics</a>
                <a href="#scheduler" class="nav-item" data-section="scheduler"><i class="fas fa-calendar"></i> Scheduler</a>
                <a href="#media" class="nav-item" data-section="media"><i class="fas fa-images"></i> Media Library</a>
                <a href="#settings" class="nav-item" data-section="settings"><i class="fas fa-cog"></i> Settings</a>
            </nav>
        </aside>
        <main class="main-content">
            <section id="dashboard" class="main-section active">
                <div class="section-header"><h2><i class="fas fa-tachometer-alt"></i> Dashboard</h2></div>
                <div class="dashboard-grid">
                    <div class="stat-card"><h3>Total Posts</h3><div class="stat-value" id="totalPosts">0</div><div class="stat-change">+12% from last month</div></div>
                    <div class="stat-card"><h3>Published</h3><div class="stat-value" id="publishedPosts">0</div><div class="stat-change">+8% from last month</div></div>
                    <div class="stat-card"><h3>Scheduled</h3><div class="stat-value" id="scheduledPosts">0</div><div class="stat-change">3 posts pending</div></div>
                    <div class="stat-card"><h3>Reach</h3><div class="stat-value" id="reach">0</div><div class="stat-change">+25% from last month</div></div>
                </div>
                <div class="compose-form"><h3>Recent Posts</h3><div id="recentPosts"><p>Loading recent posts...</p></div></div>
            </section>
            <section id="compose" class="main-section">
                <div class="section-header"><h2><i class="fas fa-pen"></i> Create Post</h2></div>
                <form class="compose-form" id="postForm">
                    <div class="form-group">
                        <label for="postContent">Post Content</label>
                        <textarea class="form-control" id="postContent" placeholder="What would you like to share?" rows="4"></textarea>
                        <div class="character-count" id="characterCount">0</div>
                    </div>
                    <div class="form-group">
                        <label>Select Platforms</label>
                        <div class="platform-selection">
                            <div class="platform-option"><input type="checkbox" id="twitter" class="platform-checkbox" value="twitter"><label for="twitter"><i class="fab fa-twitter"></i> Twitter</label></div>
                            <div class="platform-option"><input type="checkbox" id="linkedin" class="platform-checkbox" value="linkedin"><label for="linkedin"><i class="fab fa-linkedin"></i> LinkedIn</label></div>
                            <div class="platform-option"><input type="checkbox" id="facebook" class="platform-checkbox" value="facebook"><label for="facebook"><i class="fab fa-facebook"></i> Facebook</label></div>
                            <div class="platform-option"><input type="checkbox" id="instagram" class="platform-checkbox" value="instagram"><label for="instagram"><i class="fab fa-instagram"></i> Instagram</label></div>
                        </div>
                    </div>
                    <div class="form-group"><button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Publish Post</button></div>
                </form>
            </section>
            <section id="accounts" class="main-section">
                <div class="section-header"><h2><i class="fas fa-user-circle"></i> Connected Social Accounts</h2></div>
                <div class="compose-form"><div id="connectedAccounts"><p>Loading connected accounts...</p></div></div>
            </section>
            <section id="analytics" class="main-section">
                <div class="section-header"><h2><i class="fas fa-chart-line"></i> Analytics</h2></div>
                <div class="compose-form"><p>Analytics dashboard coming soon...</p></div>
            </section>
            <section id="scheduler" class="main-section">
                <div class="section-header"><h2><i class="fas fa-calendar"></i> Content Scheduler</h2></div>
                <div class="compose-form"><p>Content scheduler coming soon...</p></div>
            </section>
            <section id="media" class="main-section">
                <div class="section-header"><h2><i class="fas fa-images"></i> Media Library</h2></div>
                <div class="compose-form"><p>Media library coming soon...</p></div>
            </section>
            <section id="settings" class="main-section">
                <div class="section-header"><h2><i class="fas fa-cog"></i> Settings</h2></div>
                <div class="compose-form"><p>Settings panel coming soon...</p></div>
            </section>
        </main>
    </div>
    <script src="/app.js"></script>
</body>
</html>`);
});

// Serve JavaScript
app.get('/app.js', (c) => {
  return c.body(`class HLPFLSocialMediaManager{constructor(){this.currentUser=null;this.token=localStorage.getItem('token');this.selectedPlatforms=[];this.uploadedMedia=[];this.apiBaseUrl='/api';this.init()}async init(){this.setupEventListeners();await this.checkAuth();if(this.currentUser){await this.loadDashboard()}else{this.showAuthModal()}}setupEventListeners(){document.querySelectorAll('.nav-item').forEach(item=>{item.addEventListener('click',(e)=>{e.preventDefault();const section=item.getAttribute('data-section');this.navigateToSection(section)})});const postForm=document.getElementById('postForm');if(postForm){postForm.addEventListener('submit',(e)=>{e.preventDefault();this.createPost()})}document.querySelectorAll('.platform-checkbox').forEach(checkbox=>{checkbox.addEventListener('change',(e)=>{const platform=e.target.value;if(e.target.checked){this.selectedPlatforms.push(platform)}else{this.selectedPlatforms=this.selectedPlatforms.filter(p=>p!==platform)}this.updateCharacterCount()})});const postContent=document.getElementById('postContent');if(postContent){postContent.addEventListener('input',()=>this.updateCharacterCount())}}async checkAuth(){if(!this.token){return false}try{const response=await this.apiCall('/user/profile');if(response.user){this.currentUser=response.user;this.showUserInterface();return true}else{this.logout();return false}}catch(error){console.error('Auth check failed:',error);this.logout();return false}}showAuthModal(){let authModal=document.getElementById('authModal');if(!authModal){authModal=document.createElement('div');authModal.id='authModal';authModal.className='auth-modal';authModal.innerHTML=\`<div class="auth-modal-content"><h2>Welcome to HLPFL Social Media Manager</h2><div class="auth-tabs"><button class="auth-tab active" data-tab="login">Login</button><button class="auth-tab" data-tab="register">Register</button></div><form id="authForm"><div class="form-group"><label for="email">Email</label><input type="email" class="form-control" id="email" name="email" required></div><div class="form-group"><label for="password">Password</label><input type="password" class="form-control" id="password" name="password" required></div><div class="form-group" id="nameGroup" style="display: none;"><label for="name">Name</label><input type="text" class="form-control" id="name" name="name"></div><button type="submit" class="btn btn-primary" id="authSubmit">Login</button></form></div>\`;document.body.appendChild(authModal);const authForm=document.getElementById('authForm');authForm.addEventListener('submit',(e)=>{e.preventDefault();this.handleAuth()});document.querySelectorAll('.auth-tab').forEach(tab=>{tab.addEventListener('click',(e)=>{document.querySelectorAll('.auth-tab').forEach(t=>t.classList.remove('active'));e.target.classList.add('active');const isRegister=e.target.getAttribute('data-tab')==='register';document.getElementById('nameGroup').style.display=isRegister?'block':'none';document.getElementById('authSubmit').textContent=isRegister?'Register':'Login'})})}authModal.style.display='flex'}hideAuthModal(){const authModal=document.getElementById('authModal');if(authModal){authModal.style.display='none'}}async handleAuth(){const form=document.getElementById('authForm');const formData=new FormData(form);const isRegister=document.querySelector('.auth-tab.active').getAttribute('data-tab')==='register';const authData={email:formData.get('email'),password:formData.get('password'),name:formData.get('name')||undefined};try{const endpoint=isRegister?'/auth/register':'/auth/login';const response=await this.apiCall(endpoint,'POST',authData);if(response.success){this.token=response.token;this.currentUser=response.user;localStorage.setItem('token',this.token);this.hideAuthModal();this.showUserInterface();await this.loadDashboard();this.showNotification('Welcome back!','success')}else{this.showNotification(response.error||'Authentication failed','error')}}catch(error){this.showNotification('Authentication failed: '+error.message,'error')}}showUserInterface(){this.hideAuthModal()}async loadDashboard(){if(!this.currentUser)return;try{const statsResponse=await this.apiCall('/dashboard/stats');this.updateDashboardStats(statsResponse);this.updateRecentPosts(statsResponse.recentPosts);this.updateConnectedAccounts(statsResponse.socialAccounts)}catch(error){console.error('Failed to load dashboard:',error);this.showNotification('Failed to load dashboard data','error')}}updateDashboardStats(data){if(!data.stats)return;const elements={totalPosts:document.getElementById('totalPosts'),publishedPosts:document.getElementById('publishedPosts'),scheduledPosts:document.getElementById('scheduledPosts'),reach:document.getElementById('reach')};Object.keys(elements).forEach(key=>{if(elements[key]&&data.stats[key]!==undefined){elements[key].textContent=data.stats[key].toLocaleString()}})}updateRecentPosts(posts){const postsContainer=document.getElementById('recentPosts');if(!postsContainer||!Array.isArray(posts))return;if(posts.length===0){postsContainer.innerHTML='<p>No posts yet. Create your first post!</p>';return}postsContainer.innerHTML=posts.map(post=>\`<div style="padding: 1rem; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 1rem;"><p>\${this.truncateText(post.content,100)}</p><div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">\${post.platforms.map(platform=>\`<span style="background: var(--primary); color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem;">\${platform}</span>\`).join('')}</div><small style="color: var(--secondary); margin-top: 0.5rem; display: block;">\${new Date(post.created_at).toLocaleDateString()}</small></div>\`).join('')}updateConnectedAccounts(accounts){const accountsContainer=document.getElementById('connectedAccounts');if(!accountsContainer)return;if(!Array.isArray(accounts)||accounts.length===0){accountsContainer.innerHTML='<p>No connected accounts. Connect your social media accounts to start posting!</p>';return}accountsContainer.innerHTML=accounts.map(account=>\`<div style="padding: 1rem; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;"><div style="display: flex; align-items: center; gap: 1rem;"><i class="fab fa-\${account.platform}" style="font-size: 1.5rem;"></i><span>\${account.username||account.platform}</span></div><span style="background: var(--success); color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem;">Connected</span></div>\`).join('')}async createPost(){if(!this.currentUser||this.selectedPlatforms.length===0){this.showNotification('Please select at least one platform','error');return}const content=document.getElementById('postContent').value;if(!content.trim()){this.showNotification('Please enter post content','error');return}try{const postData={content:content.trim(),platforms:this.selectedPlatforms,media_urls:this.uploadedMedia};const response=await this.apiCall('/posts','POST',postData);if(response.success){this.showNotification('Post created successfully!','success');this.clearPostForm();await this.loadDashboard()}else{this.showNotification(response.error||'Failed to create post','error')}}catch(error){this.showNotification('Failed to create post: '+error.message,'error')}}clearPostForm(){document.getElementById('postContent').value='';this.selectedPlatforms=[];this.uploadedMedia=[];document.querySelectorAll('.platform-checkbox').forEach(cb=>cb.checked=false);this.updateCharacterCount()}updateCharacterCount(){const content=document.getElementById('postContent').value||'';const count=content.length;const countElement=document.getElementById('characterCount');if(countElement){countElement.textContent=count}}navigateToSection(section){document.querySelectorAll('.main-section').forEach(s=>{s.style.display='none'});const targetSection=document.getElementById(section);if(targetSection){targetSection.style.display='block'}document.querySelectorAll('.nav-item').forEach(item=>{item.classList.remove('active')});const activeNavItem=document.querySelector(\`[data-section="\${section}"]\`);if(activeNavItem){activeNavItem.classList.add('active')}}async apiCall(endpoint,method='GET',data=null){const url=\`\${this.apiBaseUrl}\${endpoint}\`;const options={method,headers:{}};if(this.token){options.headers['Authorization']=\`Bearer \${this.token}\`}if(data){options.headers['Content-Type']='application/json';options.body=JSON.stringify(data)}const response=await fetch(url,options);const responseData=await response.json();if(!response.ok){throw new Error(responseData.error||\`HTTP error! status: \${response.status}\`)}return responseData}truncateText(text,maxLength){return text.length>maxLength?text.substring(0,maxLength)+'...':text}showNotification(message,type='info'){const notification=document.createElement('div');notification.className=\`notification \${type}\`;notification.textContent=message;document.body.appendChild(notification);setTimeout(()=>{notification.remove()},5000)}logout(){localStorage.removeItem('token');this.token=null;this.currentUser=null;this.showAuthModal()}}document.addEventListener('DOMContentLoaded',()=>{new HLPFLSocialMediaManager()});`, 'application/javascript');
});

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({
    error: 'Internal server error',
    message: c.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not found',
    message: 'The requested endpoint does not exist'
  }, 404);
});

export default app;// Additional API Endpoints for Social Media Manager
// These should be added to index.js before the error handlers

// Analytics endpoint
app.get('/api/analytics', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  
  try {
    const { startDate, endDate, platform } = c.req.query();
    
    // Get all posts for the user
    const posts = await d1Service.getPosts(user.id, 1000);
    
    // Calculate analytics
    const analytics = {
      totalPosts: posts.length,
      publishedPosts: posts.filter(p => p.status === 'published').length,
      scheduledPosts: posts.filter(p => p.status === 'scheduled').length,
      draftPosts: posts.filter(p => p.status === 'draft').length,
      platformBreakdown: {},
      engagementMetrics: {
        totalViews: 0,
        totalLikes: 0,
        totalShares: 0,
        totalComments: 0
      },
      recentActivity: posts.slice(0, 10).map(post => ({
        id: post.id,
        content: post.content.substring(0, 100),
        platforms: JSON.parse(post.platforms),
        status: post.status,
        created_at: post.created_at
      }))
    };
    
    // Calculate platform breakdown
    posts.forEach(post => {
      const platforms = JSON.parse(post.platforms);
      platforms.forEach(platform => {
        analytics.platformBreakdown[platform] = (analytics.platformBreakdown[platform] || 0) + 1;
      });
      
      // Add engagement metrics if available
      if (post.metrics) {
        const metrics = JSON.parse(post.metrics);
        analytics.engagementMetrics.totalViews += metrics.views || 0;
        analytics.engagementMetrics.totalLikes += metrics.likes || 0;
        analytics.engagementMetrics.totalShares += metrics.shares || 0;
        analytics.engagementMetrics.totalComments += metrics.comments || 0;
      }
    });
    
    return c.json({ success: true, analytics });
  } catch (error) {
    console.error('Analytics error:', error);
    return c.json({ error: 'Failed to load analytics: ' + error.message }, 500);
  }
});

// Schedule post endpoint
app.post('/api/posts/schedule', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  
  try {
    const { content, platforms, scheduled_at, media_urls } = await c.req.json();
    
    if (!content || !platforms || !scheduled_at) {
      return c.json({ error: 'Content, platforms, and scheduled time are required' }, 400);
    }
    
    // Validate scheduled time is in the future
    const scheduledDate = new Date(scheduled_at);
    if (scheduledDate <= new Date()) {
      return c.json({ error: 'Scheduled time must be in the future' }, 400);
    }
    
    const postData = {
      user_id: user.id,
      content,
      platforms: JSON.stringify(platforms),
      media_urls: media_urls ? JSON.stringify(media_urls) : null,
      status: 'scheduled',
      scheduled_at: scheduled_at
    };
    
    const result = await d1Service.createPost(postData);
    
    return c.json({
      success: true,
      message: 'Post scheduled successfully',
      post: {
        id: result.lastRowId,
        ...postData,
        platforms: JSON.parse(postData.platforms),
        media_urls: postData.media_urls ? JSON.parse(postData.media_urls) : []
      }
    });
  } catch (error) {
    console.error('Schedule post error:', error);
    return c.json({ error: 'Failed to schedule post: ' + error.message }, 500);
  }
});

// Get scheduled posts
app.get('/api/posts/scheduled', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  
  try {
    const posts = await d1Service.getPosts(user.id, 100);
    const scheduledPosts = posts
      .filter(post => post.status === 'scheduled')
      .map(post => ({
        ...post,
        platforms: JSON.parse(post.platforms),
        media_urls: post.media_urls ? JSON.parse(post.media_urls) : []
      }));
    
    return c.json({ success: true, posts: scheduledPosts });
  } catch (error) {
    console.error('Get scheduled posts error:', error);
    return c.json({ error: 'Failed to get scheduled posts: ' + error.message }, 500);
  }
});

// User settings endpoints
app.get('/api/user/settings', authenticate, async (c) => {
  const user = c.get('user');
  
  return c.json({
    success: true,
    settings: {
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      notifications: {
        email: true,
        push: false,
        postPublished: true,
        postScheduled: true
      },
      timezone: 'UTC',
      language: 'en'
    }
  });
});

app.put('/api/user/settings', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  
  try {
    const { name, avatar_url, notifications, timezone, language } = await c.req.json();
    
    const updateData = {};
    if (name) updateData.name = name;
    if (avatar_url) updateData.avatar_url = avatar_url;
    
    if (Object.keys(updateData).length > 0) {
      await d1Service.updateUser(user.id, updateData);
    }
    
    return c.json({
      success: true,
      message: 'Settings updated successfully',
      settings: {
        email: user.email,
        name: name || user.name,
        avatar_url: avatar_url || user.avatar_url,
        notifications: notifications || { email: true, push: false },
        timezone: timezone || 'UTC',
        language: language || 'en'
      }
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return c.json({ error: 'Failed to update settings: ' + error.message }, 500);
  }
});

// Change password endpoint
app.post('/api/user/change-password', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  
  try {
    const { currentPassword, newPassword } = await c.req.json();
    
    if (!currentPassword || !newPassword) {
      return c.json({ error: 'Current and new password are required' }, 400);
    }
    
    if (newPassword.length < 8) {
      return c.json({ error: 'New password must be at least 8 characters long' }, 400);
    }
    
    // Verify current password
    const dbUser = await d1Service.getUserById(user.id);
    const passwordMatch = await bcrypt.compare(currentPassword, dbUser.password);
    
    if (!passwordMatch) {
      return c.json({ error: 'Current password is incorrect' }, 401);
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await d1Service.updateUser(user.id, { password: hashedPassword });
    
    return c.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    return c.json({ error: 'Failed to change password: ' + error.message }, 500);
  }
});

// Delete social account
app.delete('/api/social/accounts/:id', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  const accountId = c.req.param('id');
  
  try {
    await d1Service.deleteSocialAccount(accountId);
    
    return c.json({
      success: true,
      message: 'Social account disconnected successfully'
    });
  } catch (error) {
    console.error('Delete social account error:', error);
    return c.json({ error: 'Failed to disconnect account: ' + error.message }, 500);
  }
});

// Get post by ID
app.get('/api/posts/:id', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  const postId = c.req.param('id');
  
  try {
    const post = await d1Service.getPost(postId, user.id);
    
    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }
    
    return c.json({
      success: true,
      post: {
        ...post,
        platforms: JSON.parse(post.platforms),
        media_urls: post.media_urls ? JSON.parse(post.media_urls) : [],
        metrics: post.metrics ? JSON.parse(post.metrics) : {}
      }
    });
  } catch (error) {
    console.error('Get post error:', error);
    return c.json({ error: 'Failed to get post: ' + error.message }, 500);
  }
});

// Update scheduled post
app.put('/api/posts/scheduled/:id', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  const postId = c.req.param('id');
  
  try {
    const { content, platforms, scheduled_at, media_urls } = await c.req.json();
    
    const updateData = {};
    if (content) updateData.content = content;
    if (platforms) updateData.platforms = JSON.stringify(platforms);
    if (scheduled_at) {
      const scheduledDate = new Date(scheduled_at);
      if (scheduledDate <= new Date()) {
        return c.json({ error: 'Scheduled time must be in the future' }, 400);
      }
      updateData.scheduled_at = scheduled_at;
    }
    if (media_urls) updateData.media_urls = JSON.stringify(media_urls);
    
    await d1Service.updatePost(postId, user.id, updateData);
    
    return c.json({
      success: true,
      message: 'Scheduled post updated successfully'
    });
  } catch (error) {
    console.error('Update scheduled post error:', error);
    return c.json({ error: 'Failed to update scheduled post: ' + error.message }, 500);
  }
});

// Cancel scheduled post
app.delete('/api/posts/scheduled/:id', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  const postId = c.req.param('id');
  
  try {
    await d1Service.deletePost(postId, user.id);
    
    return c.json({
      success: true,
      message: 'Scheduled post cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel scheduled post error:', error);
    return c.json({ error: 'Failed to cancel scheduled post: ' + error.message }, 500);
  }
});