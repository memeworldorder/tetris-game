#!/bin/bash

# 🧪 SUPABASE EDGE FUNCTIONS TEST SCRIPT
# Quick test script to verify all edge functions are working

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Your Supabase configuration
SUPABASE_URL="https://qtwmykpyhcvfavjgncty.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTU2MDcsImV4cCI6MjA2NjYzMTYwN30.lhpqOaxVxadQamtHT_vx3-JyoKyThV3uMGMLvOMHRyU"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA1NTYwNywiZXhwIjoyMDY2NjMxNjA3fQ.fwu/6tRriMFnAYMa2UH6HoKu2uMdCU8P8wScHcX3Us0kFbOl0pfQ0vjPUM34XRyRu82LZ0dVCmAiXUJjlVpC2A"

# Test wallet address
TEST_WALLET="FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai"

print_test() {
    echo -e "${BLUE}🧪 Testing: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Test function helper
test_function() {
    local func_name="$1"
    local payload="$2"
    local expected_status="$3"
    
    print_test "$func_name"
    
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST "$SUPABASE_URL/functions/v1/$func_name" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ANON_KEY" \
        -d "$payload")
    
    http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo "$response" | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$http_code" = "$expected_status" ]; then
        print_success "$func_name: HTTP $http_code ✓"
        echo "   Response: $(echo "$body" | jq -r '.message // .error // .' 2>/dev/null || echo "$body")"
    else
        print_error "$func_name: Expected HTTP $expected_status, got $http_code"
        echo "   Response: $body"
    fi
    
    echo ""
}

echo "🚀 TESTING SUPABASE EDGE FUNCTIONS"
echo "=================================="
echo "URL: $SUPABASE_URL"
echo "Test Wallet: $TEST_WALLET"
echo ""

# Test 1: handle-game-start
test_function "handle-game-start" \
    '{"wallet_address":"'$TEST_WALLET'","game_type":"tetris"}' \
    "200"

# Test 2: verify-wallet (will fail without proper signature, but should return 400)
test_function "verify-wallet" \
    '{"wallet_address":"'$TEST_WALLET'","signature":"invalid","message":"test"}' \
    "400"

# Test 3: daily-reset (should work with service role)
print_test "daily-reset (with service role key)"
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST "$SUPABASE_URL/functions/v1/daily-reset" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -d '{}')

http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo "$response" | sed -e 's/HTTPSTATUS:.*//g')

if [ "$http_code" = "200" ]; then
    print_success "daily-reset: HTTP $http_code ✓"
    echo "   Response: $(echo "$body" | jq -r '.message // .' 2>/dev/null || echo "$body")"
else
    print_error "daily-reset: Expected HTTP 200, got $http_code"
    echo "   Response: $body"
fi
echo ""

# Test 4: Check if functions are deployed
print_test "Checking deployed functions"
if command -v supabase &> /dev/null; then
    echo "📋 Deployed functions:"
    supabase functions list 2>/dev/null || print_warning "Could not list functions (not logged in?)"
else
    print_warning "Supabase CLI not found. Install with: npm install -g supabase"
fi
echo ""

# Test 5: Database connection test
print_test "Database connection test"
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X GET "$SUPABASE_URL/rest/v1/user_lives?select=count" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY")

http_code=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

if [ "$http_code" = "200" ]; then
    print_success "Database connection: HTTP $http_code ✓"
else
    print_error "Database connection: HTTP $http_code"
fi
echo ""

echo "🎯 QUICK INTEGRATION TEST"
echo "========================"

# Quick integration test: Start game -> End game
print_test "Integration test: Start game"
start_response=$(curl -s \
    -X POST "$SUPABASE_URL/functions/v1/handle-game-start" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ANON_KEY" \
    -d '{"wallet_address":"'$TEST_WALLET'","game_type":"tetris"}')

session_id=$(echo "$start_response" | jq -r '.session_id // empty' 2>/dev/null)

if [ -n "$session_id" ] && [ "$session_id" != "null" ]; then
    print_success "Game started with session: $session_id"
    
    # End the game
    print_test "Integration test: End game"
    end_response=$(curl -s \
        -X POST "$SUPABASE_URL/functions/v1/handle-game-end" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ANON_KEY" \
        -d '{
            "session_id":"'$session_id'",
            "wallet_address":"'$TEST_WALLET'",
            "score":12345,
            "lines_cleared":10,
            "level_reached":3
        }')
    
    final_score=$(echo "$end_response" | jq -r '.final_score // empty' 2>/dev/null)
    
    if [ -n "$final_score" ] && [ "$final_score" != "null" ]; then
        print_success "Game completed with score: $final_score"
        achievements=$(echo "$end_response" | jq -r '.achievements[]?' 2>/dev/null | tr '\n' ' ')
        if [ -n "$achievements" ]; then
            echo "   🏆 Achievements: $achievements"
        fi
    else
        print_error "Failed to end game"
        echo "   Response: $end_response"
    fi
else
    print_error "Failed to start game"
    echo "   Response: $start_response"
fi

echo ""
echo "🎉 TEST COMPLETE!"
echo ""
echo "💡 Next steps:"
echo "• If tests pass: Your edge functions are working!"
echo "• If tests fail: Check function deployment and database setup"
echo "• Use: supabase functions logs <function-name> to debug"
echo ""
echo "🔗 Your function URLs:"
echo "• Game Start: $SUPABASE_URL/functions/v1/handle-game-start"
echo "• Game End: $SUPABASE_URL/functions/v1/handle-game-end"
echo "• Daily Reset: $SUPABASE_URL/functions/v1/daily-reset"
echo "• Verify Wallet: $SUPABASE_URL/functions/v1/verify-wallet" 