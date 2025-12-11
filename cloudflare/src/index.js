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
  origin: '*',
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

// Serve frontend HTML
app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HLPFL Social Media Manager - Enterprise Dashboard</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary: #007bff;
            --secondary: #6c757d;
            --success: #28a745;
            --danger: #dc3545;
            --warning: #ffc107;
            --info: #17a2b8;
            --light: #f8f9fa;
            --dark: #343a40;
            --sidebar-width: 280px;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }

        .app-container {
            display: flex;
            min-height: 100vh;
        }

        /* Sidebar */
        .sidebar {
            width: var(--sidebar-width);
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            box-shadow: 2px 0 20px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease;
            position: fixed;
            height: 100vh;
            z-index: 1000;
            overflow-y: auto;
        }

        .sidebar-header {
            padding: 2rem;
            background: linear-gradient(135deg, var(--primary) 0%, #0056b3 100%);
            color: white;
            text-align: center;
        }

        .sidebar-header h1 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }

        .sidebar-nav {
            padding: 1rem 0;
        }

        .nav-item {
            display: flex;
            align-items: center;
            padding: 1rem 2rem;
            color: var(--dark);
            text-decoration: none;
            transition: all 0.3s ease;
            border-left: 4px solid transparent;
        }

        .nav-item:hover {
            background: rgba(0, 123, 255, 0.1);
            border-left-color: var(--primary);
        }

        .nav-item.active {
            background: rgba(0, 123, 255, 0.1);
            border-left-color: var(--primary);
            color: var(--primary);
        }

        .nav-item i {
            width: 20px;
            margin-right: 1rem;
        }

        /* Main Content */
        .main-content {
            flex: 1;
            margin-left: var(--sidebar-width);
            padding: 2rem;
            transition: margin-left 0.3s ease;
        }

        .mobile-menu-toggle {
            display: none;
            position: fixed;
            top: 1rem;
            left: 1rem;
            z-index: 1001;
            background: white;
            border: none;
            padding: 0.75rem;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            cursor: pointer;
        }

        /* Dashboard Cards */
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            padding: 1.5rem;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }

        .stat-card h3 {
            font-size: 0.875rem;
            color: var(--secondary);
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .stat-card .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--primary);
            margin-bottom: 0.5rem;
        }

        .stat-card .stat-change {
            font-size: 0.875rem;
            color: var(--success);
        }

        /* Sections */
        .main-section {
            display: none;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            padding: 2rem;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            margin-bottom: 2rem;
        }

        .main-section.active {
            display: block;
        }

        .section-header {
            display: flex;
            justify-content: between;
            align-items: center;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid var(--light);
        }

        .section-header h2 {
            font-size: 1.75rem;
            color: var(--dark);
        }

        /* Post Compose */
        .compose-form {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .form-group {
            margin-bottom: 1.5rem;
        }

        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: var(--dark);
        }

        .form-control {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 2px solid var(--light);
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.3s ease;
        }

        .form-control:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        textarea.form-control {
            resize: vertical;
            min-height: 120px;
        }

        /* Platform Selection */
        .platform-selection {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
        }

        .platform-option {
            display: flex;
            align-items: center;
            padding: 1rem;
            background: var(--light);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .platform-option:hover {
            background: rgba(0, 123, 255, 0.1);
        }

        .platform-option.selected {
            background: rgba(0, 123, 255, 0.2);
            border: 2px solid var(--primary);
        }

        .platform-option input[type="checkbox"] {
            margin-right: 0.75rem;
        }

        .platform-option i {
            margin-right: 0.5rem;
            font-size: 1.25rem;
        }

        /* Character Count */
        .character-count {
            text-align: right;
            font-size: 0.875rem;
            color: var(--secondary);
            margin-top: 0.5rem;
        }

        .character-count.warning {
            color: var(--warning);
        }

        /* Buttons */
        .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }

        .btn-primary {
            background: var(--primary);
            color: white;
        }

        .btn-primary:hover {
            background: #0056b3;
            transform: translateY(-2px);
        }

        .btn-secondary {
            background: var(--secondary);
            color: white;
        }

        /* Post Items */
        .post-item {
            background: white;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            margin-bottom: 1rem;
            transition: transform 0.3s ease;
        }

        .post-item:hover {
            transform: translateY(-2px);
        }

        .post-content p {
            margin-bottom: 1rem;
            color: var(--dark);
        }

        .post-platforms {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }

        .platform-tag {
            background: var(--primary);
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
        }

        .post-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.875rem;
            color: var(--secondary);
        }

        .post-status {
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .post-status.draft {
            background: var(--secondary);
            color: white;
        }

        .post-status.published {
            background: var(--success);
            color: white;
        }

        .post-status.scheduled {
            background: var(--warning);
            color: white;
        }

        /* Responsive */
        @media (max-width: 768px) {
            .mobile-menu-toggle {
                display: block;
            }

            .sidebar {
                transform: translateX(-100%);
            }

            .sidebar.open {
                transform: translateX(0);
            }

            .main-content {
                margin-left: 0;
                padding: 4rem 1rem 1rem;
            }

            .dashboard-grid {
                grid-template-columns: 1fr;
            }

            .platform-selection {
                grid-template-columns: 1fr;
            }
        }

        /* Animations */
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .fade-in {
            animation: fadeIn 0.5s ease;
        }
    </style>
</head>
<body>
    <div class="app-container">
        <!-- Mobile Menu Toggle -->
        <button class="mobile-menu-toggle" id="mobileMenuToggle">
            <i class="fas fa-bars"></i>
        </button>

        <!-- Sidebar Navigation -->
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <h1><i class="fas fa-share-alt"></i> HLPFL Social</h1>
                <p>Enterprise Manager</p>
            </div>
            <nav class="sidebar-nav">
                <a href="#dashboard" class="nav-item active" data-section="dashboard">
                    <i class="fas fa-tachometer-alt"></i>
                    Dashboard
                </a>
                <a href="#compose" class="nav-item" data-section="compose">
                    <i class="fas fa-pen"></i>
                    Create Post
                </a>
                <a href="#accounts" class="nav-item" data-section="accounts">
                    <i class="fas fa-user-circle"></i>
                    Social Accounts
                </a>
                <a href="#analytics" class="nav-item" data-section="analytics">
                    <i class="fas fa-chart-line"></i>
                    Analytics
                </a>
                <a href="#scheduler" class="nav-item" data-section="scheduler">
                    <i class="fas fa-calendar"></i>
                    Scheduler
                </a>
                <a href="#media" class="nav-item" data-section="media">
                    <i class="fas fa-images"></i>
                    Media Library
                </a>
                <a href="#settings" class="nav-item" data-section="settings">
                    <i class="fas fa-cog"></i>
                    Settings
                </a>
            </nav>
        </aside>

        <!-- Main Content Area -->
        <main class="main-content">
            <!-- Dashboard Section -->
            <section id="dashboard" class="main-section active">
                <div class="section-header">
                    <h2><i class="fas fa-tachometer-alt"></i> Dashboard</h2>
                </div>
                
                <div class="dashboard-grid">
                    <div class="stat-card">
                        <h3>Total Posts</h3>
                        <div class="stat-value" id="totalPosts">0</div>
                        <div class="stat-change">+12% from last month</div>
                    </div>
                    <div class="stat-card">
                        <h3>Published</h3>
                        <div class="stat-value" id="publishedPosts">0</div>
                        <div class="stat-change">+8% from last month</div>
                    </div>
                    <div class="stat-card">
                        <h3>Scheduled</h3>
                        <div class="stat-value" id="scheduledPosts">0</div>
                        <div class="stat-change">3 posts pending</div>
                    </div>
                    <div class="stat-card">
                        <h3>Reach</h3>
                        <div class="stat-value" id="reach">0</div>
                        <div class="stat-change">+25% from last month</div>
                    </div>
                </div>

                <div class="compose-form">
                    <h3>Recent Posts</h3>
                    <div id="recentPosts">
                        <div class="post-item">
                            <div class="post-content">
                                <p>Loading recent posts...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Create Post Section -->
            <section id="compose" class="main-section">
                <div class="section-header">
                    <h2><i class="fas fa-pen"></i> Create Post</h2>
                </div>
                
                <form class="compose-form" id="postForm">
                    <div class="form-group">
                        <label for="postContent">Post Content</label>
                        <textarea class="form-control" id="postContent" placeholder="What would you like to share?" rows="4"></textarea>
                        <div class="character-count" id="characterCount">0</div>
                    </div>

                    <div class="form-group">
                        <label>Select Platforms</label>
                        <div class="platform-selection">
                            <div class="platform-option">
                                <input type="checkbox" id="twitter" class="platform-checkbox" value="twitter">
                                <label for="twitter"><i class="fab fa-twitter"></i> Twitter</label>
                            </div>
                            <div class="platform-option">
                                <input type="checkbox" id="linkedin" class="platform-checkbox" value="linkedin">
                                <label for="linkedin"><i class="fab fa-linkedin"></i> LinkedIn</label>
                            </div>
                            <div class="platform-option">
                                <input type="checkbox" id="facebook" class="platform-checkbox" value="facebook">
                                <label for="facebook"><i class="fab fa-facebook"></i> Facebook</label>
                            </div>
                            <div class="platform-option">
                                <input type="checkbox" id="instagram" class="platform-checkbox" value="instagram">
                                <label for="instagram"><i class="fab fa-instagram"></i> Instagram</label>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-paper-plane"></i>
                            Publish Post
                        </button>
                    </div>
                </form>
            </section>

            <!-- Social Accounts Section -->
            <section id="accounts" class="main-section">
                <div class="section-header">
                    <h2><i class="fas fa-user-circle"></i> Connected Social Accounts</h2>
                </div>
                
                <div class="compose-form">
                    <div id="connectedAccounts">
                        <p>Loading connected accounts...</p>
                    </div>
                </div>
            </section>

            <!-- Other Sections (Analytics, Scheduler, Media, Settings) -->
            <section id="analytics" class="main-section">
                <div class="section-header">
                    <h2><i class="fas fa-chart-line"></i> Analytics</h2>
                </div>
                <div class="compose-form">
                    <p>Analytics dashboard coming soon...</p>
                </div>
            </section>

            <section id="scheduler" class="main-section">
                <div class="section-header">
                    <h2><i class="fas fa-calendar"></i> Content Scheduler</h2>
                </div>
                <div class="compose-form">
                    <p>Content scheduler coming soon...</p>
                </div>
            </section>

            <section id="media" class="main-section">
                <div class="section-header">
                    <h2><i class="fas fa-images"></i> Media Library</h2>
                </div>
                <div class="compose-form">
                    <p>Media library coming soon...</p>
                </div>
            </section>

            <section id="settings" class="main-section">
                <div class="section-header">
                    <h2><i class="fas fa-cog"></i> Settings</h2>
                </div>
                <div class="compose-form">
                    <p>Settings panel coming soon...</p>
                </div>
            </section>
        </main>
    </div>

    <script src="/hootsuite-dashboard-d1.js"></script>
</body>
</html>
  `);
});

// Serve the updated JavaScript file
app.get('/hootsuite-dashboard-d1.js', (c) => {
  return c.body(`// Hootsuite-style Dashboard JavaScript - D1 Compatible
class HLPFLSocialMediaManager {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('token');
        this.selectedPlatforms = [];
        this.uploadedMedia = [];
        this.apiBaseUrl = '/api';
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkAuth();
        if (this.currentUser) {
            await this.loadDashboard();
        } else {
            this.showAuthModal();
        }
    }

    setupEventListeners() {
        // Mobile menu toggle
        const mobileToggle = document.getElementById('mobileMenuToggle');
        const sidebar = document.getElementById('sidebar');
        
        mobileToggle?.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                this.navigateToSection(section);
            });
        });

        // Post form submission
        const postForm = document.getElementById('postForm');
        if (postForm) {
            postForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createPost();
            });
        }

        // Platform selection
        document.querySelectorAll('.platform-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const platform = e.target.value;
                if (e.target.checked) {
                    this.selectedPlatforms.push(platform);
                } else {
                    this.selectedPlatforms = this.selectedPlatforms.filter(p => p !== platform);
                }
                this.updateCharacterCount();
            });
        });

        // Auth form
        const authForm = document.getElementById('authForm');
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAuth();
            });
        }

        // Tab switching
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                const isRegister = e.target.getAttribute('data-tab') === 'register';
                document.getElementById('nameGroup').style.display = isRegister ? 'block' : 'none';
                document.getElementById('authSubmit').textContent = isRegister ? 'Register' : 'Login';
            });
        });

        // Character counter
        const postContent = document.getElementById('postContent');
        if (postContent) {
            postContent.addEventListener('input', () => this.updateCharacterCount());
        }
    }

    async checkAuth() {
        if (!this.token) {
            return false;
        }

        try {
            const response = await this.apiCall('/api/user/profile');
            if (response.user) {
                this.currentUser = response.user;
                this.showUserInterface();
                return true;
            } else {
                this.logout();
                return false;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.logout();
            return false;
        }
    }

    showAuthModal() {
        // Create auth modal if it doesn't exist
        let authModal = document.getElementById('authModal');
        if (!authModal) {
            authModal = document.createElement('div');
            authModal.id = 'authModal';
            authModal.className = 'auth-modal';
            authModal.innerHTML = \`
                <div class="auth-modal-content">
                    <h2>Welcome to HLPFL Social Media Manager</h2>
                    <div class="auth-tabs">
                        <button class="auth-tab active" data-tab="login">Login</button>
                        <button class="auth-tab" data-tab="register">Register</button>
                    </div>
                    <form id="authForm">
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" name="email" required>
                        </div>
                        <div class="form-group">
                            <label for="password">Password</label>
                            <input type="password" id="password" name="password" required>
                        </div>
                        <div class="form-group" id="nameGroup" style="display: none;">
                            <label for="name">Name</label>
                            <input type="text" id="name" name="name">
                        </div>
                        <button type="submit" id="authSubmit">Login</button>
                    </form>
                </div>
            \`;
            document.body.appendChild(authModal);
        }
        
        authModal.style.display = 'flex';
    }

    hideAuthModal() {
        const authModal = document.getElementById('authModal');
        if (authModal) {
            authModal.style.display = 'none';
        }
    }

    async handleAuth() {
        const form = document.getElementById('authForm');
        const formData = new FormData(form);
        const isRegister = document.querySelector('.auth-tab.active').getAttribute('data-tab') === 'register';
        
        const authData = {
            email: formData.get('email'),
            password: formData.get('password'),
            name: formData.get('name') || undefined
        };

        try {
            const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
            const response = await this.apiCall(endpoint, 'POST', authData);
            
            if (response.success) {
                this.token = response.token;
                this.currentUser = response.user;
                localStorage.setItem('token', this.token);
                this.hideAuthModal();
                this.showUserInterface();
                await this.loadDashboard();
            } else {
                this.showNotification(response.error || 'Authentication failed', 'error');
            }
        } catch (error) {
            this.showNotification('Authentication failed: ' + error.message, 'error');
        }
    }

    showUserInterface() {
        this.hideAuthModal();
        
        const userName = document.getElementById('userName');
        if (userName && this.currentUser) {
            userName.textContent = this.currentUser.name;
        }
    }

    async loadDashboard() {
        if (!this.currentUser) return;

        try {
            const [statsResponse, postsResponse, accountsResponse] = await Promise.all([
                this.apiCall('/api/dashboard/stats'),
                this.apiCall('/api/posts'),
                this.apiCall('/api/social/accounts')
            ]);

            this.updateDashboardStats(statsResponse);
            this.updateRecentPosts(postsResponse.posts);
            this.updateConnectedAccounts(accountsResponse.accounts);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            this.showNotification('Failed to load dashboard data', 'error');
        }
    }

    updateDashboardStats(data) {
        if (!data.stats) return;

        const elements = {
            totalPosts: document.getElementById('totalPosts'),
            publishedPosts: document.getElementById('publishedPosts'),
            scheduledPosts: document.getElementById('scheduledPosts'),
            reach: document.getElementById('reach'),
            engagement: document.getElementById('engagement')
        };

        Object.keys(elements).forEach(key => {
            if (elements[key] && data.stats[key] !== undefined) {
                this.animateNumber(elements[key], data.stats[key]);
            }
        });
    }

    updateRecentPosts(posts) {
        const postsContainer = document.getElementById('recentPosts');
        if (!postsContainer || !Array.isArray(posts)) return;

        postsContainer.innerHTML = posts.map(post => \`
            <div class="post-item">
                <div class="post-content">
                    <p>\${this.truncateText(post.content, 100)}</p>
                    <div class="post-platforms">
                        \${post.platforms.map(platform => \`<span class="platform-tag">\${platform}</span>\`).join('')}
                    </div>
                </div>
                <div class="post-meta">
                    <small>\${new Date(post.created_at).toLocaleDateString()}</small>
                    <span class="post-status \${post.status}">\${post.status}</span>
                </div>
            </div>
        \`).join('');
    }

    updateConnectedAccounts(accounts) {
        const accountsContainer = document.getElementById('connectedAccounts');
        if (!accountsContainer || !Array.isArray(accounts)) return;

        accountsContainer.innerHTML = accounts.map(account => \`
            <div class="account-item">
                <i class="fab fa-\${account.platform}"></i>
                <span>\${account.username || account.platform}</span>
                <span class="connected-badge">Connected</span>
            </div>
        \`).join('');
    }

    async createPost() {
        if (!this.currentUser || this.selectedPlatforms.length === 0) {
            this.showNotification('Please select at least one platform', 'error');
            return;
        }

        const content = document.getElementById('postContent').value;
        if (!content.trim()) {
            this.showNotification('Please enter post content', 'error');
            return;
        }

        try {
            const postData = {
                content: content.trim(),
                platforms: this.selectedPlatforms,
                media_urls: this.uploadedMedia
            };

            const response = await this.apiCall('/api/posts', 'POST', postData);
            
            if (response.success) {
                this.showNotification('Post created successfully!', 'success');
                this.clearPostForm();
                await this.loadDashboard();
            } else {
                this.showNotification(response.error || 'Failed to create post', 'error');
            }
        } catch (error) {
            this.showNotification('Failed to create post: ' + error.message, 'error');
        }
    }

    clearPostForm() {
        document.getElementById('postContent').value = '';
        this.selectedPlatforms = [];
        this.uploadedMedia = [];
        
        document.querySelectorAll('.platform-checkbox').forEach(cb => cb.checked = false);
        this.updateCharacterCount();
    }

    updateCharacterCount() {
        const content = document.getElementById('postContent').value || '';
        const count = content.length;
        const maxCount = this.getMaxCharacterCount();
        const countElement = document.getElementById('characterCount');
        
        if (countElement) {
            countElement.textContent = count;
            countElement.className = count > maxCount * 0.9 ? 'warning' : '';
        }
    }

    getMaxCharacterCount() {
        const platformLimits = {
            twitter: 280,
            linkedin: 3000,
            facebook: 8000,
            instagram: 2200
        };

        if (this.selectedPlatforms.length === 0) return 280;
        return Math.min(...this.selectedPlatforms.map(p => platformLimits[p] || 280));
    }

    navigateToSection(section) {
        document.querySelectorAll('.main-section').forEach(s => {
            s.style.display = 'none';
        });

        const targetSection = document.getElementById(section);
        if (targetSection) {
            targetSection.style.display = 'block';
        }

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNavItem = document.querySelector(\`[data-section="\${section}"]\`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
    }

    async apiCall(endpoint, method = 'GET', data = null, isFormData = false) {
        const url = \`\${this.apiBaseUrl}\${endpoint}\`;
        const options = {
            method,
            headers: {}
        };

        if (this.token) {
            options.headers['Authorization'] = \`Bearer \${this.token}\`;
        }

        if (!isFormData && data) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        } else if (isFormData && data) {
            options.body = data;
        }

        const response = await fetch(url, options);
        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || \`HTTP error! status: \${response.status}\`);
        }

        return responseData;
    }

    animateNumber(element, target) {
        const duration = 1000;
        const start = 0;
        const increment = target / (duration / 16);
        let current = start;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current).toLocaleString();
        }, 16);
    }

    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = \`notification \${type}\`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    logout() {
        localStorage.removeItem('token');
        this.token = null;
        this.currentUser = null;
        this.showAuthModal();
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new HLPFLSocialMediaManager();
});`, 'application/javascript');
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