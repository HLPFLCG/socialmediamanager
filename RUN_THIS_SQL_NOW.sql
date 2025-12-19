-- Step 1: Drop the old table completely
DROP TABLE users;

-- Step 2: Create new table with correct schema
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Create index
CREATE INDEX idx_users_email ON users(email);

-- Step 4: Verify the fix
SELECT sql FROM sqlite_master WHERE type='table' AND name='users';