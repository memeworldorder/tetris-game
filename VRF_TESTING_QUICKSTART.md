# 🎯 VRF Testing Quick Start Guide

## 🚀 **One-Command Startup**

```bash
# Make script executable (already done)
chmod +x start-test-server.sh

# Start everything with one command
./start-test-server.sh
```

The script will:
- ✅ Install dependencies automatically
- ✅ Create `.env.local` with test configuration  
- ✅ Start the Next.js development server
- ✅ Initialize the in-memory test database
- ✅ Set up sample data for VRF testing

## 🧪 **Manual Startup (Alternative)**

```bash
# Install dependencies
pnpm install  # or npm install

# Start development server
pnpm dev      # or npm run dev
```

## 🔍 **Test the VRF Implementation**

### **1. Check Database Status**
```bash
curl http://localhost:3000/api/init-db
```

### **2. Run All VRF Tests**
```bash
curl http://localhost:3000/api/test-vrf
```

### **3. Run Full Raffle Test (slower)**
```bash
curl "http://localhost:3000/api/test-vrf?fullRaffle=true"
```

### **4. Run Specific VRF Tests**

**Test VRF Status:**
```bash
curl -X POST http://localhost:3000/api/test-vrf \
  -H "Content-Type: application/json" \
  -d '{"testType": "vrf_status"}'
```

**Test Seed Generation:**
```bash
curl -X POST http://localhost:3000/api/test-vrf \
  -H "Content-Type: application/json" \
  -d '{"testType": "seed_generation", "params": {"walletAddress": "test_wallet_123", "sessionId": "session_456"}}'
```

**Test Raffle Draw:**
```bash
curl -X POST http://localhost:3000/api/test-vrf \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "raffle_draw", 
    "params": {
      "scores": [
        {"walletAddress": "wallet1", "score": 150000},
        {"walletAddress": "wallet2", "score": 125000},
        {"walletAddress": "wallet3", "score": 100000}
      ], 
      "winners": 2
    }
  }'
```

**🆕 Test Telegram Announcements:**
```bash
# Check Telegram bot status
curl "http://localhost:3000/api/test-vrf?testTelegram=false"

# Run full announcement sequence (if bot configured)
curl "http://localhost:3000/api/test-vrf?testTelegram=true"

# Test specific Telegram features
curl -X POST http://localhost:3000/api/test-vrf \
  -H "Content-Type: application/json" \
  -d '{"testType": "telegram_test", "params": {"fullTest": true}}'
```

## 🌐 **Browser Testing**

Open these URLs in your browser:

- **Database Status**: http://localhost:3000/api/init-db
- **VRF Tests**: http://localhost:3000/api/test-vrf  
- **Full Raffle Test**: http://localhost:3000/api/test-vrf?fullRaffle=true

## 🎮 **What You're Testing**

### **VRF Features Implemented:**
1. **Switchboard VRF Client** - Realistic VRF simulation
2. **Daily Seed Rotation** - Automatic VRF-based seed management
3. **Commit-Reveal Scheme** - Secure game seed generation
4. **Raffle Winner Selection** - VRF-powered fair draws
5. **Score Signing** - Ed25519 signatures with VRF context
6. **Bot Detection** - Pattern analysis with VRF timing
7. **🆕 Telegram Announcements** - Suspenseful winner reveals
8. **Audit Trails** - Merkle proofs for verification

### **Database Features:**
- ✅ **In-Memory Test DB** - No external database required
- ✅ **Auto-Initialization** - Loads sample data automatically
- ✅ **Supabase Compatibility** - Same API as production
- ✅ **Real Data Simulation** - Realistic wallet addresses and scores

## 📊 **Expected Test Results**

When you run the tests, you should see:

```json
{
  "success": true,
  "summary": {
    "testsRun": 8,
    "testsPass": 8,
    "totalEstimatedCost": 0.000025,
    "environment": "development",
    "vrfType": "Switchboard Test Implementation"
  },
  "results": [
    {
      "name": "VRF Manager Initialization",
      "status": "success",
      "data": {
        "initialized": true,
        "estimatedCost": 0.000025
      }
    }
    // ... more test results
  ]
}
```

## 🔧 **Database Management**

### **Reset Test Data:**
```bash
curl -X POST http://localhost:3000/api/init-db \
  -H "Content-Type: application/json" \
  -d '{"action": "reset"}'
```

### **Clear All Data:**
```bash
curl -X POST http://localhost:3000/api/init-db \
  -H "Content-Type: application/json" \
  -d '{"action": "clear"}'
```

### **Get Table Status:**
```bash
curl -X POST http://localhost:3000/api/init-db \
  -H "Content-Type: application/json" \
  -d '{"action": "status"}'
```

## 🛠️ **Production Setup**

When ready for production, just add environment variables:

```bash
# .env.local (production)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
VRF_QUEUE=your_switchboard_vrf_queue
SOLANA_RPC=https://api.mainnet-beta.solana.com
SCORE_SIGNING_PRIVATE_KEY=your_ed25519_private_key

# Optional: Telegram Announcements
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=@your_channel_name
TELEGRAM_ANNOUNCEMENTS_ENABLED=true
```

The system will automatically switch from test database to production Supabase! 

**🆕 For Telegram setup**, see: [TELEGRAM_BOT_SETUP.md](./TELEGRAM_BOT_SETUP.md)

## 🐛 **Troubleshooting**

**Port 3000 in use?**
```bash
# Next.js will automatically try ports 3001, 3002, etc.
```

**Missing dependencies?**
```bash
pnpm install  # or npm install
```

**Database errors?**
```bash
# Visit http://localhost:3000/api/init-db to check status
# Use POST with {"action": "reset"} to reset
```

**VRF tests failing?**
```bash
# Check console logs in the terminal where you started the server
# VRF tests run independently and fall back gracefully
```

## 🎯 **Ready to Test!**

Your VRF implementation is now ready for testing with a complete local setup. No external databases, no blockchain costs, just realistic VRF functionality testing! 🚀 