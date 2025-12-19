// Updated Cloudflare Worker with database debug info
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://hlpfl.space',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    };

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check
      if (path === '/api/health' && method === 'GET') {
        return new Response(JSON.stringify({ 
          status: 'ok', 
          timestamp: new Date().toISOString() 
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Debug endpoint to check table schema
      if (path === '/api/debug/schema' && method === 'GET') {
        try {
          const result = await env.DB.prepare(
            'SELECT sql FROM sqlite_master WHERE type="table" AND name="users"'
          ).first();
          return new Response(JSON.stringify({ 
            schema: result,
            database_id: '8860d9ea-f18a-422d-b409-f641edd83fd0'
          }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      }

      // Register endpoint - NO AUTH REQUIRED
      if (path === '/api/auth/register' && method === 'POST') {
        try {
          const { email, password, name } = await request.json();
          
          if (!email || !password || !name) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          // Check if user exists
          const existingUser = await env.DB.prepare(
            'SELECT id FROM users WHERE email = ?'
          ).bind(email).first();

          if (existingUser) {
            return new Response(JSON.stringify({ error: 'User already exists' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          // Create user
          const hashedPassword = await hashPassword(password);
          
          const result = await env.DB.prepare(
            'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
          ).bind(email, hashedPassword, name).run();

          if (result.success) {
            const token = await createToken({ userId: result.meta.last_row_id }, env.JWT_SECRET);
            return new Response(JSON.stringify({ 
              message: 'User created successfully',
              token,
              user: { id: result.meta.last_row_id, email, name }
            }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          } else {
            return new Response(JSON.stringify({ error: 'Failed to create user' }), {
              status: 500,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }
        } catch (dbError) {
          return new Response(JSON.stringify({ 
            error: 'Database error', 
            details: dbError.message,
            query: 'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      }

      // Login endpoint - NO AUTH REQUIRED
      if (path === '/api/auth/login' && method === 'POST') {
        const { email, password } = await request.json();
        
        if (!email || !password) {
          return new Response(JSON.stringify({ error: 'Missing email or password' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        // Find user
        const user = await env.DB.prepare(
          'SELECT id, email, name, password_hash FROM users WHERE email = ?'
        ).bind(email).first();

        if (!user) {
          return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        // Verify password
        const isValid = await verifyPassword(password, user.password_hash);
        if (!isValid) {
          return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        // Create token
        const token = await createToken({ userId: user.id }, env.JWT_SECRET);

        return new Response(JSON.stringify({
          message: 'Login successful',
          token,
          user: { id: user.id, email: user.email, name: user.name }
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // User profile endpoint - AUTH REQUIRED
      if (path === '/api/user/profile' && method === 'GET') {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
          return new Response(JSON.stringify({ error: 'No authorization header' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        try {
          const token = authHeader.replace('Bearer ', '');
          const payload = await verifyJWT(token, env.JWT_SECRET);
          
          const user = await env.DB.prepare(
            'SELECT id, email, name FROM users WHERE id = ?'
          ).bind(payload.userId).first();

          if (!user) {
            return new Response(JSON.stringify({ error: 'User not found' }), {
              status: 404,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          return new Response(JSON.stringify({ user }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: 'Invalid token' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};

// Helper functions
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password, hash) {
  const hashedPassword = await hashPassword(password);
  return hashedPassword === hash;
}

async function createToken(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = { ...payload, iat: now, exp: now + 24 * 60 * 60 };

  const headerEncoded = btoa(JSON.stringify(header));
  const payloadEncoded = btoa(JSON.stringify(tokenPayload));

  const signature = await createSignature(headerEncoded + '.' + payloadEncoded, secret);

  return headerEncoded + '.' + payloadEncoded + '.' + signature;
}

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

async function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');

  const header = JSON.parse(atob(parts[0]));
  const payload = JSON.parse(atob(parts[1]));

  if (payload.exp && payload.exp < Date.now() / 1000) {
    throw new Error('Token expired');
  }

  return payload;
}