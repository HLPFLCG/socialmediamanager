# Social Media Manager

A comprehensive social media management platform that allows you to post to multiple platforms simultaneously, schedule posts, and analyze performance across Twitter, LinkedIn, Facebook, and Instagram.

## Features

- **Multi-Platform Posting**: Post to Twitter, LinkedIn, Facebook, and Instagram simultaneously
- **Smart Scheduling**: Schedule posts for optimal times with timezone support
- **Media Management**: Upload and manage images and videos for your posts
- **Analytics Dashboard**: Track engagement and performance across all platforms
- **Account Management**: Connect and manage multiple social media accounts
- **Content Templates**: Save and reuse post templates
- **Real-time Character Count**: Platform-specific character limits and warnings
- **Bulk Operations**: Schedule multiple posts at once
- **Recurring Posts**: Set up automated recurring content

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Cache/Queue**: Redis for scheduling and caching
- **Authentication**: JWT tokens
- **File Upload**: Multer for media handling
- **Frontend**: Vanilla JavaScript with Tailwind CSS
- **APIs**: Twitter API v2, LinkedIn API, Facebook Graph API

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/HLPFLCG/socialmediamanager.git
   cd socialmediamanager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your API credentials:
   - MongoDB connection string
   - JWT secret
   - Twitter API keys
   - LinkedIn API credentials
   - Facebook App credentials

4. **Start the services**
   ```bash
   # Start MongoDB (if not running)
   mongod

   # Start Redis (if not running)
   redis-server

   # Start the application
   npm start
   ```

5. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## Environment Variables

Create a `.env` file with the following variables:

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/socialmediamanager
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Twitter API v2
TWITTER_API_KEY=your-twitter-api-key
TWITTER_API_SECRET=your-twitter-api-secret
TWITTER_ACCESS_TOKEN=your-twitter-access-token
TWITTER_ACCESS_TOKEN_SECRET=your-twitter-access-token-secret
TWITTER_BEARER_TOKEN=your-twitter-bearer-token

# LinkedIn API
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/linkedin/callback

# Facebook API
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_REDIRECT_URI=http://localhost:3000/auth/facebook/callback
```

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info
- `PUT /api/auth/profile` - Update user profile

### Posts
- `POST /api/posts` - Create new post
- `GET /api/posts` - Get user posts
- `GET /api/posts/:id` - Get specific post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/publish` - Publish post immediately
- `POST /api/posts/:id/schedule` - Schedule post

### Social Accounts
- `GET /api/social/accounts` - Get connected accounts
- `POST /api/social/connect` - Connect social account
- `DELETE /api/social/disconnect/:id` - Disconnect account
- `GET /api/social/auth-url/:platform` - Get auth URL for platform

### Analytics
- `GET /api/analytics/overview` - Get analytics overview
- `GET /api/analytics/posts` - Get post analytics
- `GET /api/analytics/platforms` - Get platform performance
- `GET /api/analytics/export` - Export analytics data

### Media
- `POST /api/media/upload` - Upload media files
- `GET /api/media` - Get uploaded media
- `DELETE /api/media/:filename` - Delete media file

## Platform Setup

### Twitter API
1. Apply for a Twitter Developer account at [developer.twitter.com](https://developer.twitter.com)
2. Create a new app and generate API keys and tokens
3. Enable OAuth 2.0 with PKCE
4. Set callback URL: `http://localhost:3000/auth/twitter/callback`

### LinkedIn API
1. Create app at [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Configure OAuth 2.0 settings
3. Add required permissions:
   - `r_liteprofile`
   - `r_emailaddress`
   - `w_member_social`
   - `w_organization_social`
4. Set redirect URI: `http://localhost:3000/auth/linkedin/callback`

### Facebook API
1. Create app at [Facebook Developers](https://developers.facebook.com)
2. Add Facebook Login product
3. Configure OAuth redirect URI: `http://localhost:3000/auth/facebook/callback`
4. Request permissions:
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `pages_manage_metadata`

## Deployment

### Docker Deployment
```bash
docker build -t socialmediamanager .
docker run -p 3000:3000 --env-file .env socialmediamanager
```

### Production Considerations
- Use HTTPS in production
- Set up proper CORS origins
- Configure rate limiting
- Set up monitoring and logging
- Use environment-specific configurations
- Implement proper backup strategies

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the API endpoints

## Roadmap

- [ ] Add TikTok integration
- [ ] Implement AI-powered content suggestions
- [ ] Add team collaboration features
- [ ] Mobile app development
- [ ] Advanced analytics with ML insights
- [ ] Content calendar view
- [ ] A/B testing for posts
- [ ] Social listening features