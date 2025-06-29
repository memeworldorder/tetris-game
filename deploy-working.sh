#!/bin/bash

echo "🚀 DEPLOYING GAMEFI MICROSERVICES (FIXED)"
echo "========================================="

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
fi

echo "🔐 Setting up Railway project..."

# Create new project (correct syntax)
railway login
railway init

echo "⚙️  Setting up environment variables..."

# Correct Railway CLI syntax for environment variables
railway variables --set DATABASE_URL="postgresql://postgres.qtwmykpyhcvfavjgncty:8IOBadTkqWjp6zfv@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
railway variables --set NEXT_PUBLIC_SUPABASE_URL="https://qtwmykpyhcvfavjgncty.supabase.co"
railway variables --set NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTU2MDcsImV4cCI6MjA2NjYzMTYwN30.lhpqOaxVxadQamtHT_vx3-JyoKyThV3uMGMLvOMHRyU"
railway variables --set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA1NTYwNywiZXhwIjoyMDY2NjMxNjA3fQ.fwu/6tRriMFnAYMa2UH6HoKu2uMdCU8P8wScHcX3Us0kFbOl0pfQ0vjPUM34XRyRu82LZ0dVCmAiXUJjlVpC2A"
railway variables --set JWT_SECRET="gamefi-production-secret-2024"
railway variables --set SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
railway variables --set NEXT_PUBLIC_SOLANA_NETWORK="mainnet-beta"

echo "🚢 Deploying API Gateway (main service)..."
cd services/api-gateway
railway up
cd ../..

echo "✅ API Gateway deployed!"
echo ""
echo "🌐 Your API Gateway should be available at:"
echo "   https://[your-project].railway.app"
echo ""
echo "🧪 Test it:"
echo "   railway domain # to get your URL"
echo "   curl https://[your-url]/health"
echo ""
echo "📝 To deploy other services:"
echo "   cd services/user-service && railway up"
echo "   cd services/game-engine && railway up"
echo "   # etc for each service"
echo "" 