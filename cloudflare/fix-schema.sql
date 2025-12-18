-- Fix the users table to use password_hash instead of password
-- This migration updates the existing database

-- Step 1: Create new table with correct schema
CREATE TABLE IF NOT EXISTS users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Copy data from old table to new table (if exists)
INSERT INTO users_new (id, email, password_hash, name, avatar_url, created_at, updated_at)
SELECT id, email, password, name, avatar_url, created_at, updated_at
FROM users
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='users');

-- Step 3: Drop old table
DROP TABLE IF EXISTS users;

-- Step 4: Rename new table to users
ALTER TABLE users_new RENAME TO users;

-- Step 5: Recreate index
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);