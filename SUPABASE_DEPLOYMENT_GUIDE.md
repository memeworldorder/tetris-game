# 🚀 SUPABASE EDGE FUNCTIONS DEPLOYMENT GUIDE

This guide shows you how to deploy and use all the GameFi Tetris Supabase Edge Functions.

## 📋 Prerequisites

1. **Supabase CLI installed**
   ```bash
   npm install -g supabase
   ```

2. **Supabase project setup**
   - Project URL: `https://qtwmykpyhcvfavjgncty.supabase.co`
   - Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. **Environment variables configured**
   ```bash
   # .env.local
   NEXT_PUBLIC_SUPABASE_URL=https://qtwmykpyhcvfavjgncty.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   JWT_SECRET=your-super-secret-jwt-key-change-this
   ```

## 🛠️ Setup & Deployment

### 1. Initialize Supabase in your project
```bash
cd tetris-game
supabase init
supabase login
supabase link --project-ref qtwmykpyhcvfavjgncty
```

### 2. Deploy all edge functions
```bash
# Deploy individual functions
supabase functions deploy handle-game-start
supabase functions deploy handle-game-end
supabase functions deploy daily-reset
supabase functions deploy verify-wallet

# Or deploy all at once
supabase functions deploy
```

### 3. Set environment secrets
```bash
supabase secrets set JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
supabase secrets set SUPABASE_URL="https://qtwmykpyhcvfavjgncty.supabase.co"
supabase secrets set SUPABASE_ANON_KEY="your-anon-key"
```

## 📚 Available Edge Functions

### 🎮 Game Functions

#### **1. handle-game-start**
**URL:** `https://qtwmykpyhcvfavjgncty.supabase.co/functions/v1/handle-game-start`

**Purpose:** Start a new Tetris game session, validate lives, deduct a life

**Usage:**
```typescript
import { gameAPI } from '@/lib/supabase-edge-functions'

const session = await gameAPI.startGame('your-wallet-address')
console.log(`Game started! Session: ${session.session_id}`)
```

**Request:**
```json
{
  "wallet_address": "FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai",
  "game_type": "tetris"
}
```

**Response:**
```json
{
  "success": true,
  "session_id": "uuid-here",
  "remaining_lives": {
    "free_today": 2,
    "bonus_today": 1,
    "paid_bank": 5
  },
  "message": "Game started successfully"
}
```

#### **2. handle-game-end**
**URL:** `https://qtwmykpyhcvfavjgncty.supabase.co/functions/v1/handle-game-end`

**Purpose:** Complete game session, validate score, check achievements

**Usage:**
```typescript
const result = await gameAPI.endGame({
  sessionId: 'session-uuid',
  walletAddress: 'wallet-address',
  score: 45000,
  linesCleared: 15
})

if (result.personal_best) {
  console.log('🎉 New personal best!')
}
```

#### **3. daily-reset**
**URL:** `https://qtwmykpyhcvfavjgncty.supabase.co/functions/v1/daily-reset`

**Purpose:** Reset daily lives, process bonuses (cron job)

**Cron Setup:**
```sql
-- In Supabase Dashboard > Database > Extensions > pg_cron
SELECT cron.schedule('daily-reset', '0 0 * * *', 'SELECT net.http_post(url:=''https://qtwmykpyhcvfavjgncty.supabase.co/functions/v1/daily-reset'', headers:=''{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'', body:=''{}''::jsonb) as request_id;');
```

#### **4. verify-wallet**
**URL:** `https://qtwmykpyhcvfavjgncty.supabase.co/functions/v1/verify-wallet`

**Purpose:** Verify Solana wallet signatures, authenticate users

**Usage:**
```typescript
// Client-side wallet verification
const message = `Sign this message to verify wallet ownership: ${Date.now()}`
const signature = await wallet.signMessage(new TextEncoder().encode(message))

const response = await fetch('https://qtwmykpyhcvfavjgncty.supabase.co/functions/v1/verify-wallet', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    wallet_address: wallet.publicKey.toString(),
    signature: bs58.encode(signature),
    message,
    timestamp: Date.now()
  })
})

const { auth_token, is_new_user } = await response.json()
```

