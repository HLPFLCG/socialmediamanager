#!/bin/bash

# Social Media Manager - Complete Deployment Script
# This script automates the deployment of both backend and frontend

set -e  # Exit on error

echo "🚀 Social Media Manager - Fresh Deployment"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "cloudflare/wrangler.toml" ]; then
    print_error "Please run this script from the repository root directory"
    exit 1
fi

print_info "Step 1: Installing dependencies..."
cd cloudflare
npm install
print_success "Dependencies installed"

echo ""
print_info "Step 2: Checking Wrangler authentication..."
if ! npx wrangler whoami &> /dev/null; then
    print_error "Not logged in to Cloudflare"
    echo "Please run: npx wrangler login"
    exit 1
fi
print_success "Wrangler authenticated"

echo ""
print_info "Step 3: Creating D1 Database..."
echo "Creating database 'socialmediamanager-db'..."
DB_OUTPUT=$(npx wrangler d1 create socialmediamanager-db 2>&1 || true)

if echo "$DB_OUTPUT" | grep -q "database_id"; then
    DATABASE_ID=$(echo "$DB_OUTPUT" | grep "database_id" | cut -d'"' -f2)
    print_success "Database created with ID: $DATABASE_ID"
    
    print_info "Please update wrangler.toml with this database_id:"
    echo "database_id = &quot;$DATABASE_ID&quot;"
    echo ""
    read -p "Press Enter after updating wrangler.toml..."
elif echo "$DB_OUTPUT" | grep -q "already exists"; then
    print_info "Database already exists, continuing..."
else
    print_error "Failed to create database"
    echo "$DB_OUTPUT"
    exit 1
fi

echo ""
print_info "Step 4: Initializing database schema..."
npx wrangler d1 execute socialmediamanager-db --file=schema.sql --env production
print_success "Database schema initialized"

echo ""
print_info "Step 5: Setting up secrets..."
echo "You'll need to set the following secrets:"
echo "1. JWT_SECRET"
echo "2. OAuth credentials for each platform you want to support"
echo ""

read -p "Set JWT_SECRET now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx wrangler secret put JWT_SECRET --env production
    print_success "JWT_SECRET set"
fi

echo ""
print_info "Step 6: Deploying backend..."
npx wrangler deploy --env production
print_success "Backend deployed!"

echo ""
echo "=========================================="
print_success "Backend Deployment Complete!"
echo "=========================================="
echo ""
echo "Your backend is now live. Next steps:"
echo ""
echo "1. Note your Worker URL (shown above)"
echo "2. Set up OAuth credentials for social platforms"
echo "3. Deploy frontend via Cloudflare Pages dashboard"
echo ""
echo "For detailed OAuth setup instructions, see:"
echo "  - FRESH_START_DEPLOYMENT.md"
echo ""
echo "To set OAuth secrets, run:"
echo "  npx wrangler secret put TWITTER_API_KEY --env production"
echo "  npx wrangler secret put LINKEDIN_CLIENT_ID --env production"
echo "  (and so on for each platform)"
echo ""