<content>import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from 'hono/cloudflare-workers';
import { D1Service } from './d1-service.js';
import oauthHandlers from './oauth-fixed.js';

const app = new Hono();

// CORS middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

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

// Simple JWT verification
function verifyToken(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp && payload.exp < now) return null;
    return payload;
  } catch (error) {
    return null;
  }
}

// Simple JWT signing
function signToken(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = btoa(encodedHeader + '.' + encodedPayload + secret);
  
  return encodedHeader + '.' + encodedPayload + '.' + signature;
}

// Health check
app.get('/api/health', async (c) => {
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: 'Invalid email format' }, 400);
    }

    const d1Service = new D1Service(c.env.DB);
    
    const existingUser = await d1Service.getUserByEmail(email);
    if (existingUser) {
      return c.json({ error: 'User already exists' }, 409);
    }

    const user = await d1Service.createUser(email, password, name);
    
    const tokenPayload = { userId: user.id, email: user.email };
    const jwtSecret = c.env.JWT_SECRET || 'fallback-secret-change-in-production';
    const token = signToken(tokenPayload, jwtSecret);

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
    
    if (!user || !(await d1Service.verifyPassword(password, user.password_hash))) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const tokenPayload = { userId: user.id, email: user.email };
    const jwtSecret = c.env.JWT_SECRET || 'fallback-secret-change-in-production';
    const token = signToken(tokenPayload, jwtSecret);

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
  const { password, ...userWithoutPassword } = user;
  return c.json({ user: userWithoutPassword });
});

