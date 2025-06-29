#!/bin/bash

# 🔧 Apply Environment Configuration to All Microservices
# This script creates .env files for all services with the actual Supabase credentials

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Applying Environment Configuration to All Microservices${NC}"
echo ""

# Database configuration with actual password
DATABASE_URL="postgresql://postgres.qtwmykpyhcvfavjgncty:P00dle11%40%40@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
NEXT_PUBLIC_SUPABASE_URL=https://qtwmykpyhcvfavjgncty.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTU2MDcsImV4cCI6MjA2NjYzMTYwN30.lhpqOaxVxadQamtHT_vx3-JyoKyThV3uMGMLvOMHRyU
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA1NTYwNywiZXhwIjoyMDY2NjMxNjA3fQ.L8sIHwA9HFHS8tLn1KNg8Ei8V-C0c8EsjK3i3frQtQo"
JWT_SECRET="fwu/6tRriMFnAYMa2UH6HoKu2uMdCU8P8wScHcX3Us0kFbOl0pfQ0vjPUM34XRyRu82LZ0dVCmAiXUJjlVpC2A=="

# Services that need environment files
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

# Create .env file for each service
for service in "${SERVICES[@]}"; do
    if [ -d "services/$service" ]; then
        echo -e "${YELLOW}Configuring $service...${NC}"
        
        # Get the port number for this service
        case $service in
            "api-gateway") PORT=3000 ;;
            "gaming-hub") PORT=3001 ;;
            "user-service") PORT=3010 ;;
            "game-engine") PORT=3011 ;;
            "rewards-service") PORT=3012 ;;
            "payment-service") PORT=3013 ;;
            "analytics-service") PORT=3014 ;;
            "telegram-bot") PORT=3015 ;;
            "twitter-bot") PORT=3016 ;;
            "social-hub") PORT=3017 ;;
            "scheduler") PORT=3018 ;;
            "admin-dashboard") PORT=3019 ;;
            *) PORT=3000 ;;
        esac
        
        # Create .env file
        cat > "services/$service/.env" << EOF
# $service Environment Configuration
# Auto-generated with actual Supabase credentials

# =================================================================
# 🗄️ DATABASE CONFIGURATION (Supabase)
# =================================================================
DATABASE_URL=$DATABASE_URL
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# =================================================================
# 🔐 SECURITY CONFIGURATION
# =================================================================
JWT_SECRET=$JWT_SECRET
NODE_ENV=development

# =================================================================
# 🔧 SERVICE CONFIGURATION
# =================================================================
PORT=$PORT
SERVICE_NAME=$service
LOG_LEVEL=info

# =================================================================
# 🌐 CORS & NETWORKING
# =================================================================
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3019
CORS_ORIGIN=*

# =================================================================
# 🌐 SOLANA BLOCKCHAIN CONFIGURATION
# =================================================================
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta

# =================================================================
# 🏗️ INFRASTRUCTURE (Optional for local development)
# =================================================================
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost:5672
CLICKHOUSE_URL=http://localhost:8123

# Disable infrastructure requirements for local development
REQUIRE_REDIS=false
REQUIRE_RABBITMQ=false
REQUIRE_CLICKHOUSE=false

# =================================================================
# 🎮 GAME CONFIGURATION
# =================================================================
FREE_LIFE_LIMIT=5
PAID_LIFE_CAP=10
BONUS_DIVISOR=50000
BONUS_CAP=40
CHEAP_LIFE_PRICE_USD=0.03
MID_LIFE_PRICE_USD=0.09
HIGH_LIFE_PRICE_USD=0.27

# =================================================================
# 🤖 SOCIAL MEDIA CONFIGURATION
# =================================================================
TELEGRAM_BOT_TOKEN=7820572708:AAHX9TD2wfFzwDufOFaIzVzfPG7x5TUDqHM
TELEGRAM_CHAT_ID=227227
TELEGRAM_CHANNEL_ID=t.me/mwor_feed/2
TWITTER_API_KEY=nIYZY1aLDyhocZcNfILGm1jYE
TWITTER_API_SECRET=AfGNuySrK5TBXFzzKXGjD57PjAJNXQmqinIMoN5aQpntkG01dt
TWITTER_ACCESS_TOKEN=1871153054579396608-UYPhMZNU0hZ7QxlkPboZTNLQBFkNiz
TWITTER_ACCESS_SECRET=uVYHUZgd33ZdguahtFM2iAzyBfOcrb6pjUQ6zztNtbfZJ

# =================================================================
# 🔗 SERVICE DISCOVERY (Local Development)
# =================================================================
API_GATEWAY_URL=http://localhost:3000
GAMING_HUB_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3010
GAME_ENGINE_URL=http://localhost:3011
REWARDS_SERVICE_URL=http://localhost:3012
PAYMENT_SERVICE_URL=http://localhost:3013
ANALYTICS_SERVICE_URL=http://localhost:3014
SOCIAL_HUB_URL=http://localhost:3017
ADMIN_DASHBOARD_URL=http://localhost:3019

# =================================================================
# 🔧 FRONTEND CONFIGURATION
# =================================================================
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
EOF
        
        echo -e "${GREEN}✅ $service configured${NC}"
    else
        echo -e "${YELLOW}⚠️  Service directory services/$service not found${NC}"
    fi
done

echo ""
echo -e "${GREEN}🎉 Environment configuration applied to all services!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Test database connection: ./test-supabase-connection.sh"
echo "2. Start a service: cd services/user-service && npm run dev"
echo "3. Check health: curl http://localhost:3010/health"
echo ""
echo -e "${YELLOW}All services now have proper Supabase configuration!${NC}" 