# Fix Database Schema Issue

## The Problem
The database has a column named `password` but the code expects `password_hash`. This is causing the "no such column: password_hash" error.

## Solution: Run Database Migration

You need to run a SQL migration to fix the database schema.

### Option 1: Using Wrangler (Recommended)

```bash
cd socialmediamanager/cloudflare
export CLOUDFLARE_API_TOKEN=your_token_here
npx wrangler d1 execute socialmediamanager-db --file=./fix-schema.sql --env production
```

### Option 2: Using Cloudflare Dashboard

1. Go to: https://dash.cloudflare.com/
2. Navigate to: **Workers & Pages** → **D1**
3. Click on: **socialmediamanager-db**
4. Click: **Console** tab
5. Copy and paste this SQL:

```sql
-- Create new table with correct schema
CREATE TABLE IF NOT EXISTS users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy existing data (if any)
INSERT INTO users_new (id, email, password_hash, name, avatar_url, created_at, updated_at)
SELECT id, email, password, name, avatar_url, created_at, updated_at
FROM users
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='users');

-- Drop old table
DROP TABLE IF EXISTS users;

-- Rename new table
ALTER TABLE users_new RENAME TO users;

-- Recreate index
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

6. Click: **Execute**

### Option 3: Fresh Start (If No Important Data)

If you don't have any important user data yet, you can just drop and recreate:

```sql
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

## After Running Migration

Test the login again:

```bash
curl -X POST https://socialmediamanager-api-production.hlpfl-co.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"test123456"}'
```

Expected response: JWT token and user data (not an error)

## Verify It Worked

Go to https://hlpfl.space and try:
1. Registering a new account
2. Logging in

Both should work without errors!