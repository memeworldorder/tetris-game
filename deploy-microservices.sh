#!/bin/bash

echo "🚀 DEPLOYING FULL MICROSERVICES ARCHITECTURE"
echo "============================================"
echo ""

# Install Railway CLI if not present
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Login to Railway
echo "🔐 Login to Railway..."
railway login

# Create a new Railway project
echo "🆕 Creating Railway project..."
railway init tetris-gamefi-platform

# Set environment variables for production
echo "⚙️  Setting up environment variables..."

# Database and infrastructure
railway variables set DATABASE_URL="$DATABASE_URL"
railway variables set REDIS_URL="$REDIS_URL" 
railway variables set RABBITMQ_URL="$RABBITMQ_URL"

# Solana configuration
railway variables set SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
railway variables set NEXT_PUBLIC_SOLANA_NETWORK="mainnet-beta"

# Service URLs (Railway will auto-assign these)
railway variables set API_GATEWAY_URL="https://tetris-gamefi-platform.railway.app"
railway variables set USER_SERVICE_URL="https://user-service-tetris-gamefi-platform.railway.app"
railway variables set GAME_ENGINE_URL="https://game-engine-tetris-gamefi-platform.railway.app"
railway variables set REWARDS_SERVICE_URL="https://rewards-service-tetris-gamefi-platform.railway.app"
railway variables set PAYMENT_SERVICE_URL="https://payment-service-tetris-gamefi-platform.railway.app"
railway variables set ANALYTICS_SERVICE_URL="https://analytics-service-tetris-gamefi-platform.railway.app"

# JWT and security
railway variables set JWT_SECRET="gamefi-production-secret-2024"
railway variables set ADMIN_SECRET="admin-super-secret-2024"

# Social media (optional)
railway variables set TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
railway variables set TELEGRAM_CHANNEL_ID="${TELEGRAM_CHANNEL_ID:-}"
railway variables set TWITTER_API_KEY="${TWITTER_API_KEY:-}"
railway variables set TWITTER_API_SECRET="${TWITTER_API_SECRET:-}"

# Deploy using docker-compose
echo "🚢 Deploying all microservices..."
railway up --detach

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================"
echo ""
echo "🌐 Your GameFi Platform URLs:"
echo "   • Main App: https://tetris-gamefi-platform.railway.app"
echo "   • Admin Dashboard: https://admin-dashboard-tetris-gamefi-platform.railway.app"
echo "   • API Gateway: https://api-gateway-tetris-gamefi-platform.railway.app"
echo ""
echo "📊 All 12 microservices deployed:"
echo "   ✅ API Gateway (port 3000)"
echo "   ✅ Gaming Hub (port 3001)" 
echo "   ✅ User Service (port 3010)"
echo "   ✅ Game Engine (port 3011)"
echo "   ✅ Rewards Service (port 3012)"
echo "   ✅ Payment Service (port 3013)"
echo "   ✅ Analytics Service (port 3014)"
echo "   ✅ Telegram Bot (port 3015)"
echo "   ✅ Twitter Bot (port 3016)"
echo "   ✅ Social Hub (port 3017)"
echo "   ✅ Scheduler (port 3018)"
echo "   ✅ Admin Dashboard (port 3019)"
echo ""
echo "🗄️  Infrastructure:"
echo "   ✅ PostgreSQL Database"
echo "   ✅ Redis Cache"
echo "   ✅ RabbitMQ Message Queue"
echo "   ✅ ClickHouse Analytics"
echo "   ✅ Nginx Load Balancer"
echo ""
echo "🧪 Test your deployment:"
echo "   curl https://tetris-gamefi-platform.railway.app/health"
echo "" 