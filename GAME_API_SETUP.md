# Game API Microservice Setup Guide

This document explains how to set up and use the Game API microservice that was just implemented for your Tetris game.

## Overview

The Game API microservice is a drop-in layer between your existing Tetris frontend and Supabase/Solana. It provides:

- **Lives management** with free, bonus, and paid lives
- **Payment processing** via MWOR token
- **Server-authoritative scoring** with anti-cheat measures
- **Daily leaderboards** with Merkle proof system
- **Rate limiting** and anti-abuse measures

## File Structure

```
app/api/
├── claimDaily/route.ts      # Daily life claiming endpoint
├── buyLife/route.ts         # Life purchase endpoint
├── endRound/route.ts        # Score submission with validation
├── leaderboard/daily/route.ts # Daily leaderboard
├── hel/trx/route.ts         # Helius webhook for payments
└── resetMidnight/route.ts   # Daily reset CRON job

lib/
├── supabase.ts              # Supabase client & types
├── solana-utils.ts          # Solana utilities & pricing
└── config.ts                # Centralized configuration

scripts/
└── supabase-schema.sql      # Database schema
```

## Installation Steps

### 1. Install Dependencies

```bash
pnpm install
```

The required dependencies have been added to `package.json`:
- `@supabase/supabase-js` - Supabase client
- `@solana/spl-token` - SPL token utilities
- `node-cron` - CRON job scheduling
- `tweetnacl` - Cryptographic utilities

### 2. Set Up Supabase Database

1. Create a new Supabase project or use existing one
2. Run the SQL schema from `scripts/supabase-schema.sql` in your Supabase SQL editor
3. This creates three tables: `lives`, `payments`, and `plays`

### 3. Configure Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Solana Configuration
SOLANA_RPC=https://api.mainnet-beta.solana.com
MWOR_MINT=your_mwor_token_mint_address
MWORGOV_MINT=your_mworgov_token_mint_address
PRICE_ORACLE_FEED=your_switchboard_feed_address

# VRF Configuration
VRF_QUEUE=your_switchboard_vrf_queue_address
TEMP_ADDR_DERIVE_SEED=lifebank

# Webhook Configuration
HELIUS_WEBHOOK_SECRET=your_helius_webhook_secret

# Rate Limiting & Game Rules
FREE_LIFE_LIMIT_PER_IP=1
PAID_LIFE_USD_CHEAP=0.03
PAID_LIFE_USD_MID=0.09
PAID_LIFE_USD_HIGH=0.27
PAID_LIFE_CAP=10
BONUS_DIVISOR=50000
BONUS_CAP=40

# CRON & Security
CRON_SECRET=your_secure_cron_secret_token
NODE_ENV=development
```

### 4. Set Up Helius Webhook

1. Go to your Helius dashboard
2. Create a new webhook pointing to: `https://yourdomain.com/api/hel/trx`
3. Configure it to track MWOR token transfers
4. Set the webhook secret in your environment variables

### 5. Set Up CRON Job

Set up a daily CRON job to call the reset endpoint:

```bash
# Add this to your server's crontab or use a service like Vercel Cron
0 0 * * * curl -X POST https://yourdomain.com/api/resetMidnight -H "Authorization: Bearer your_cron_secret"
```

## API Endpoints

### POST /api/claimDaily
Claims daily free life and calculates bonus lives.

**Request:**
```json
{
  "wallet": "wallet_address",
  "deviceId": "device_identifier", 
  "ip": "client_ip_address"
}
```

**Response:**
```json
{
  "free": 1,
  "bonus": 5,
  "paid_bank": 3,
  "total": 9
}
```

### POST /api/buyLife
Initiates a life purchase transaction.

**Request:**
```json
{
  "wallet": "wallet_address"
}
```

**Response:**
```json
{
  "payAddr": "temp_payment_address",
  "priceMWOR": {
    "cheap": 120,
    "mid": 360,
    "high": 1080
  },
  "lives": {
    "cheap": 1,
    "mid": 3,
    "high": 10
  },
  "expiresAt": 1640995200000,
  "remainingPaidLives": 7
}
```

### POST /api/endRound
Submits game moves for server-side validation and scoring.

