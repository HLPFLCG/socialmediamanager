import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';

// Import your API routes
import authRoutes from '../routes/auth.js';
import postRoutes from '../routes/posts.js';
import socialRoutes from '../routes/social.js';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());
app.use('*', secureHeaders());

// Health check
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'development'
  });
});

// API Routes
app.route('/api/auth', authRoutes);
app.route('/api/posts', postRoutes);
app.route('/api/social', socialRoutes);

// Static assets handled by Cloudflare Pages
app.get('*', (c) => {
  return c.text('Social Media Manager API', 200);
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