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