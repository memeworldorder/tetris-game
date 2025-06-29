#!/bin/bash

echo "🚀 DEPLOYING MICROSERVICES WITH SUPABASE DATABASE"
echo "================================================="
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
railway init tetris-gamefi-supabase

echo "⚙️  Setting up environment variables with Supabase..."

# Use your existing Supabase database
railway variables set DATABASE_URL="postgresql://postgres.qtwmykpyhcvfavjgncty:8IOBadTkqWjp6zfv@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
railway variables set DIRECT_URL="postgresql://postgres.qtwmykpyhcvfavjgncty:8IOBadTkqWjp6zfv@aws-0-us-west-1.pooler.supabase.com:5432/postgres"

# Supabase API (for some services that might need it)
railway variables set NEXT_PUBLIC_SUPABASE_URL="https://qtwmykpyhcvfavjgncty.supabase.co"
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0aHV6bmdweXR6ZmNkaHVxdW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNjcxOTgsImV4cCI6MjA2Njc0MzE5OH0.gdjMYxFFRo-CUpwpb1whpvK2km_o25ICQtXnHP_pjsc"
railway variables set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0aHV6bmdweXR6ZmNkaHVxdW5lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTE2NzE5OCwiZXhwIjoyMDY2NzQzMTk4fQ.mMbhruKPjwZVnpnBQOTdfHss0KGPCjLArhTXxJpwMWk"

# Managed Redis and RabbitMQ (Railway provides these)
railway add redis
railway add rabbitmq

# Solana mainnet
railway variables set SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
railway variables set NEXT_PUBLIC_SOLANA_NETWORK="mainnet-beta"

# JWT and security
railway variables set JWT_SECRET="bJv2lYsU/AEHiD/Yaez2WEXnqjktcIPaS1MSHWuMcxzIJ/TOqJRohYEc3wA7Pe+K8p04GfMuoxSNztIjwKD0bg=="
railway variables set ADMIN_SECRET="admin-super-secret-2024"

# Social media bots (optional)
railway variables set TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
railway variables set TELEGRAM_CHANNEL_ID="${TELEGRAM_CHANNEL_ID:-}"
railway variables set TWITTER_API_KEY="${TWITTER_API_KEY:-}"
railway variables set TWITTER_API_SECRET="${TWITTER_API_SECRET:-}"

# Deploy each microservice individually (better for Railway)
echo "🚢 Deploying microservices..."

services=(
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

for service in "${services[@]}"; do
  echo "🚀 Deploying $service..."
  cd "services/$service"
  railway up --detach
  cd ../..
done

echo ""
echo "🎉 DEPLOYMENT COMPLETE WITH SUPABASE!"
echo "===================================="
echo ""
echo "✅ Benefits of this setup:"
echo "   • Using your existing Supabase database (with all tables)"
echo "   • Managed Redis & RabbitMQ via Railway"
echo "   • All 12 microservices deployed"
echo "   • No need to manage PostgreSQL containers"
echo "   • Supabase handles database scaling & backups"
echo ""
echo "🌐 Your services will be available at:"
echo "   • API Gateway: https://api-gateway.railway.app"
echo "   • Gaming Hub: https://gaming-hub.railway.app"
echo "   • Admin Dashboard: https://admin-dashboard.railway.app"
echo ""
echo "🧪 Test deployment:"
echo "   curl https://api-gateway.railway.app/health"
echo ""
echo "💰 Estimated cost: ~$15-30/month"
echo "   (vs $50+ with full PostgreSQL containers)"
echo "" 