**Request:**
```json
{
  "wallet": "wallet_address",
  "moves": [
    {
      "type": "move",
      "direction": "left",
      "timestamp": 1640995200000
    },
    {
      "type": "rotate",
      "rotation": "cw",
      "timestamp": 1640995201000
    }
  ],
  "seed": "game_seed_string"
}
```

**Response:**
```json
{
  "status": "success",
  "score": 1250,
  "playId": 123,
  "seedHash": "hash_of_seed",
  "remainingLives": 5
}
```

### GET /api/leaderboard/daily?limit=10
Gets the daily leaderboard.

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "wallet": "wallet_address",
      "score": 5000,
      "timestamp": "2023-12-31T12:00:00Z",
      "displayWallet": "ABC1...XYZ9"
    }
  ],
  "stats": {
    "totalPlays": 150,
    "averageScore": 1250,
    "resetTime": "2023-12-31T00:00:00Z",
    "nextReset": "2024-01-01T00:00:00Z"
  }
}
```

## Integration with Frontend

### Update Your Game Logic

1. **Replace old lives API calls** with the new endpoints:
   ```typescript
   // Old: /api/user/lives
   // New: /api/claimDaily
   ```

2. **Update payment flow**:
   ```typescript
   // Step 1: Get payment address
   const response = await fetch('/api/buyLife', {
     method: 'POST',
     body: JSON.stringify({ wallet: walletAddress })
   })
   
   // Step 2: User sends MWOR to the returned address
   // Step 3: Webhook automatically credits lives
   ```

3. **Update game end logic**:
   ```typescript
   // Send moves array instead of just final score
   const response = await fetch('/api/endRound', {
     method: 'POST',
     body: JSON.stringify({
       wallet: walletAddress,
       moves: gameMovesArray,
       seed: gameSeed
     })
   })
   ```

### Anti-Cheat Integration

1. **Record all moves** during gameplay:
   ```typescript
   const moves: GameMove[] = []
   
   function onPlayerMove(type: string, direction?: string) {
     moves.push({
       type,
       direction,
       timestamp: Date.now()
     })
   }
   ```

2. **Generate deterministic seed** at game start:
   ```typescript
   const gameSeed = `${walletAddress}_${Date.now()}_${Math.random()}`
   ```

## Security Features

- **Rate limiting** by IP and device fingerprint
- **Server-side game simulation** to prevent score manipulation
- **Webhook signature verification** for payment processing
- **Merkle proofs** for leaderboard integrity
- **Daily resets** to prevent accumulation exploits

## Monitoring & Maintenance

### Logs to Monitor

- Payment processing errors
- Rate limit violations
- Invalid move sequences
- Webhook failures
- CRON job execution

### Regular Maintenance

1. **Monitor payment processing** - ensure webhooks are working
2. **Check rate limiting** - adjust limits if needed
3. **Review leaderboard integrity** - verify Merkle roots
4. **Database cleanup** - archive old plays periodically

## Troubleshooting

### Common Issues

1. **"Missing Supabase environment variables"**
   - Ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set

2. **"Payment not credited"**
   - Check Helius webhook configuration
   - Verify MWOR_MINT address is correct

3. **"Invalid move sequence detected"**
   - Ensure moves are recorded in chronological order
   - Check that timestamps are increasing

4. **"Daily free life limit exceeded"**
   - This is expected behavior for anti-abuse
   - Users can still buy paid lives

### Testing

Use the development endpoints to test functionality:

```bash
# Test daily claim
curl -X POST http://localhost:3000/api/claimDaily \
  -H "Content-Type: application/json" \
  -d '{"wallet":"test","deviceId":"test","ip":"127.0.0.1"}'

# Test leaderboard
curl http://localhost:3000/api/leaderboard/daily?limit=5

# Test reset (development only)
curl http://localhost:3000/api/resetMidnight
```

## Next Steps

1. Deploy to production with proper environment variables
2. Set up monitoring and alerting
3. Test payment flow end-to-end
4. Configure CRON job for daily resets
5. Update frontend to use new API endpoints

The microservice is now ready to handle your Tetris game's backend operations with full token sink mechanics and anti-cheat measures! 