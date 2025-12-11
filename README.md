# Social Media Manager

A production-ready social media management platform deployed on Cloudflare Workers with D1 database.

## Live Demo

**Platform URL**: https://socialmediamanager-api-production.hlpfl-co.workers.dev/

## Features

- Multi-platform posting (Twitter, LinkedIn, Facebook, Instagram)
- User authentication with JWT
- Real-time dashboard
- Post scheduling
- Media management
- Analytics

## Tech Stack

- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1
- **Frontend**: Vanilla JavaScript with Tailwind CSS
- **API**: RESTful endpoints

## Deployment

The platform is automatically deployed via GitHub Actions when pushing to the main branch.

### Manual Deployment

```bash
cd cloudflare
wrangler deploy --env production
```

## Environment Variables

Production environment variables are configured in `cloudflare/wrangler.toml`.

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/dashboard/stats` - Dashboard statistics
- `POST /api/posts` - Create post

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request