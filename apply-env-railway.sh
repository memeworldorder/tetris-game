#!/bin/bash

# 🚂 Apply Railway Environment Configuration to All Microservices
# This script creates .env files optimized for Railway deployment

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚂 Applying Railway Environment Configuration to All Microservices${NC}"
echo ""

# Database configuration (same Supabase credentials)
DATABASE_URL="postgresql://postgres.qtwmykpyhcvfavjgncty:P00dle11%40%40@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
SUPABASE_URL="https://qtwmykpyhcvfavjgncty.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTU2MDcsImV4cCI6MjA2NjYzMTYwN30.lhpqOaxVxadQamtHT_vx3-JyoKyThV3uMGMLvOMHRyU"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA1NTYwNywiZXhwIjoyMDY2NjMxNjA3fQ.L8sIHwA9HFHS8tLn1KNg8Ei8V-C0c8EsjK3i3frQtQo"
JWT_SECRET="fwu/6tRriMFnAYMa2UH6HoKu2uMdCU8P8wScHcX3Us0kFbOl0pfQ0vjPUM34XRyRu82LZ0dVCmAiXUJjlVpC2A=="

# Railway-specific configuration
RAILWAY_ENVIRONMENT="production"
RAILWAY_PROJECT_NAME="gamefi-platform"

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
        echo -e "${YELLOW}Configuring $service for Railway...${NC}"
        
        # Get the port number for this service (Railway uses PORT env var)
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
        
        # Create .env file for Railway
        cat > "services/$service/.env" << EOF
# $service Railway Environment Configuration
# Optimized for Railway cloud deployment

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
NODE_ENV=production

# =================================================================
# 🚂 RAILWAY CONFIGURATION
# =================================================================
PORT=\$PORT
RAILWAY_ENVIRONMENT=$RAILWAY_ENVIRONMENT
SERVICE_NAME=$service
LOG_LEVEL=info

# Railway will provide these automatically:
# RAILWAY_PROJECT_ID, RAILWAY_SERVICE_ID, RAILWAY_DEPLOYMENT_ID

# =================================================================
# 🌐 CORS & NETWORKING (Railway Internal)
# =================================================================
CORS_ORIGIN=*
ALLOWED_ORIGINS=https://*.up.railway.app,https://*.railway.app

# =================================================================
# 🌐 SOLANA BLOCKCHAIN CONFIGURATION
# =================================================================
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta

# =================================================================
# 🏗️ INFRASTRUCTURE (Railway Managed)
# =================================================================
# Railway provides managed Redis and other services
REDIS_URL=\$REDIS_URL
RABBITMQ_URL=\$RABBITMQ_URL

# Enable infrastructure requirements for production
REQUIRE_REDIS=true
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
# 🔗 SERVICE DISCOVERY (Railway Internal Network)
# =================================================================
# Railway internal service communication (no localhost!)
API_GATEWAY_URL=http://api-gateway:\$PORT
GAMING_HUB_URL=http://gaming-hub:\$PORT
USER_SERVICE_URL=http://user-service:\$PORT
GAME_ENGINE_URL=http://game-engine:\$PORT
REWARDS_SERVICE_URL=http://rewards-service:\$PORT
PAYMENT_SERVICE_URL=http://payment-service:\$PORT
ANALYTICS_SERVICE_URL=http://analytics-service:\$PORT
SOCIAL_HUB_URL=http://social-hub:\$PORT
ADMIN_DASHBOARD_URL=http://admin-dashboard:\$PORT

# =================================================================
# 🔧 FRONTEND CONFIGURATION (Railway Public URLs)
# =================================================================
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
# Railway will set RAILWAY_STATIC_URL automatically for public access
NEXT_PUBLIC_API_URL=https://\${RAILWAY_STATIC_URL}
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# =================================================================
# 🚂 RAILWAY DEPLOYMENT SETTINGS
# =================================================================
# Railway automatically manages these, but good to have for reference:
# RAILWAY_DEPLOYMENT_DOMAIN - Your public domain
# RAILWAY_STATIC_URL - Static file serving URL
# RAILWAY_TCP_PROXY_DOMAIN - TCP proxy domain
# RAILWAY_TCP_PROXY_PORT - TCP proxy port
EOF
        
        echo -e "${GREEN}✅ $service configured for Railway${NC}"
    else
        echo -e "${YELLOW}⚠️  Service directory services/$service not found${NC}"
    fi
done

echo ""
echo -e "${GREEN}🎉 Railway environment configuration applied to all services!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps for Railway Deployment:${NC}"
echo "1. Install Railway CLI: npm install -g @railway/cli"
echo "2. Login to Railway: railway login"
echo "3. Initialize project: railway init"
echo "4. Deploy services: railway up --service [service-name]"
echo "5. Set environment variables in Railway dashboard"
echo ""
echo -e "${YELLOW}⚠️  Important Railway Notes:${NC}"
echo "• Use Railway's internal networking (service-name:port)"
echo "• Railway provides PORT environment variable automatically"
echo "• Use RAILWAY_STATIC_URL for public frontend URLs"
echo "• Enable Railway's managed Redis/database services"
echo ""
echo -e "${GREEN}🚂 All services now configured for Railway deployment!${NC}" 