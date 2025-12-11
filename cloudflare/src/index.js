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

// Basic API routes
app.get('/api/test', (c) => {
  return c.json({ message: 'API is working!' });
});

// Welcome route
app.get('/', (c) => {
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