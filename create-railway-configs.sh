#!/bin/bash

# 🚂 Create Railway Configuration Files for All Microservices
# This script generates railway.json files for all services

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚂 Creating Railway Configuration Files${NC}"
echo ""

# Services that need Railway configuration
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

# Function to create railway.json for a service
create_railway_config() {
    local service=$1
    local config_file="services/$service/railway.json"
    
    echo -e "${YELLOW}📝 Creating Railway config for $service...${NC}"
    
    # Create railway.json
    cat > "$config_file" << 'EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "sleepApplication": false,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
EOF
    
    echo -e "${GREEN}✅ Railway config created for $service${NC}"
}

# Function to create/update package.json build script if missing
fix_package_json() {
    local service=$1
    local package_file="services/$service/package.json"
    
    if [ -f "$package_file" ]; then
        # Check if build script exists
        if ! grep -q '"build"' "$package_file"; then
            echo -e "${YELLOW}⚠️ Adding build script to $service package.json${NC}"
            
            # Add build script using sed
            sed -i '/"scripts": {/a\    "build": "tsc",' "$package_file"
        fi
        
        # Ensure start script uses dist/server.js
        if grep -q '"start".*src/' "$package_file"; then
            echo -e "${YELLOW}⚠️ Fixing start script for $service${NC}"
            sed -i 's/"start": ".*"/"start": "node dist\/server.js"/' "$package_file"
        fi
    fi
}

# Create railway.json for each service
for service in "${SERVICES[@]}"; do
    if [ -d "services/$service" ]; then
        create_railway_config "$service"
        fix_package_json "$service"
    else
        echo -e "${YELLOW}⚠️ Service directory services/$service not found${NC}"
    fi
done

echo ""
echo -e "${GREEN}🎉 Railway configuration files created for all services!${NC}"
echo ""
echo -e "${BLUE}📋 What was created:${NC}"
echo "  • railway.json files for all 12 services"
echo "  • Fixed package.json build/start scripts where needed"
echo "  • Configured health checks and restart policies"
echo ""
echo -e "${YELLOW}🔧 Next Steps:${NC}"
echo "1. Run: chmod +x deploy-to-railway.sh"
echo "2. Run: ./deploy-to-railway.sh"
echo "3. Monitor deployments in Railway dashboard"
echo ""
echo -e "${GREEN}✨ Ready for Railway deployment!${NC}" 