// Dashboard data
app.get('/api/dashboard/stats', authenticate, async (c) => {
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  
  try {
    const stats7d = await d1Service.getPostStats(user.id, '7d');
    const stats30d = await d1Service.getPostStats(user.id, '30d');
    const recentPosts = await d1Service.getPosts(user.id, 5);
    const socialAccounts = await d1Service.getSocialAccounts(user.id);

    return c.json({
      stats: {
        totalPosts: stats30d.totalPosts,
        publishedPosts: stats30d.publishedPosts,
        scheduledPosts: stats30d.scheduledPosts,
        reach: stats30d.reach,
        engagementRate: stats30d.engagementRate,
        weeklyGrowth: stats7d.totalPosts - 0 // Calculate week over week
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

    const post = await d1Service.createPost(user.id, {
      content,
      platforms: JSON.stringify(platforms),
      media_urls: media_urls ? JSON.stringify(media_urls) : null,
      scheduled_at,
      media_urls,
      status: scheduled_at ? 'scheduled' : 'draft'
    });
  } catch (error) {
    console.error('Create post error:', error);
    return c.json({ error: 'Failed to create post: ' + error.message }, 500);
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

app.delete('/api/social/accounts/:platform', authenticate, async (c) => {
  const platform = c.req.param('platform');
  const user = c.get('user');
  const d1Service = c.get('d1Service');
  
  try {
    await d1Service.deleteSocialAccount(user.id, platform);
    return c.json({ success: true, message: `${platform} account disconnected` });
  } catch (error) {
    console.error('Delete social account error:', error);
    return c.json({ error: 'Failed to disconnect account: ' + error.message }, 500);
  }
});

// OAuth routes - use the fixed OAuth handlers
app.route('/auth', oauthHandlers);

// Serve frontend
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HLPFL Social Media Manager</title>
    <link rel="stylesheet" href="/styles.css">
    <link rel="icon" href="/favicon.ico" type="image/x-icon">
    <script src="https://kit.fontawesome.com/a076d05399.js" crossorigin="anonymous"></script>
</head>
<body>
    <div id="app">
        <div class="auth-modal" id="authModal">
            <div class="auth-modal-content">
                <div class="auth-header">
                    <img src="/logo.svg" alt="HLPFL Logo" class="auth-logo">
                    <div>
                        <h1>HLPFL</h1>
                        <p>Social Media Manager</p>
                    </div>
                </div>
                <div class="auth-tabs">
                    <button class="auth-tab active" data-tab="login">Login</button>
                    <button class="auth-tab" data-tab="register">Register</button>
                </div>
                <form id="authForm">
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" class="form-control" id="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" class="form-control" id="password" name="password" required>
                    </div>
                    <div class="form-group" id="nameGroup" style="display: none;">
                        <label for="name">Name</label>
                        <input type="text" class="form-control" id="name" name="name">
                    </div>
                    <button type="submit" class="btn btn-primary" id="authSubmit">Login</button>
                </form>
            </div>
        </div>

        <div class="app-container" id="appContainer" style="display: none;">
            <aside class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <img src="/logo.svg" alt="HLPFL Logo" class="sidebar-logo">
                    <div>
                        <h1>HLPFL</h1>
                        <p>Social Media Manager</p>
                        <div class="user-info" id="userInfo"></div>
                    </div>
                </div>
                <nav class="sidebar-nav">
                    <a href="#dashboard" class="nav-item active" data-section="dashboard">
                        <i class="fas fa-tachometer-alt"></i> Dashboard
                    </a>
                    <a href="#compose" class="nav-item" data-section="compose">
                        <i class="fas fa-pen"></i> Create Post
                    </a>
                    <a href="#accounts" class="nav-item" data-section="accounts">
                        <i class="fas fa-user-circle"></i> Social Accounts
                    </a>
                    <a href="#analytics" class="nav-item" data-section="analytics">
                        <i class="fas fa-chart-line"></i> Analytics
                    </a>
                    <a href="#scheduler" class="nav-item" data-section="scheduler">
                        <i class="fas fa-calendar"></i> Scheduler
                    </a>
                    <a href="#media" class="nav-item" data-section="media">
                        <i class="fas fa-images"></i> Media Library
                    </a>
                    <a href="#settings" class="nav-item" data-section="settings">
                        <i class="fas fa-cog"></i> Settings
                    </a>
                </nav>
            </aside>

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
                            <div class="stat-change">All time</div>
                        </div>
                        <div class="stat-card">
                            <h3>Published</h3>
                            <div class="stat-value" id="publishedPosts">0</div>
                            <div class="stat-change">All time</div>
                        </div>
                        <div class="stat-card">
                            <h3>Scheduled</h3>
                            <div class="stat-value" id="scheduledPosts">0</div>
                            <div class="stat-change">Scheduled</div>
                        </div>
                        <div class="stat-card">
                            <h3>Total Reach</h3>
                            <div class="stat-value" id="reach">0</div>
                            <div class="stat-change">All time</div>
                        </div>
                    </div>
                    <div class="dashboard-section">
                        <h3>Recent Posts</h3>
                        <div id="recentPosts"></div>
                    </div>
                    <div class="dashboard-section">
                        <h3>Connected Accounts</h3>
                        <div id="connectedAccounts"></div>
                    </div>
                </section>

                <!-- Compose Section -->
                <section id="compose" class="main-section">
                    <div class="section-header">
                        <h2><i class="fas fa-pen"></i> Create Post</h2>
                    </div>
                    <form class="compose-form" id="postForm">
                        <div class="form-group">
                            <label for="postContent">Post Content</label>
                            <textarea class="form-control" id="postContent" placeholder="What would you like to share?" rows="6"></textarea>
                            <div class="character-count" id="characterCount">0 characters</div>
                        </div>
                        <div class="form-group">
                            <label>Select Platforms</label>
                            <div class="platform-options">
                                <label class="platform-option">
                                    <input type="checkbox" name="platform" value="twitter" class="platform-checkbox">
                                    <i class="fab fa-twitter"></i> Twitter/X
                                </label>
                                <label class="platform-option">
                                    <input type="checkbox" name="platform" value="linkedin" class="platform-checkbox">
                                    <i class="fab fa-linkedin"></i> LinkedIn
                                </label>
                                <label class="platform-option">
                                    <input type="checkbox" name="platform" value="facebook" class="platform-checkbox">
                                    <i class="fab fa-facebook"></i> Facebook
                                </label>
                                <label class="platform-option">
                                    <input type="checkbox" name="platform" value="instagram" class="platform-checkbox">
                                    <i class="fab fa-instagram"></i> Instagram
                                </label>
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="saveDraft()">Save as Draft</button>
                            <button type="submit" class="btn btn-primary">Publish Now</button>
                        </div>
                    </form>
                </section>

                <!-- Social Accounts Section -->
                <section id="accounts" class="main-section">
                    <div class="section-header">
                        <h2><i class="fas fa-user-circle"></i> Social Accounts</h2>
                        <button class="btn-primary" onclick="loadSocialAccounts()">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                    
                    <div class="accounts-grid">
                        <!-- Twitter/X Account -->
                        <div class="account-card" data-platform="twitter">
                            <div class="account-header">
                                <div class="account-info">
                                    <div class="account-icon twitter">
                                        <i class="fab fa-x-twitter"></i>
                                    </div>
                                    <div>
                                        <h3>Twitter / X</h3>
                                        <p class="account-status">Not connected</p>
                                    </div>
                                </div>
                                <button class="btn-connect btn-outline" data-platform="twitter" onclick="connectSocialAccount('twitter')">
                                    Connect
                                </button>
                            </div>
                            <div class="account-details">
                                <div class="connection-info">
                                    <div class="oauth-loading">
                                        <i class="fas fa-spinner fa-spin"></i>
                                        <span>Loading...</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- LinkedIn Account -->
                        <div class="account-card" data-platform="linkedin">
                            <div class="account-header">
                                <div class="account-info">
                                    <div class="account-icon linkedin">
                                        <i class="fab fa-linkedin"></i>
                                    </div>
                                    <div>
                                        <h3>LinkedIn</h3>
                                        <p class="account-status">Not connected</p>
                                    </div>
                                </div>
                                <button class="btn-connect btn-outline" data-platform="linkedin" onclick="connectSocialAccount('linkedin')">
                                    Connect
                                </button>
                            </div>
                            <div class="account-details">
                                <div class="connection-info">
                                    <div class="oauth-loading">
                                        <i class="fas fa-spinner fa-spin"></i>
                                        <span>Loading...</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Facebook Account -->
                        <div class="account-card" data-platform="facebook">
                            <div class="account-header">
                                <div class="account-info">
                                    <div class="account-icon facebook">
                                        <i class="fab fa-facebook"></i>
                                    </div>
                                    <div>
                                        <h3>Facebook</h3>
                                        <p class="account-status">Not connected</p>
                                    </div>
                                </div>
                                <button class="btn-connect btn-outline" data-platform="facebook" onclick="connectSocialAccount('facebook')">
                                    Connect
                                </button>
                            </div>
                            <div class="account-details">
                                <div class="connection-info">
                                    <div class="oauth-loading">
                                        <i class="fas fa-spinner fa-spin"></i>
                                        <span>Loading...</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Instagram Account -->
                        <div class="account-card" data-platform="instagram">
                            <div class="account-header">
                                <div class="account-info">
                                    <div class="account-icon instagram">
                                        <i class="fab fa-instagram"></i>
                                    </div>
                                    <div>
                                        <h3>Instagram</h3>
                                        <p class="account-status">Not connected</p>
                                    </div>
                                </div>
                                <button class="btn-connect btn-outline" data-platform="instagram" onclick="connectSocialAccount('instagram')">
                                    Connect
                                </button>
                            </div>
                            <div class="account-details">
                                <div class="connection-info">
                                    <div class="oauth-loading">
                                        <i class="fas fa-spinner fa-spin"></i>
                                        <span>Loading...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Analytics Section -->
                <section id="analytics" class="main-section">
                    <div class="section-header">
                        <h2><i class="fas fa-chart-line"></i> Analytics</h2>
                    </div>
                    <div class="compose-form" id="analyticsContent">
                        <div class="loading"></div>
                    </div>
                </section>

                <!-- Scheduler Section -->
                <section id="scheduler" class="main-section">
                    <div class="section-header">
                        <h2><i class="fas fa-calendar"></i> Content Scheduler</h2>
                    </div>
                    <div class="compose-form">
                        <div id="scheduledPostsList">
                            <div class="loading"></div>
                        </div>
                    </div>
                </section>

                <!-- Media Library Section -->
                <section id="media" class="main-section">
                    <div class="section-header">
                        <h2><i class="fas fa-images"></i> Media Library</h2>
                    </div>
                    <div class="compose-form">
                        <div class="empty-state">
                            <i class="fas fa-images"></i>
                            <h3>Media Library</h3>
                            <p>Upload and manage your media files for social posts. Coming soon!</p>
                        </div>
                    </div>
                </section>

                <!-- Settings Section -->
                <section id="settings" class="main-section">
                    <div class="section-header">
                        <h2><i class="fas fa-cog"></i> Settings</h2>
                    </div>
                    <div class="compose-form">
                        <h3 style="margin-bottom: 1.5rem; color: var(--text-primary);">Profile Settings</h3>
                        <form id="settingsForm">
                            <div class="form-group">
                                <label for="settingsName">Name</label>
                                <input type="text" class="form-control" id="settingsName" placeholder="Your Name">
                            </div>
                            <div class="form-group">
                                <label for="settingsEmail">Email</label>
                                <input type="email" class="form-control" id="settingsEmail" placeholder="Your Email" disabled>
                            </div>
                            <div class="form-group">
                                <label for="settingsAvatar">Avatar URL</label>
                                <input type="url" class="form-control" id="settingsAvatar" placeholder="https://example.com/avatar.jpg">
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">Save Settings</button>
                            </div>
                        </form>
                    </div>
                </section>
            </main>
        </div>
    </div>
    <script src="/app.js"></script>
</body>
</html>`);
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

export default app;
</content>
