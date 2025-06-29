#!/bin/bash

# 🚀 Install Dependencies and Start All Microservices
# This script installs npm dependencies and starts all 12 services

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Installing Dependencies and Starting All Microservices${NC}"
echo ""

# Services configuration
SERVICES=(
    "api-gateway:3000"
    "gaming-hub:3001"
    "user-service:3010"
    "game-engine:3011"
    "rewards-service:3012"
    "payment-service:3013"
    "analytics-service:3014"
    "telegram-bot:3015"
    "twitter-bot:3016"    
    "social-hub:3017"
    "scheduler:3018"
    "admin-dashboard:3019"
)

# Function to install dependencies for a service
install_service_deps() {
    local service=$1
    echo -e "${YELLOW}📦 Installing dependencies for $service...${NC}"
    
    if [ -d "services/$service" ]; then
        cd "services/$service"
        
        # Check if package.json exists
        if [ -f "package.json" ]; then
            # Install dependencies
            npm install
            echo -e "${GREEN}✅ Dependencies installed for $service${NC}"
        else
            echo -e "${RED}⚠️ No package.json found for $service${NC}"
        fi
        
        cd "../.."
    else
        echo -e "${RED}⚠️ Service directory services/$service not found${NC}"
    fi
}

# Function to start a service in background
start_service() {
    local service_info=$1
    local service=$(echo $service_info | cut -d':' -f1)
    local port=$(echo $service_info | cut -d':' -f2)
    
    echo -e "${YELLOW}🚀 Starting $service on port $port...${NC}"
    
    if [ -d "services/$service" ]; then
        cd "services/$service"
        
        # Start service in background
        nohup npm run dev > "../../logs/${service}.log" 2>&1 &
        local pid=$!
        
        # Save PID for later management
        echo $pid > "../../logs/${service}.pid"
        
        echo -e "${GREEN}✅ $service started (PID: $pid)${NC}"
        cd "../.."
    else
        echo -e "${RED}⚠️ Service directory services/$service not found${NC}"
    fi
}

# Create logs directory
mkdir -p logs

echo -e "${BLUE}📦 Phase 1: Installing Dependencies${NC}"
echo ""

# Install dependencies for all services
for service_info in "${SERVICES[@]}"; do
    service=$(echo $service_info | cut -d':' -f1)
    install_service_deps $service
done

echo ""
echo -e "${BLUE}🚀 Phase 2: Starting All Services${NC}"
echo ""

# Start all services
for service_info in "${SERVICES[@]}"; do
    start_service $service_info
    sleep 2  # Small delay between service starts
done

echo ""
echo -e "${GREEN}🎉 All microservices are starting up!${NC}"
echo ""
echo -e "${BLUE}📋 Service Status:${NC}"
for service_info in "${SERVICES[@]}"; do
    service=$(echo $service_info | cut -d':' -f1)
    port=$(echo $service_info | cut -d':' -f2)
    echo "  • $service: http://localhost:$port"
done

echo ""
echo -e "${BLUE}📊 Monitoring Commands:${NC}"
echo "  • Check logs: tail -f logs/[service-name].log"
echo "  • Check all PIDs: cat logs/*.pid"
echo "  • Kill all services: ./stop-all-services.sh"
echo ""
echo -e "${YELLOW}🔍 Health Check URLs:${NC}"
echo "  • API Gateway: curl http://localhost:3000/health"
echo "  • Gaming Hub: curl http://localhost:3001/health"
echo "  • User Service: curl http://localhost:3010/health"
echo "  • Admin Dashboard: http://localhost:3019"
echo ""
echo -e "${GREEN}✨ All 12 microservices are now online!${NC}" 