#!/bin/bash

# 🚂 Deploy Priority Services to Railway (Free Plan Compatible)
# Deploy only the 5 most critical services within free plan limits

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚂 Deploying Priority Services to Railway (Free Plan)${NC}"
echo -e "${YELLOW}⚠️ Free plan limit: 5 services maximum${NC}"
echo ""

# Priority services (most critical first)
PRIORITY_SERVICES=(
    "api-gateway:3000"      # 1. Central routing - CRITICAL
    "user-service:3010"     # 2. Authentication - CRITICAL  
    "game-engine:3011"      # 3. Game logic - CRITICAL
    "payment-service:3013"  # 4. Revenue - HIGH PRIORITY
    "gaming-hub:3001"       # 5. Frontend - HIGH PRIORITY
)

echo -e "${BLUE}🎯 Priority Services Selected:${NC}"
for service_info in "${PRIORITY_SERVICES[@]}"; do
    service=$(echo $service_info | cut -d':' -f1)
    echo "  • $service"
done
echo ""

# Function to deploy a service
deploy_service() {
    local service_info=$1
    local service=$(echo $service_info | cut -d':' -f1)
    local port=$(echo $service_info | cut -d':' -f2)
    
    echo -e "${YELLOW}🚀 Deploying $service to Railway...${NC}"
    
    if [ -d "services/$service" ]; then
        cd "services/$service"
        
        # Check if railway.json exists
        if [ ! -f "railway.json" ]; then
            echo -e "${RED}❌ railway.json missing for $service${NC}"
            echo "Run: ./create-railway-configs.sh first"
            cd "../.."
            return 1
        fi
        
        # Initialize Railway project if needed
        if [ ! -f "railway.toml" ] && [ ! -f ".railway" ]; then
            echo -e "${BLUE}📋 Initializing Railway project for $service...${NC}"
            railway init --name "$service" || {
                echo -e "${RED}❌ Failed to initialize $service${NC}"
                cd "../.."
                return 1
            }
        fi
        
        # Deploy to Railway
        echo -e "${BLUE}☁️ Deploying $service...${NC}"
        railway up --detach || {
            echo -e "${RED}❌ Deployment failed for $service${NC}"
            cd "../.."
            return 1
        }
        
        # Wait for deployment to complete
        echo -e "${YELLOW}⏳ Waiting for $service deployment...${NC}"
        sleep 10
        
        # Check deployment status
        echo -e "${BLUE}📊 Checking $service status...${NC}"
        railway status
        
        echo -e "${GREEN}✅ $service deployed successfully!${NC}"
        echo ""
        
        cd "../.."
        sleep 5  # Delay between deployments
        
    else
        echo -e "${RED}⚠️ Service directory services/$service not found${NC}"
        return 1
    fi
}

# Apply Railway environment configuration first
echo -e "${YELLOW}🔧 Applying Railway environment configuration...${NC}"
cd ..
chmod +x apply-env-railway.sh
./apply-env-railway.sh
cd tetris-game

echo ""
echo -e "${BLUE}🚀 Starting Priority Service Deployment${NC}"
echo ""

# Deploy each priority service
for service_info in "${PRIORITY_SERVICES[@]}"; do
    service=$(echo $service_info | cut -d':' -f1)
    
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}🚀 DEPLOYING: $service${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    
    if deploy_service "$service_info"; then
        echo -e "${GREEN}✅ $service deployment completed${NC}"
    else
        echo -e "${RED}❌ $service deployment failed${NC}"
        echo -e "${YELLOW}⚠️ Continuing with next service...${NC}"
    fi
    
    echo ""
done

echo ""
echo -e "${GREEN}🎉 Priority Services Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}📋 Deployed Services:${NC}"
for service_info in "${PRIORITY_SERVICES[@]}"; do
    service=$(echo $service_info | cut -d':' -f1)
    echo "  ✅ $service"
done

echo ""
echo -e "${YELLOW}📊 To deploy remaining services:${NC}"
echo "  • Upgrade to Railway Pro Plan for unlimited services"
echo "  • Or use other deployment platforms for additional services"
echo ""
echo -e "${BLUE}🔗 Next Steps:${NC}"
echo "1. Check Railway dashboard for service URLs"
echo "2. Update environment variables with actual URLs"
echo "3. Test service communication"
echo "4. Monitor service health"
echo ""
echo -e "${GREEN}🚂 Priority services are now live on Railway!${NC}" 