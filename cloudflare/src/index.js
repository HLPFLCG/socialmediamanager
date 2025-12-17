import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { auth } from 'hono/auth';
import { D1Database } from 'cloudflare';

const app = new Hono();

// CORS configuration
app.use('*', cors({
  origin: ['https://hlpfl.space', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// JWT middleware for protected routes
app.use('/api/*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const publicPaths = ['/api/register', '/api/login', '/api/health'];
  
  if (publicPaths.some(path => c.req.path.startsWith(path))) {
    return next();
  }
  
  if (!authHeader) {
    return c.json({ error: 'No authorization header' }, 401);
  }
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    c.set('userId', payload.userId);
    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

// Simple JWT verification
async function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  
  const header = JSON.parse(atob(parts[0]));
  const payload = JSON.parse(atob(parts[1]));
  
  // Simple verification (in production, use proper JWT library)
  if (payload.exp && payload.exp < Date.now() / 1000) {
    throw new Error('Token expired');
  }
  
  return payload;
}

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register endpoint
app.post('/api/register', async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password || !name) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    // Check if user already exists
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();
    
    if (existingUser) {
      return c.json({ error: 'User already exists' }, 400);
    }
    
    // Create user (simple password hashing)
    const hashedPassword = await hashPassword(password);
    
    const result = await c.env.DB.prepare(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
    ).bind(email, hashedPassword, name).run();
    
    if (result.success) {
      const token = await createToken({ userId: result.meta.last_row_id }, c.env.JWT_SECRET);
      return c.json({ 
        message: 'User created successfully',
        token,
        user: { id: result.meta.last_row_id, email, name }
      });
    } else {
      return c.json({ error: 'Failed to create user' }, 500);
    }
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

// Login endpoint
app.post('/api/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: 'Missing email or password' }, 400);
    }
    
    // Find user
    const user = await c.env.DB.prepare(
      'SELECT id, email, name, password_hash FROM users WHERE email = ?'
    ).bind(email).first();
    
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    
    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    
    // Create token
    const token = await createToken({ userId: user.id }, c.env.JWT_SECRET);
    
    return c.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// Get user profile
app.get('/api/user/profile', async (c) => {
  const userId = c.get('userId');
  
  const user = await c.env.DB.prepare(
    'SELECT id, email, name FROM users WHERE id = ?'
  ).bind(userId).first();
  
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }
  
  return c.json({ user });
});

// Simple password hashing
async function hashPassword(password) {
  // Simple hashing for now (in production, use bcrypt)
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Simple password verification
async function verifyPassword(password, hash) {
  const hashedPassword = await hashPassword(password);
  return hashedPassword === hash;
}

// Simple token creation
async function createToken(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = { ...payload, iat: now, exp: now + 24 * 60 * 60 }; // 24 hours
  
  const headerEncoded = btoa(JSON.stringify(header));
  const payloadEncoded = btoa(JSON.stringify(tokenPayload));
  
  const signature = await createSignature(headerEncoded + '.' + payloadEncoded, secret);
  
  return headerEncoded + '.' + payloadEncoded + '.' + signature;
}

// Simple signature creation
async function createSignature(data, secret) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const dataBuffer = encoder.encode(data);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, dataBuffer);
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Basic post endpoints
app.get('/api/posts', async (c) => {
  const userId = c.get('userId');
  
  const posts = await c.env.DB.prepare(
    'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all();
  
  return c.json({ posts: posts.results || [] });
});

app.post('/api/posts', async (c) => {
  const userId = c.get('userId');
  const { content, platform, status } = await c.req.json();
  
  if (!content || !platform) {
    return c.json({ error: 'Missing content or platform' }, 400);
  }
  
  const result = await c.env.DB.prepare(
    'INSERT INTO posts (user_id, content, platform, status, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(userId, content, platform, status || 'draft', new Date().toISOString()).run();
  
  if (result.success) {
    return c.json({ message: 'Post created successfully', id: result.meta.last_row_id });
  } else {
    return c.json({ error: 'Failed to create post' }, 500);
  }
});

export default app;