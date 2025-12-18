# 🔑 JWT Secret Setup Guide

## What is JWT Secret?

The JWT (JSON Web Token) secret is a cryptographic key used to sign and verify authentication tokens in your social media manager.

## 🔐 How to Create a Secure JWT Secret

### Good Examples:
```
hlpfl-social-media-secure-key-2025-december-authentication
my-super-secret-jwt-key-for-social-media-manager-make-this-very-long
secure-token-secret-for-hlpfl-platform-must-be-at-least-32-chars-long
```

### Bad Examples (DON'T USE):
```
secret
jwt-secret
123456
password
```

## 🚀 Setting JWT Secret During Deployment

### Method 1: Using Deploy Script
```bash
cd socialmediamanager
./deploy.sh
```
The script will prompt: `npx wrangler secret put JWT_SECRET --env production`

### Method 2: Manual Setup
```bash
cd cloudflare
npx wrangler secret put JWT_SECRET --env production
```

## 📋 Step-by-Step

1. Run deployment command
2. When prompted for JWT_SECRET, enter your secure key
3. Wait for confirmation
4. Test authentication

## ✅ Requirements for Good JWT Secret

- At least 32 characters
- Mix of letters, numbers, hyphens
- Project-specific
- Not commonly used
- Easy for you to remember but hard to guess

## 🎯 Example Session

```bash
$ npx wrangler secret put JWT_SECRET --env production
? Enter a secret value: [hidden]
> hlpfl-social-media-secure-key-2025-december-authentication

✅ Success! Set JWT_SECRET secret for production environment
```

## 🛠️ What It's Used For

- Signing user authentication tokens
- Verifying session validity
- Securing API endpoints
- Preventing unauthorized access

The JWT secret is stored securely in Cloudflare Workers and is never exposed in your code or frontend.