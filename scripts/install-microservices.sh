#!/bin/bash

echo "🚀 Installing dependencies for all microservices..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base directory
BASE_DIR="services"

# List of services
SERVICES=(
  "api-gateway"
  "user-service"
  "game-engine"
  "rewards-service"
  "payment-service"
  "analytics-service"
  "scheduler"
  "social-hub"
  "telegram-bot"
  "twitter-bot"
  "admin-dashboard"
  "gaming-hub"
)

# Install dependencies for each service
for SERVICE in "${SERVICES[@]}"; do
  SERVICE_PATH="$BASE_DIR/$SERVICE"
  
  if [ -d "$SERVICE_PATH" ]; then
    echo -e "${BLUE}Installing dependencies for $SERVICE...${NC}"
    cd "$SERVICE_PATH"
    
    # Install npm dependencies
    if [ -f "package.json" ]; then
      npm install
      
      # Build TypeScript if tsconfig exists
      if [ -f "tsconfig.json" ]; then
        echo -e "${BLUE}Building TypeScript for $SERVICE...${NC}"
        npm run build || echo "Build script not found, skipping..."
      fi
    else
      echo -e "${YELLOW}No package.json found for $SERVICE${NC}"
    fi
    
    cd - > /dev/null
    echo -e "${GREEN}✓ $SERVICE dependencies installed${NC}"
    echo ""
  else
    echo -e "${YELLOW}Service directory not found: $SERVICE_PATH${NC}"
  fi
done

echo -e "${GREEN}✅ All microservices dependencies installed!${NC}"
echo ""
echo "To start the microservices, run:"
echo "  docker-compose -f docker-compose.microservices.yml up -d"
echo ""
echo "To check service status:"
echo "  docker-compose -f docker-compose.microservices.yml ps" 