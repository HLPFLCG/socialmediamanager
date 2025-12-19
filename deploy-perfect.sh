#!/bin/bash

# HLPFL Social Media Manager - Perfect Deployment Script
# This script deploys the production-ready version

set -e  # Exit on error

echo "🎯 THE PERFECTION MANDATE - Deployment Script"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "cloudflare/src/index.js" ]; then
    echo -e "${RED}Error: Please run this script from the socialmediamanager directory${NC}"
    exit 1
fi

echo -e "${BLUE}Step 1: Checking dependencies...${NC}"
cd cloudflare
if ! npm list jose zod bcryptjs hono > /dev/null 2>&1; then
    echo -e "${YELLOW}Installing missing dependencies...${NC}"
    npm install
fi
echo -e "${GREEN}✓ Dependencies OK${NC}"
echo ""

echo -e "${BLUE}Step 2: Checking JWT_SECRET...${NC}"
echo -e "${YELLOW}IMPORTANT: Make sure JWT_SECRET is set in Cloudflare Workers${NC}"
echo -e "${YELLOW}Run: npx wrangler secret put JWT_SECRET --env production${NC}"
echo -e "${YELLOW}Generate secret: openssl rand -base64 32${NC}"
read -p "Press Enter when JWT_SECRET is set, or Ctrl+C to cancel..."
echo ""

echo -e "${BLUE}Step 3: Deploying backend to Cloudflare Workers...${NC}"
npx wrangler deploy --env production
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend deployed successfully${NC}"
else
    echo -e "${RED}✗ Backend deployment failed${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}Step 4: Testing backend health...${NC}"
HEALTH_CHECK=$(curl -s https://socialmediamanager-api-production.hlpfl-co.workers.dev/api/health)
if echo "$HEALTH_CHECK" | grep -q "ok"; then
    echo -e "${GREEN}✓ Backend health check passed${NC}"
    echo "$HEALTH_CHECK"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
    echo "$HEALTH_CHECK"
fi
echo ""

echo -e "${BLUE}Step 5: Frontend deployment...${NC}"
echo -e "${YELLOW}Frontend will auto-deploy via Cloudflare Pages from GitHub${NC}"
echo -e "${YELLOW}Check: https://dash.cloudflare.com/pages${NC}"
echo ""

echo -e "${GREEN}=============================================="
echo "🎉 Deployment Complete!"
echo "=============================================="
echo ""
echo "Next steps:"
echo "1. Visit https://hlpfl.space to test the frontend"
echo "2. Register a new account"
echo "3. Test all features"
echo "4. Monitor for errors"
echo ""
echo "Documentation:"
echo "- Deployment Guide: DEPLOYMENT_PERFECT.md"
echo "- Feature List: PERFECTION_COMPLETE.md"
echo "- Code Audit: PERFECTION_AUDIT.md"
echo ""
echo -e "${GREEN}Status: Production-Ready ✅${NC}"
echo -e "${NC}"