## 🔧 Client Integration

### Install the client helper
```typescript
// lib/supabase-edge-functions.ts is already created
import { gameAPI, gameUtils } from '@/lib/supabase-edge-functions'
```

### Example React component usage
```typescript
// components/game-integration-example.tsx is already created
import { GameIntegrationExample } from '@/components/game-integration-example'

export default function GamePage() {
  return (
    <GameIntegrationExample walletAddress="your-wallet-address" />
  )
}
```

## 🎯 Testing Edge Functions

### Test locally
```bash
# Start local Supabase
supabase start

# Serve functions locally
supabase functions serve

# Test function
curl -X POST http://localhost:54321/functions/v1/handle-game-start \
  -H "Content-Type: application/json" \
  -d '{"wallet_address":"test-wallet","game_type":"tetris"}'
```

### Test production
```bash
# Test game start
curl -X POST https://qtwmykpyhcvfavjgncty.supabase.co/functions/v1/handle-game-start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"wallet_address":"FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai","game_type":"tetris"}'
```

## 🔐 Security Features

### Anti-Cheat Measures
- **Minimum game duration:** 10 seconds
- **Maximum score limits:** 999,999 points
- **Session validation:** Must exist and be active
- **Wallet ownership:** Signature verification

### Authentication
- **JWT tokens:** 24-hour expiration
- **Signature verification:** ed25519 cryptography
- **Replay protection:** 5-minute timestamp window
- **Rate limiting:** Built into Supabase

## 📊 Database Schema Required

Make sure these tables exist in your Supabase database:

```sql
-- Core tables (from supabase-complete-setup.sql)
- user_lives
- user_profiles  
- user_stats
- game_sessions
- daily_leaderboard
- auth_sessions
```

## 🚨 Error Handling

All functions return consistent error responses:

```json
{
  "error": "Descriptive error message",
  "details": "Additional error details if available"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad request (validation errors)
- `401` - Unauthorized
- `403` - Forbidden
- `500` - Server error

## 🔄 Monitoring & Logs

### View function logs
```bash
supabase functions logs handle-game-start
supabase functions logs handle-game-end
```

### Monitor in dashboard
- Go to Supabase Dashboard
- Navigate to Edge Functions
- View logs, metrics, and performance

## 🎮 Integration Examples

### Complete game flow
```typescript
// 1. Verify wallet
const auth = await verifyWallet(walletAddress, signature, message)

// 2. Start game
const session = await gameAPI.startGame(walletAddress)

// 3. Play game (your Tetris logic here)
// ...

// 4. End game
const result = await gameAPI.endGame({
  sessionId: session.session_id,
  walletAddress,
  score: finalScore
})

// 5. Show results
console.log('Achievements:', result.achievements)
if (result.personal_best) {
  showPersonalBestModal()
}
```

## 🛡️ Production Checklist

- [ ] Set strong JWT_SECRET in production
- [ ] Enable RLS policies on all tables
- [ ] Set up proper CORS headers
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerts
- [ ] Test all edge functions thoroughly
- [ ] Set up daily reset cron job
- [ ] Configure backup strategies

## 🆘 Troubleshooting

### Common issues:

1. **Functions not deploying**
   ```bash
   # Check Supabase CLI version
   supabase --version
   
   # Re-link project
   supabase link --project-ref qtwmykpyhcvfavjgncty
   ```

2. **CORS errors**
   - Ensure corsHeaders are set in all functions
   - Check domain whitelist in Supabase dashboard

3. **Database connection errors**
   - Verify environment variables
   - Check RLS policies
   - Ensure tables exist

4. **Authentication failures**
   - Verify JWT_SECRET is set
   - Check signature verification logic
   - Ensure message format is correct

---

🎉 **You're all set!** Your GameFi Tetris platform now has production-ready edge functions with proper authentication, anti-cheat measures, and comprehensive game session management. 