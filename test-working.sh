#!/bin/bash

echo "🧪 TESTING WORKING GAMEFI APIS"
echo "=============================="
echo ""

# Wait for app to be ready
sleep 2

echo "1️⃣ Testing API Health..."
HEALTH=$(curl -s "http://localhost:3000/api/gamefi?action=health")
echo "Response: $HEALTH"

if [[ $HEALTH == *"\"success\":true"* ]]; then
    echo "✅ API is healthy!"
else
    echo "❌ API health check failed"
    exit 1
fi

echo ""
echo "2️⃣ Testing User Lives..."
LIVES=$(curl -s "http://localhost:3000/api/gamefi?action=lives&wallet=FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai")
echo "Response: $LIVES"

if [[ $LIVES == *"\"success\":true"* ]]; then
    echo "✅ Lives API working!"
    LIVES_WORKING=true
else
    echo "❌ Lives API failed - DATABASE ERROR DETECTED"
    LIVES_WORKING=false
fi

echo ""
echo "3️⃣ Testing Leaderboard..."
LEADERBOARD=$(curl -s "http://localhost:3000/api/gamefi?action=leaderboard&limit=5")
echo "Response: $LEADERBOARD"

if [[ $LEADERBOARD == *"\"success\":true"* ]]; then
    echo "✅ Leaderboard API working!"
    LEADERBOARD_WORKING=true
else
    echo "❌ Leaderboard API failed - DATABASE ERROR DETECTED"
    LEADERBOARD_WORKING=false
fi

echo ""
echo "4️⃣ Testing Use Life..."
USE_LIFE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"action":"use_life","wallet_address":"FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai"}' \
  http://localhost:3000/api/gamefi)

echo "Response: $USE_LIFE"

if [[ $USE_LIFE == *"\"success\":true"* ]]; then
    echo "✅ Use Life API working!"
    USE_LIFE_WORKING=true
else
    echo "⚠️  Use Life API failed (may be database issue)"
    USE_LIFE_WORKING=false
fi

echo ""
echo "🎉 TEST RESULTS:"
echo "==============="
echo ""

if [[ $LIVES_WORKING == true && $LEADERBOARD_WORKING == true ]]; then
    echo "✅ ALL CORE APIS WORKING!"
    echo ""
    echo "🎮 Your GameFi platform is ready:"
    echo "   • Open: http://localhost:3000"
    echo "   • Connect your Solana wallet"
    echo "   • Start playing Tetris!"
    echo ""
    echo "💰 GameFi features active:"
    echo "   • Lives system (5 free daily)"
    echo "   • Buy lives with SOL (0.001 each)"
    echo "   • Leaderboards"
    echo "   • Achievement tracking"
    echo ""
    echo "🚀 Ready to deploy? Run: vercel --prod"
else
    echo "❌ DATABASE APIS FAILED!"
    echo ""
    echo "🔧 CRITICAL FIX NEEDED:"
    echo "   1. The database tables are NOT set up correctly"
    echo "   2. Error: 'schema must be one of the following: api'"
    echo "   3. This means Supabase connection is failing"
    echo ""
    echo "🗄️  FIX STEPS:"
    echo "   1. Go to: https://qtwmykpyhcvfavjgncty.supabase.co"
    echo "   2. Click 'SQL Editor' in left sidebar"
    echo "   3. Copy ALL contents of create-supabase-tables.sql"
    echo "   4. Paste and click 'Run'"
    echo "   5. Verify tables appear in 'Table Editor'"
    echo ""
    echo "🔍 Also check:"
    echo "   • Your .env.local has correct Supabase URL"
    echo "   • Supabase project is active (not paused)"
    echo "   • API keys are valid"
    echo ""
fi

echo "" 