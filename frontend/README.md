# HLPFL Social Media Manager - Frontend

This is the frontend application for the HLPFL Social Media Manager.

## Files

- `index.html` - Main HTML file with authentication modal and dashboard
- `styles.css` - Complete styling for the application
- `app.js` - JavaScript application logic and API integration

## API Configuration

The frontend connects to the API at:
```
https://socialmediamanager-api-production.hlpfl-co.workers.dev/api
```

## Features

- User authentication (login/register)
- Dashboard with statistics
- Post creation for multiple platforms
- Social account management
- Analytics (coming soon)
- Content scheduler (coming soon)
- Media library (coming soon)

## Deployment

This frontend is designed to be deployed to Cloudflare Pages and will be accessible at https://hlpfl.space

### Deploy to Cloudflare Pages

1. Push this frontend directory to your repository
2. Connect your repository to Cloudflare Pages
3. Set the build directory to `frontend`
4. Deploy!

## Local Development

Simply open `index.html` in a web browser or use a local server:

```bash
python -m http.server 8000
```

Then visit http://localhost:8000