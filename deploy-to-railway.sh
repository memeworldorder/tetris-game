#!/bin/bash

# 🚂 Deploy All Microservices to Railway
# This script deploys all 12 services to Railway cloud platform

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚂 Deploying All Microservices to Railway${NC}"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found!${NC}"
    echo "Install it with: npm install -g @railway/cli"
    exit 1
fi

# Check if user is logged in
if ! railway status &> /dev/null; then
    echo -e "${RED}❌ Not logged into Railway!${NC}"
    echo "Login with: railway login"
    exit 1
fi

# Services to deploy
SERVICES=(
    "api-gateway"
    "gaming-hub"
    "user-service"
    "game-engine"
    "rewards-service"
    "payment-service"
    "analytics-service"
    "telegram-bot"
    "twitter-bot"
    "social-hub"
    "scheduler"
    "admin-dashboard"
)

# Apply Railway environment configuration first
echo -e "${YELLOW}🔧 Applying Railway environment configuration...${NC}"
chmod +x apply-env-railway.sh
./apply-env-railway.sh

echo ""
echo -e "${BLUE}🚀 Starting Railway Deployment${NC}"
echo ""

# Deploy each service
for service in "${SERVICES[@]}"; do
    if [ -d "services/$service" ]; then
        echo -e "${YELLOW}🚀 Deploying $service to Railway...${NC}"
        
        cd "services/$service"
        
        # Initialize Railway project for this service if not exists
        if [ ! -f "railway.json" ]; then
            echo -e "${BLUE}📋 Initializing Railway project for $service...${NC}"
            railway init --name "$service"
        fi
        
        # Deploy to Railway
        echo -e "${BLUE}☁️ Deploying $service...${NC}"
        railway up --detach
        
        # Get deployment URL
        echo -e "${GREEN}✅ $service deployed successfully!${NC}"
        railway status
        
        cd "../.."
        sleep 3  # Small delay between deployments
        
    else
        echo -e "${RED}⚠️ Service directory services/$service not found${NC}"
    fi
done

echo ""
echo -e "${GREEN}🎉 All microservices deployed to Railway!${NC}"
echo ""
echo -e "${BLUE}📋 Post-Deployment Steps:${NC}"
echo "1. Check Railway dashboard for service URLs"
echo "2. Update frontend with production API URLs"
echo "3. Test inter-service communication"
echo "4. Configure custom domains if needed"
echo "5. Set up monitoring and alerts"
echo ""
echo -e "${YELLOW}🔗 Useful Railway Commands:${NC}"
echo "  • Check status: railway status"
echo "  • View logs: railway logs --service [service-name]"
echo "  • Open dashboard: railway open"
echo "  • Add environment variables: railway variables set [KEY]=[VALUE]"
echo ""
echo -e "${GREEN}🚂 Railway deployment complete!${NC}" 