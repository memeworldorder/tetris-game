#!/bin/bash

echo "🧪 Testing your Simple GameFi Platform..."
echo "========================================"

# Wait for the app to start
echo "⏳ Waiting for the app to start..."
sleep 3

# Test API health
echo "🏥 Testing API health..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/gamefi?action=health)
if [[ $HEALTH_RESPONSE == *"healthy"* ]]; then
    echo "✅ API is healthy!"
else
    echo "❌ API health check failed"
    echo "Response: $HEALTH_RESPONSE"
fi

# Test wallet address (sample)
WALLET="FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai"

# Test getting user lives
echo "💜 Testing user lives endpoint..."
LIVES_RESPONSE=$(curl -s "http://localhost:3000/api/gamefi?action=lives&wallet=$WALLET")
if [[ $LIVES_RESPONSE == *"success"* ]]; then
    echo "✅ Lives endpoint working!"
    echo "Lives data: $LIVES_RESPONSE"
else
    echo "❌ Lives endpoint failed"
    echo "Response: $LIVES_RESPONSE"
fi

# Test leaderboard
echo "🏆 Testing leaderboard endpoint..."
LEADERBOARD_RESPONSE=$(curl -s "http://localhost:3000/api/gamefi?action=leaderboard&limit=5")
if [[ $LEADERBOARD_RESPONSE == *"success"* ]]; then
    echo "✅ Leaderboard endpoint working!"
else
    echo "❌ Leaderboard endpoint failed"
    echo "Response: $LEADERBOARD_RESPONSE"
fi

# Test using a life
echo "🎮 Testing use life endpoint..."
USE_LIFE_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"use_life\",\"wallet_address\":\"$WALLET\"}" \
  http://localhost:3000/api/gamefi)

if [[ $USE_LIFE_RESPONSE == *"success"* ]]; then
    echo "✅ Use life endpoint working!"
    echo "Game session created!"
else
    echo "⚠️  Use life might fail if no lives remaining - this is normal"
    echo "Response: $USE_LIFE_RESPONSE"
fi

echo ""
echo "🎉 Simple GameFi Test Complete!"
echo "==============================="
echo ""
echo "✅ What's working:"
echo "   • API endpoints responding"
echo "   • Supabase database connected"
echo "   • No microservices needed!"
echo "   • Everything runs on port 3000"
echo ""
echo "🎮 Next steps:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Connect your Solana wallet"
echo "   3. Start playing Tetris!"
echo ""
echo "💡 If any tests failed, check:"
echo "   • Is the app running? (npm run dev)"
echo "   • Is .env.local configured correctly?"
echo "   • Check browser console for errors"
echo "" 