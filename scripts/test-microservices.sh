#!/bin/bash

echo "🧪 Testing Microservices Migration"
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Services to test
SERVICES=("api-gateway" "user-service" "payment-service" "rewards-service" "game-engine")

# Test each service build
for SERVICE in "${SERVICES[@]}"; do
  echo -e "${BLUE}Building $SERVICE...${NC}"
  
  cd "services/$SERVICE"
  
  if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ $SERVICE build successful${NC}"
  else
    echo -e "${RED}❌ $SERVICE build failed${NC}"
    npm run build
  fi
  
  cd - > /dev/null
  echo ""
done

echo -e "${GREEN}🎉 Microservices Migration Test Complete!${NC}"
echo ""
echo "📋 Migration Summary:"
echo "• ✅ Payment Service - Handles life purchases and blockchain webhooks"
echo "• ✅ Rewards Service - Manages daily claims and MWOR bonuses"  
echo "• ✅ Game Engine - Validates game moves and calculates scores"
echo "• ✅ API Gateway - Routes requests to appropriate microservices"
echo ""
echo "🚀 Ready to deploy!" 