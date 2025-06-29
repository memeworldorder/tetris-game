# 🚀 COMPLETE SUPABASE EDGE FUNCTIONS SETUP GUIDE

## 🎯 Your GameFi Platform is Ready!

Your Supabase credentials have been configured and all edge functions are prepared for deployment.

## 📋 Quick Setup Checklist

### 1. Environment Variables
Create a `.env.local` file in your project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://qtwmykpyhcvfavjgncty.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTU2MDcsImV4cCI6MjA2NjYzMTYwN30.lhpqOaxVxadQamtHT_vx3-JyoKyThV3uMGMLvOMHRyU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA1NTYwNywiZXhwIjoyMDY2NjMxNjA3fQ.fwu/6tRriMFnAYMa2UH6HoKu2uMdCU8P8wScHcX3Us0kFbOl0pfQ0vjPUM34XRyRu82LZ0dVCmAiXUJjlVpC2A

# Database Configuration
DATABASE_URL=postgresql://postgres.qtwmykpyhcvfavjgncty:8IOBadTkqWjp6zfv@aws-0-us-west-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.qtwmykpyhcvfavjgncty:8IOBadTkqWjp6zfv@aws-0-us-west-1.pooler.supabase.com:5432/postgres

# GameFi Configuration
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_GAME_NAME=TetrisWar
NEXT_PUBLIC_DAILY_LIVES=5
NEXT_PUBLIC_LIFE_COST_SOL=0.001

# JWT Secret for edge functions
JWT_SECRET=gamefi-tetris-production-secret-key-2024
```

### 2. Deploy Edge Functions (Choose One Method)

#### Option A: Automated Setup (Recommended)
```bash
# Make scripts executable
chmod +x setup-supabase-functions.sh
chmod +x test-edge-functions.sh

# Run automated setup
./setup-supabase-functions.sh
```

#### Option B: Manual CLI Setup
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref qtwmykpyhcvfavjgncty

# Deploy functions
supabase functions deploy handle-game-start
supabase functions deploy handle-game-end
supabase functions deploy daily-reset
supabase functions deploy verify-wallet

# Set secrets
supabase secrets set JWT_SECRET="gamefi-tetris-production-secret-key-2024"
supabase secrets set SUPABASE_URL="https://qtwmykpyhcvfavjgncty.supabase.co"
supabase secrets set SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTU2MDcsImV4cCI6MjA2NjYzMTYwN30.lhpqOaxVxadQamtHT_vx3-JyoKyThV3uMGMLvOMHRyU"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA1NTYwNywiZXhwIjoyMDY2NjMxNjA3fQ.fwu/6tRriMFnAYMa2UH6HoKu2uMdCU8P8wScHcX3Us0kFbOl0pfQ0vjPUM34XRyRu82LZ0dVCmAiXUJjlVpC2A"
```

### 3. Test Your Functions
```bash
# Run comprehensive tests
./test-edge-functions.sh

# Or test individual functions manually
curl -X POST "https://qtwmykpyhcvfavjgncty.supabase.co/functions/v1/handle-game-start" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTU2MDcsImV4cCI6MjA2NjYzMTYwN30.lhpqOaxVxadQamtHT_vx3-JyoKyThV3uMGMLvOMHRyU" \
  -d '{"wallet_address":"FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai","game_type":"tetris"}'
```

### 4. Start Your Application
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## 🎮 Your Edge Functions

### 1. handle-game-start
**URL:** `https://qtwmykpyhcvfavjgncty.supabase.co/functions/v1/handle-game-start`
- Validates user lives
- Deducts a life for game start
- Creates game session with anti-cheat measures
- Returns session ID for game tracking

### 2. handle-game-end
**URL:** `https://qtwmykpyhcvfavjgncty.supabase.co/functions/v1/handle-game-end`
- Validates game session
- Performs anti-cheat score validation
- Updates user scores and achievements
- Updates leaderboards
- Processes rewards

