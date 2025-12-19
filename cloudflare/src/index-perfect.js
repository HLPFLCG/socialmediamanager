/**
 * HLPFL Social Media Manager - Production Backend
 * Secure, scalable, and feature-complete API
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const app = new Hono();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS Configuration - Strict origin control
app.use('*', cors({
  origin: ['https://hlpfl.space', 'http://localhost:3000'],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// Security Headers
app.use('*', async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  await next();
});

// Rate Limiting Store (in-memory, use KV in production)
const rateLimitStore = new Map();

// Rate Limiting Middleware
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return async (c, next) => {
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const key = `${ip}:${c.req.path}`;
    const now = Date.now();
    
    const record = rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs };
    
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }
    
    record.count++;
    rateLimitStore.set(key, record);
    
    if (record.count > maxRequests) {
      return c.json({ error: 'Too many requests. Please try again later.' }, 429);
    }
    
    await next();
  };
};

// JWT Authentication Middleware
const authMiddleware = async (c, next) => {
  const publicPaths = [
    '/api/health',
    '/api/auth/register',
    '/api/auth/login',
  ];
  
  if (publicPaths.some(path => c.req.path === path)) {
    return next();
  }
  
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'No authorization token provided' }, 401);
  }
  
  try {
    const token = authHeader.substring(7);
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
    c.set('userId', payload.userId);
    c.set('userEmail', payload.email);
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
};

app.use('/api/*', authMiddleware);

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const postSchema = z.object({
  content: z.string().min(1, 'Content is required').max(5000, 'Content too long'),
  platforms: z.array(z.string()).min(1, 'At least one platform required'),
  media_urls: z.array(z.string().url()).optional(),
  scheduled_at: z.string().datetime().optional(),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  avatar_url: z.string().url().optional(),
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8),
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Generate JWT Token
async function generateToken(payload, secret, expiresIn = '7d') {
  const secretKey = new TextEncoder().encode(secret);
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
  return token;
}

// Hash Password
async function hashPassword(password) {
  return await bcrypt.hash(password, 12);
}

// Verify Password
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Validate Request Body
function validateBody(schema) {
  return async (c, next) => {
    try {
      const body = await c.req.json();
      const validated = schema.parse(body);
      c.set('validatedBody', validated);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ 
          error: 'Validation failed', 
          details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        }, 400);
      }
      return c.json({ error: 'Invalid request body' }, 400);
    }
  };
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/api/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

// Register
app.post('/api/auth/register', 
  rateLimit(5, 15 * 60 * 1000),
  validateBody(registerSchema),
  async (c) => {
    try {
      const { email, password, name } = c.get('validatedBody');
      
      // Check if user exists
      const existingUser = await c.env.DB.prepare(
        'SELECT id FROM users WHERE email = ?'
      ).bind(email).first();
      
      if (existingUser) {
        return c.json({ error: 'Email already registered' }, 409);
      }
      
      // Hash password
      const passwordHash = await hashPassword(password);
      
      // Create user
      const result = await c.env.DB.prepare(
        'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
      ).bind(email, passwordHash, name).run();
      
      if (!result.success) {
        throw new Error('Failed to create user');
      }
      
      const userId = result.meta.last_row_id;
      
      // Generate token
      const token = await generateToken(
        { userId, email, name },
        c.env.JWT_SECRET
      );
      
      return c.json({
        message: 'Registration successful',
        token,
        user: { id: userId, email, name }
      }, 201);
      
    } catch (error) {
      console.error('Registration error:', error);
      return c.json({ error: 'Registration failed' }, 500);
    }
  }
);

// Login
app.post('/api/auth/login',
  rateLimit(5, 15 * 60 * 1000),
  validateBody(loginSchema),
  async (c) => {
    try {
      const { email, password } = c.get('validatedBody');
      
      // Find user
      const user = await c.env.DB.prepare(
        'SELECT id, email, name, password_hash, avatar_url FROM users WHERE email = ?'
      ).bind(email).first();
      
      if (!user) {
        return c.json({ error: 'Invalid email or password' }, 401);
      }
      
      // Verify password
      const isValid = await verifyPassword(password, user.password_hash);
      if (!isValid) {
        return c.json({ error: 'Invalid email or password' }, 401);
      }
      
      // Generate token
      const token = await generateToken(
        { userId: user.id, email: user.email, name: user.name },
        c.env.JWT_SECRET
      );
      
      return c.json({
        message: 'Login successful',
        token,
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name,
          avatar_url: user.avatar_url 
        }
      });
      
    } catch (error) {
      console.error('Login error:', error);
      return c.json({ error: 'Login failed' }, 500);
    }
  }
);

// ============================================================================
// USER ENDPOINTS
// ============================================================================

// Get User Profile
app.get('/api/user/profile', async (c) => {
  try {
    const userId = c.get('userId');
    
    const user = await c.env.DB.prepare(
      'SELECT id, email, name, avatar_url, created_at FROM users WHERE id = ?'
    ).bind(userId).first();
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    return c.json({ user });
    
  } catch (error) {
    console.error('Get profile error:', error);
    return c.json({ error: 'Failed to get profile' }, 500);
  }
});

// Update User Profile
app.put('/api/user/profile',
  validateBody(updateProfileSchema),
  async (c) => {
    try {
      const userId = c.get('userId');
      const updates = c.get('validatedBody');
      
      const fields = [];
      const values = [];
      
      if (updates.name) {
        fields.push('name = ?');
        values.push(updates.name);
      }
      if (updates.email) {
        // Check if email is already taken
        const existing = await c.env.DB.prepare(
          'SELECT id FROM users WHERE email = ? AND id != ?'
        ).bind(updates.email, userId).first();
        
        if (existing) {
          return c.json({ error: 'Email already in use' }, 409);
        }
        
        fields.push('email = ?');
        values.push(updates.email);
      }
      if (updates.avatar_url) {
        fields.push('avatar_url = ?');
        values.push(updates.avatar_url);
      }
      
      if (fields.length === 0) {
        return c.json({ error: 'No fields to update' }, 400);
      }
      
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(userId);
      
      await c.env.DB.prepare(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`
      ).bind(...values).run();
      
      // Get updated user
      const user = await c.env.DB.prepare(
        'SELECT id, email, name, avatar_url FROM users WHERE id = ?'
      ).bind(userId).first();
      
      return c.json({ 
        message: 'Profile updated successfully',
        user 
      });
      
    } catch (error) {
      console.error('Update profile error:', error);
      return c.json({ error: 'Failed to update profile' }, 500);
    }
  }
);

// Change Password
app.post('/api/user/change-password',
  validateBody(changePasswordSchema),
  async (c) => {
    try {
      const userId = c.get('userId');
      const { current_password, new_password } = c.get('validatedBody');
      
      // Get current password hash
      const user = await c.env.DB.prepare(
        'SELECT password_hash FROM users WHERE id = ?'
      ).bind(userId).first();
      
      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }
      
      // Verify current password
      const isValid = await verifyPassword(current_password, user.password_hash);
      if (!isValid) {
        return c.json({ error: 'Current password is incorrect' }, 401);
      }
      
      // Hash new password
      const newHash = await hashPassword(new_password);
      
      // Update password
      await c.env.DB.prepare(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).bind(newHash, userId).run();
      
      return c.json({ message: 'Password changed successfully' });
      
    } catch (error) {
      console.error('Change password error:', error);
      return c.json({ error: 'Failed to change password' }, 500);
    }
  }
);

// ============================================================================
// POST ENDPOINTS
// ============================================================================

// Create Post
app.post('/api/posts',
  validateBody(postSchema),
  async (c) => {
    try {
      const userId = c.get('userId');
      const { content, platforms, media_urls, scheduled_at } = c.get('validatedBody');
      
      const status = scheduled_at ? 'scheduled' : 'draft';
      
      const result = await c.env.DB.prepare(
        `INSERT INTO posts (user_id, content, platforms, media_urls, status, scheduled_at) 
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(
        userId,
        content,
        JSON.stringify(platforms),
        media_urls ? JSON.stringify(media_urls) : null,
        status,
        scheduled_at || null
      ).run();
      
      if (!result.success) {
        throw new Error('Failed to create post');
      }
      
      const post = await c.env.DB.prepare(
        'SELECT * FROM posts WHERE id = ?'
      ).bind(result.meta.last_row_id).first();
      
      return c.json({
        message: 'Post created successfully',
        post: {
          ...post,
          platforms: JSON.parse(post.platforms),
          media_urls: post.media_urls ? JSON.parse(post.media_urls) : null
        }
      }, 201);
      
    } catch (error) {
      console.error('Create post error:', error);
      return c.json({ error: 'Failed to create post' }, 500);
    }
  }
);

// Get Posts
app.get('/api/posts', async (c) => {
  try {
    const userId = c.get('userId');
    const status = c.req.query('status');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');
    
    let query = 'SELECT * FROM posts WHERE user_id = ?';
    const params = [userId];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    
    const posts = results.map(post => ({
      ...post,
      platforms: JSON.parse(post.platforms),
      media_urls: post.media_urls ? JSON.parse(post.media_urls) : null,
      metrics: post.metrics ? JSON.parse(post.metrics) : null
    }));
    
    return c.json({ posts });
    
  } catch (error) {
    console.error('Get posts error:', error);
    return c.json({ error: 'Failed to get posts' }, 500);
  }
});

// Get Single Post
app.get('/api/posts/:id', async (c) => {
  try {
    const userId = c.get('userId');
    const postId = c.req.param('id');
    
    const post = await c.env.DB.prepare(
      'SELECT * FROM posts WHERE id = ? AND user_id = ?'
    ).bind(postId, userId).first();
    
    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }
    
    return c.json({
      post: {
        ...post,
        platforms: JSON.parse(post.platforms),
        media_urls: post.media_urls ? JSON.parse(post.media_urls) : null,
        metrics: post.metrics ? JSON.parse(post.metrics) : null
      }
    });
    
  } catch (error) {
    console.error('Get post error:', error);
    return c.json({ error: 'Failed to get post' }, 500);
  }
});

// Update Post
app.put('/api/posts/:id',
  validateBody(postSchema.partial()),
  async (c) => {
    try {
      const userId = c.get('userId');
      const postId = c.req.param('id');
      const updates = c.get('validatedBody');
      
      // Check if post exists and belongs to user
      const existing = await c.env.DB.prepare(
        'SELECT id FROM posts WHERE id = ? AND user_id = ?'
      ).bind(postId, userId).first();
      
      if (!existing) {
        return c.json({ error: 'Post not found' }, 404);
      }
      
      const fields = [];
      const values = [];
      
      if (updates.content) {
        fields.push('content = ?');
        values.push(updates.content);
      }
      if (updates.platforms) {
        fields.push('platforms = ?');
        values.push(JSON.stringify(updates.platforms));
      }
      if (updates.media_urls) {
        fields.push('media_urls = ?');
        values.push(JSON.stringify(updates.media_urls));
      }
      if (updates.scheduled_at) {
        fields.push('scheduled_at = ?');
        values.push(updates.scheduled_at);
      }
      
      if (fields.length === 0) {
        return c.json({ error: 'No fields to update' }, 400);
      }
      
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(postId, userId);
      
      await c.env.DB.prepare(
        `UPDATE posts SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`
      ).bind(...values).run();
      
      // Get updated post
      const post = await c.env.DB.prepare(
        'SELECT * FROM posts WHERE id = ?'
      ).bind(postId).first();
      
      return c.json({
        message: 'Post updated successfully',
        post: {
          ...post,
          platforms: JSON.parse(post.platforms),
          media_urls: post.media_urls ? JSON.parse(post.media_urls) : null
        }
      });
      
    } catch (error) {
      console.error('Update post error:', error);
      return c.json({ error: 'Failed to update post' }, 500);
    }
  }
);

// Delete Post
app.delete('/api/posts/:id', async (c) => {
  try {
    const userId = c.get('userId');
    const postId = c.req.param('id');
    
    const result = await c.env.DB.prepare(
      'DELETE FROM posts WHERE id = ? AND user_id = ?'
    ).bind(postId, userId).run();
    
    if (result.meta.changes === 0) {
      return c.json({ error: 'Post not found' }, 404);
    }
    
    return c.json({ message: 'Post deleted successfully' });
    
  } catch (error) {
    console.error('Delete post error:', error);
    return c.json({ error: 'Failed to delete post' }, 500);
  }
});

// Publish Post
app.post('/api/posts/:id/publish', async (c) => {
  try {
    const userId = c.get('userId');
    const postId = c.req.param('id');
    
    await c.env.DB.prepare(
      `UPDATE posts 
       SET status = 'published', 
           published_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`
    ).bind(postId, userId).run();
    
    return c.json({ message: 'Post published successfully' });
    
  } catch (error) {
    console.error('Publish post error:', error);
    return c.json({ error: 'Failed to publish post' }, 500);
  }
});

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

// Get Analytics Overview
app.get('/api/analytics', async (c) => {
  try {
    const userId = c.get('userId');
    
    // Get total posts
    const totalPosts = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM posts WHERE user_id = ?'
    ).bind(userId).first();
    
    // Get posts by status
    const { results: statusCounts } = await c.env.DB.prepare(
      'SELECT status, COUNT(*) as count FROM posts WHERE user_id = ? GROUP BY status'
    ).bind(userId).all();
    
    // Get posts by platform
    const { results: posts } = await c.env.DB.prepare(
      'SELECT platforms FROM posts WHERE user_id = ?'
    ).bind(userId).all();
    
    const platformCounts = {};
    posts.forEach(post => {
      const platforms = JSON.parse(post.platforms);
      platforms.forEach(platform => {
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
      });
    });
    
    // Get recent posts
    const { results: recentPosts } = await c.env.DB.prepare(
      'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 10'
    ).bind(userId).all();
    
    return c.json({
      overview: {
        total_posts: totalPosts.count,
        by_status: statusCounts.reduce((acc, item) => {
          acc[item.status] = item.count;
          return acc;
        }, {}),
        by_platform: platformCounts
      },
      recent_posts: recentPosts.map(post => ({
        ...post,
        platforms: JSON.parse(post.platforms)
      }))
    });
    
  } catch (error) {
    console.error('Get analytics error:', error);
    return c.json({ error: 'Failed to get analytics' }, 500);
  }
});

// ============================================================================
// SOCIAL ACCOUNTS ENDPOINTS
// ============================================================================

// Get Social Accounts
app.get('/api/social-accounts', async (c) => {
  try {
    const userId = c.get('userId');
    
    const { results } = await c.env.DB.prepare(
      'SELECT id, platform, username, expires_at, created_at FROM social_accounts WHERE user_id = ?'
    ).bind(userId).all();
    
    return c.json({ accounts: results });
    
  } catch (error) {
    console.error('Get social accounts error:', error);
    return c.json({ error: 'Failed to get social accounts' }, 500);
  }
});

// Disconnect Social Account
app.delete('/api/social-accounts/:id', async (c) => {
  try {
    const userId = c.get('userId');
    const accountId = c.req.param('id');
    
    const result = await c.env.DB.prepare(
      'DELETE FROM social_accounts WHERE id = ? AND user_id = ?'
    ).bind(accountId, userId).run();
    
    if (result.meta.changes === 0) {
      return c.json({ error: 'Account not found' }, 404);
    }
    
    return c.json({ message: 'Account disconnected successfully' });
    
  } catch (error) {
    console.error('Disconnect account error:', error);
    return c.json({ error: 'Failed to disconnect account' }, 500);
  }
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ 
    error: 'Internal server error',
    message: err.message 
  }, 500);
});

// ============================================================================
// EXPORT
// ============================================================================

export default app;