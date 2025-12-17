# Social Media Manager

A secure, production-ready social media management platform built on Cloudflare Workers with D1 database.

## 🌐 Live Demo

- **Production URL**: https://hlpfl.space
- **API URL**: https://socialmediamanager-api-production.hlpfl-co.workers.dev/

## ✨ Features

- 🔐 Secure user authentication with JWT and bcrypt password hashing
- 📝 Multi-platform post creation (Twitter, LinkedIn, Facebook, Instagram)
- 📊 Real-time dashboard with post statistics
- 📅 Post scheduling capabilities
- 📁 Media library management
- 📈 Analytics tracking
- 🎨 Modern, responsive UI

## 🛠 Tech Stack

- **Backend**: Cloudflare Workers (Serverless)
- **Framework**: Hono v4 (Modern web framework)
- **Database**: Cloudflare D1 (SQLite-based)
- **Authentication**: JWT with bcrypt password hashing
- **Frontend**: Vanilla JavaScript (No framework dependencies)
- **Styling**: Custom CSS with modern design
- **Icons**: Font Awesome 6.5.1

## 🚀 Quick Start

### Prerequisites

- Node.js 20 or higher
- Cloudflare account
- Wrangler CLI installed globally

### Installation

1. Clone the repository:
```bash
git clone https://github.com/HLPFLCG/socialmediamanager.git
cd socialmediamanager/cloudflare
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment secrets:
```bash
# Set JWT secret (required)
wrangler secret put JWT_SECRET --env production

# Optional: Set social media API credentials
wrangler secret put TWITTER_API_KEY --env production
wrangler secret put LINKEDIN_CLIENT_ID --env production
wrangler secret put FACEBOOK_APP_ID --env production
wrangler secret put INSTAGRAM_CLIENT_ID --env production
```

4. Initialize the database:
```bash
npm run db:migrate
```

5. Deploy to production:
```bash
npm run deploy:production
```

## 📦 Deployment

### Automatic Deployment

The platform automatically deploys via GitHub Actions when pushing to the `main` branch.

**Required GitHub Secrets:**
- `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token

### Manual Deployment

```bash
cd cloudflare

# Deploy to production
npm run deploy:production

# Deploy to staging
npm run deploy:staging

# Local development
npm run dev
```

## 🔒 Security Features

- ✅ Password hashing with bcrypt (10 salt rounds)
- ✅ JWT-based authentication with token expiration
- ✅ CORS protection with configurable allowed origins
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention with parameterized queries
- ✅ Secure environment variable management
- ✅ No hardcoded secrets in source code

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

### Post Management

#### Create Post
```http
POST /api/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Hello, world!",
  "platforms": ["twitter", "linkedin"],
  "media_urls": [],
  "scheduled_at": null
}
```

#### Get All Posts
```http
GET /api/posts
Authorization: Bearer <token>
```

#### Update Post
```http
PUT /api/posts/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Updated content",
  "status": "published"
}
```

#### Delete Post
```http
DELETE /api/posts/:id
Authorization: Bearer <token>
```

### Dashboard

#### Get Dashboard Stats
```http
GET /api/dashboard/stats
Authorization: Bearer <token>
```

### Social Accounts

#### Get Connected Accounts
```http
GET /api/social/accounts
Authorization: Bearer <token>
```

#### Add Social Account
```http
POST /api/social/accounts
Authorization: Bearer <token>
Content-Type: application/json

{
  "platform": "twitter",
  "account_id": "123456789",
  "username": "@johndoe",
  "access_token": "token",
  "refresh_token": "refresh"
}
```

### Health Check

```http
GET /api/health
```

## 🗄 Database Schema

The application uses Cloudflare D1 with the following tables:

- **users** - User accounts with hashed passwords
- **posts** - Social media posts with platform targeting
- **social_accounts** - Connected social media accounts
- **media_files** - Uploaded media assets
- **analytics** - Post performance metrics

See `cloudflare/schema.sql` for the complete schema.

## 🔧 Configuration

### Environment Variables

Configure in `cloudflare/wrangler.toml`:

- `NODE_ENV` - Environment (development/staging/production)
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)

### Secrets (via Wrangler CLI)

- `JWT_SECRET` - Secret key for JWT signing (required)
- `TWITTER_API_KEY` - Twitter API credentials (optional)
- `LINKEDIN_CLIENT_ID` - LinkedIn OAuth credentials (optional)
- `FACEBOOK_APP_ID` - Facebook API credentials (optional)
- `INSTAGRAM_CLIENT_ID` - Instagram API credentials (optional)

## 🧪 Development

### Local Development

```bash
cd cloudflare
npm run dev
```

Access the local development server at `http://localhost:8787`

### Database Migrations

```bash
# Apply schema to production database
npm run db:migrate
```

## 📝 Version History

### Version 2.0.0 (Current)
- ✅ Updated to Hono v4
- ✅ Implemented bcrypt password hashing
- ✅ Fixed security vulnerabilities
- ✅ Improved CORS configuration
- ✅ Enhanced error handling
- ✅ Removed hardcoded secrets
- ✅ Updated dependencies
- ✅ Cleaned up unused files
- ✅ Improved code organization

### Version 1.0.0
- Initial release with basic functionality

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 🆘 Support

For issues and questions, please open an issue on GitHub or contact the development team.

## 🎯 Roadmap

- [ ] Implement real OAuth flows for social platforms
- [ ] Add actual social media API integrations
- [ ] Implement media upload to R2
- [ ] Add comprehensive analytics
- [ ] Implement post scheduling with Durable Objects
- [ ] Add team collaboration features
- [ ] Implement rate limiting
- [ ] Add comprehensive testing suite