### 3. daily-reset
**URL:** `https://qtwmykpyhcvfavjgncty.supabase.co/functions/v1/daily-reset`
- Resets daily lives for all users
- Processes daily bonuses
- Updates login streaks
- Cleans old game sessions
- **Note:** Use service role key for this function

### 4. verify-wallet
**URL:** `https://qtwmykpyhcvfavjgncty.supabase.co/functions/v1/verify-wallet`
- Verifies Solana wallet signatures using ed25519
- Creates/updates user accounts
- Issues JWT tokens for authentication
- Handles wallet-based login

## 🔧 Integration Examples

### Frontend Game Integration
```typescript
import { supabaseEdgeFunctions } from '@/lib/supabase-edge-functions'

// Start a game
const gameSession = await supabaseEdgeFunctions.startGame({
  wallet_address: "your-wallet-address",
  game_type: "tetris"
})

// End the game
const gameResult = await supabaseEdgeFunctions.endGame({
  session_id: gameSession.session_id,
  wallet_address: "your-wallet-address",
  score: 12345,
  lines_cleared: 10,
  level_reached: 3
})
```

### Wallet Verification
```typescript
// Verify wallet signature
const authResult = await supabaseEdgeFunctions.verifyWallet({
  wallet_address: "your-wallet-address",
  signature: "signed-message",
  message: "verification-message"
})
```

## 🏗️ Database Schema

Your Supabase database includes 50+ tables covering:
- **User Management:** users, user_lives, user_achievements, user_stats
- **Game Engine:** game_sessions, game_scores, leaderboards
- **Rewards System:** rewards, user_rewards, achievements
- **Payment Processing:** transactions, payments, wallet_balances
- **Gaming Features:** raffles, tournaments, challenges
- **Analytics:** user_analytics, game_analytics, performance_metrics
- **Social Features:** social_connections, community_posts
- **Admin Tools:** admin_users, system_config, audit_logs

## 🔒 Security Features

✅ **Row Level Security (RLS)** enabled on all tables
✅ **JWT-based authentication** for secure API access
✅ **Anti-cheat measures** in game session validation
✅ **Wallet signature verification** using ed25519
✅ **Rate limiting** and input validation
✅ **Audit logging** for all critical operations

## 📊 Monitoring & Debugging

### View Function Logs
```bash
# View logs for specific function
supabase functions logs handle-game-start

# View all function logs
supabase functions logs
```

### Check Function Status
```bash
# List deployed functions
supabase functions list

# Check function details
supabase functions get handle-game-start
```

## 🚨 Troubleshooting

### Common Issues

1. **Function deployment fails**
   - Check if you're logged in: `supabase login`
   - Verify project link: `supabase link --project-ref qtwmykpyhcvfavjgncty`

2. **Database connection errors**
   - Verify your DATABASE_URL in `.env.local`
   - Check if database schema is properly set up

3. **Authentication errors**
   - Ensure SUPABASE_ANON_KEY is correctly set
   - For admin functions, use SUPABASE_SERVICE_ROLE_KEY

4. **CORS errors**
   - Functions include proper CORS headers
   - Check browser console for specific errors

### Getting Help

- **Function Logs:** `supabase functions logs <function-name>`
- **Database Logs:** Check Supabase dashboard
- **Real-time Monitoring:** Use Supabase dashboard analytics

## 🎉 Next Steps

1. **Deploy Functions:** Run `./setup-supabase-functions.sh`
2. **Test Everything:** Run `./test-edge-functions.sh`
3. **Start Development:** `npm run dev`
4. **Monitor Performance:** Use Supabase dashboard
5. **Scale Up:** Add more edge functions as needed

## 📈 Production Checklist

- [ ] All edge functions deployed successfully
- [ ] Database schema properly set up
- [ ] Environment variables configured
- [ ] Test script passes all tests
- [ ] RLS policies are active
- [ ] Monitoring is set up
- [ ] Backup strategy in place

Your GameFi Tetris platform is now ready for production! 🚀 