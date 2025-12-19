# COMPLETE MANUAL FIX - Step by Step

## The Problem
The Cloudflare Worker is using a **cached database connection** that still sees the old schema (with `password` column instead of `password_hash`).

## The Solution (10 minutes)

### Part 1: Verify Database Schema is Correct

1. Go to: https://dash.cloudflare.com/
2. Navigate to: **Workers & Pages** → **D1**
3. Click on: **socialmediamanager-db**
4. Click: **Console** tab
5. Run this query:
   ```sql
   SELECT sql FROM sqlite_master WHERE type='table' AND name='users';
   ```
6. **Verify** you see `password_hash` in the output (not `password`)

### Part 2: Force Worker to Use Fresh Database Connection

**Option A: Remove and Re-add Database Binding (Recommended)**

1. Go to: **Workers & Pages** → **Workers** → `socialmediamanager-api-production`
2. Click: **Settings** tab
3. Scroll down to: **Bindings** section
4. Find: **D1 Databases** binding (should show `DB` → `socialmediamanager-db`)
5. Click: **Edit** (or the three dots → Edit)
6. Click: **Remove** or **Delete**
7. Click: **Add binding** (or **Add variable**)
8. Select: **D1 database**
9. Variable name: `DB`
10. D1 database: Select `socialmediamanager-db` from dropdown
11. Click: **Save** or **Deploy**

**Option B: Create New Worker Version**

1. Go to: **Workers & Pages** → **Workers** → `socialmediamanager-api-production`
2. Click: **Edit code**
3. Make a small change (add a comment like `// v2` at the top)
4. Click: **Save and deploy**

**Option C: Use Cloudflare API (Advanced)**

If you have curl access:
```bash
# Get worker script
curl -X GET "https://api.cloudflare.com/client/v4/accounts/8c74a072236761cf6126371f0b20c5a9/workers/scripts/socialmediamanager-api-production" \
  -H "Authorization: Bearer keSWmWxxFZVoPa2oFIB4aiHM6vMJ5SkyLTUJhVYo"

# Redeploy (this forces new bindings)
# (Complex - use Option A instead)
```

### Part 3: Test the Fix

After completing Part 2, test registration:

```bash
curl -X POST https://socialmediamanager-api-production.hlpfl-co.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"test123456"}'
```

**Expected Response:**
```json
{
  "message": "User created successfully",
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "test@test.com",
    "name": "Test User"
  }
}
```

**NOT:**
```json
{
  "error": "Internal server error",
  "details": "D1_ERROR: table users has no column named password_hash"
}
```

### Part 4: Test Login on Website

1. Go to: https://hlpfl.space
2. Try registering a new account
3. Try logging in

Both should work without errors!

## If It Still Doesn't Work

### Check for Multiple Databases

1. Go to: **Workers & Pages** → **D1**
2. Look for any databases with similar names
3. Check which database ID is in your worker binding
4. Make sure it matches the database where you ran the schema fix

### Nuclear Option: Create Fresh Database

If nothing else works:

1. **Create new database:**
   - Workers & Pages → D1 → Create database
   - Name: `socialmediamanager-db-v2`

2. **Run schema on new database:**
   - Click on new database → Console
   - Run the complete schema from `schema.sql`

3. **Update worker binding:**
   - Go to worker → Settings → Bindings
   - Change DB binding to point to new database

4. **Test again**

## Why This Happens

Cloudflare Workers cache database connections for performance. The cache includes:
- Database schema
- Connection pool
- Query plans

Even after updating the schema, the worker continues using the cached connection. The only way to force a refresh is to:
1. Remove and re-add the binding (forces new connection)
2. Redeploy the worker (may or may not clear cache)
3. Wait for cache to expire (can take hours)

Option 1 (remove/re-add binding) is the most reliable.