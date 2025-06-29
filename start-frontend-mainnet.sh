#!/bin/bash

# 🚀 Start Frontend with MAINNET LIVE Configuration
# No mock data, connects to live microservices

echo "🎮 Starting Frontend - MAINNET LIVE MODE"
echo "========================================"
echo ""
echo "🌐 Network: mainnet-beta"
echo "🔗 API Gateway: http://localhost:3000"
echo "❌ Mock data: DISABLED"
echo ""

# Kill existing frontend processes
pkill -f "next dev" || true
pkill -f "npm run dev" || true
sleep 2

# Set mainnet environment variables
export NODE_ENV=production
export NEXT_PUBLIC_ENV=mainnet
export NEXT_PUBLIC_API_URL=http://localhost:3000
export NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
export NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
export NEXT_PUBLIC_USE_MOCK_DATA=false
export NEXT_PUBLIC_USER_SERVICE_URL=http://localhost:3010
export NEXT_PUBLIC_GAME_ENGINE_URL=http://localhost:3011
export NEXT_PUBLIC_REWARDS_SERVICE_URL=http://localhost:3012
export NEXT_PUBLIC_PAYMENT_SERVICE_URL=http://localhost:3013
export NEXT_PUBLIC_ANALYTICS_SERVICE_URL=http://localhost:3014

# Unset DATABASE_URL to force API Gateway usage
unset DATABASE_URL

echo "🚀 Starting frontend on port 3001..."
echo "📊 All data will come from LIVE microservices"
echo ""

# Start with mainnet configuration
PORT=3001 npm run dev > logs/frontend-mainnet.log 2>&1 &

sleep 5

echo "✅ Frontend started!"
echo ""
echo "🌐 Access URLs:"
echo "  • Main UI: http://localhost:3001"
echo "  • Admin: http://localhost:3001/admin"
echo ""
echo "📋 Log file: logs/frontend-mainnet.log"
echo ""
echo "💡 All sessions and data are now LIVE from microservices!" 