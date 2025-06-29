#!/bin/bash

echo "🔧 Testing VRF Fixes"
echo "===================="

# Check if server is running
if ! curl -s http://localhost:3000/api/init-db > /dev/null 2>&1; then
  echo "❌ Server not running. Please start with: ./start-test-server.sh"
  exit 1
fi

echo "✅ Server is running"

# Test 1: Basic VRF status
echo ""
echo "🧪 Test 1: VRF Status"
curl -s -X POST http://localhost:3000/api/test-vrf \
  -H "Content-Type: application/json" \
  -d '{"testType": "vrf_status"}' | \
  python3 -m json.tool 2>/dev/null | head -10

# Test 2: Seed generation (should work quickly)
echo ""
echo "🌱 Test 2: Seed Generation"
curl -s -X POST http://localhost:3000/api/test-vrf \
  -H "Content-Type: application/json" \
  -d '{"testType": "seed_generation", "params": {"walletAddress": "test_wallet", "sessionId": "test_session"}}' | \
  python3 -m json.tool 2>/dev/null

# Test 3: Quick raffle draw
echo ""
echo "🎰 Test 3: Quick Raffle Draw"
curl -s -X POST http://localhost:3000/api/test-vrf \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "raffle_draw", 
    "params": {
      "scores": [
        {"walletAddress": "wallet1", "score": 100000},
        {"walletAddress": "wallet2", "score": 95000}
      ], 
      "winners": 1
    }
  }' | python3 -m json.tool 2>/dev/null

# Test 4: Full VRF test suite
echo ""
echo "🎮 Test 4: Full VRF Test Suite"
echo "This may take 10-15 seconds..."
curl -s "http://localhost:3000/api/test-vrf" | \
  python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        print('✅ All tests passed:', data['summary']['testsPass'], '/', data['summary']['testsRun'])
        print('💰 Total cost:', data['summary']['totalEstimatedCost'], 'SOL')
    else:
        print('❌ Tests failed:', data.get('error', 'Unknown error'))
except:
    print('❌ Failed to parse results')
"

# Test 5: Full raffle (with fallback)
echo ""
echo "🎪 Test 5: Full Raffle Test (with VRF fallback)"
echo "This may take 15-20 seconds..."
curl -s "http://localhost:3000/api/test-vrf?fullRaffle=true" | \
  python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        print('✅ Full raffle test passed!')
        for result in data['results']['tests']:
            if 'raffle' in result['name'].lower():
                print('🎰', result['name'], '- Status:', result['status'])
    else:
        print('❌ Full raffle test failed:', data.get('error', 'Unknown error'))
except:
    print('❌ Failed to parse results')
"

echo ""
echo "🎯 VRF Testing Complete!"
echo ""
echo "If any tests failed, check the server console for detailed logs."
echo "The system now uses fallback randomness when VRF times out." 