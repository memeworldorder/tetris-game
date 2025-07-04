# GameFi Modular Architecture - Quick Reference

## 🏗️ Repository Map

```
gamefi-platform/
├── gamefi-core-api/          → Lives, Sessions, Payments
├── gamefi-raffle-engine/     → Raffles, Lottery, VRF
├── gamefi-social-bots/       → Telegram, Twitter, Discord
├── gamefi-tetris/            → Tetris Game
├── gamefi-asteroid-blaster/  → Asteroid Blaster Game
├── gamefi-sdk/               → JS/TS Integration SDK
└── gamefi-admin-dashboard/   → Admin Interface
```

## 🔌 Core API Endpoints

### Lives Management
```typescript
POST   /api/lives/purchase       // Buy lives with MWOR
POST   /api/lives/claim-daily    // Claim free daily life
GET    /api/lives/balance        // Get current balance
```

### Game Sessions
```typescript
POST   /api/game/start           // Start new session
POST   /api/game/verify          // Verify game moves
POST   /api/game/end             // Submit final score
GET    /api/game/session/:id     // Get session details
```

### Authentication (Supabase)
```typescript
POST   /api/auth/wallet          // Wallet-based auth
GET    /api/auth/session         // Get current session
POST   /api/auth/logout          // End session
```

## 🎲 Raffle Engine API

```typescript
POST   /api/raffle/create        // Create new raffle
GET    /api/raffle/current       // Get active raffle
POST   /api/raffle/enter         // Enter with tickets
GET    /api/raffle/history       // Past raffles
GET    /api/raffle/winners/:id   // Get winners
```

## 🤖 Social Bots Events

### Subscribed Events
```typescript
'game.score.high'         → Post high score achievement
'raffle.winner.selected'  → Announce raffle winners
'user.milestone.reached'  → Celebrate milestones
'daily.leaderboard'       → Post daily leaders
```

## 📦 SDK Integration

### Basic Game Integration
```javascript
import { GameFiSDK } from '@gamefi/sdk';

const gamefi = new GameFiSDK({
  apiUrl: 'https://api.gamefi.com',
  gameId: 'your-game-id'
});

// Initialize
await gamefi.init();

// Start game
const session = await gamefi.startSession();

// Submit score
await gamefi.submitScore({
  score: 150000,
  moves: gameMovesArray,
  sessionId: session.id
});
```

## 🔄 Supabase Edge Functions

### VRF Functions
```typescript
POST   /functions/v1/vrf-request   // Request randomness
GET    /functions/v1/vrf-status    // Check status
POST   /functions/v1/vrf-callback  // Switchboard callback
```

### Usage Example
```javascript
// Request VRF
const response = await fetch('https://xxx.supabase.co/functions/v1/vrf-request', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    purpose: 'raffle_draw',
    metadata: { raffleId: '123' }
  })
});
```

## 📊 Event Flow Patterns

### Score Submission Flow
```
1. Game → Core API (submit score)
2. Core API → Validate & Store
3. Core API → Publish Event
4. Raffle Engine → Calculate tickets
5. Social Bots → Prepare announcements
```

### Raffle Drawing Flow
```
1. Scheduler → Raffle Engine (trigger draw)
2. Raffle Engine → Supabase VRF (request random)
3. Supabase VRF → Switchboard Oracle
4. Switchboard → Supabase VRF (callback)
5. Supabase VRF → Raffle Engine (result)
6. Raffle Engine → Select winners
7. Raffle Engine → Publish Event
8. Social Bots → Announce winners
```

## 🔐 Environment Variables

### Core API
```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
SOLANA_RPC_URL=
MWOR_TOKEN_ADDRESS=
```

### Raffle Engine
```env
DATABASE_URL=
REDIS_URL=
CORE_API_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

### Games
```env
GAMEFI_API_URL=
GAMEFI_SDK_KEY=
GAME_ID=
```

## 🚀 Deployment Commands

```bash
# Run migration script
./migrate-to-modular.sh

# Deploy individual services
cd gamefi-core-api && vercel --prod
cd gamefi-raffle-engine && wrangler publish
cd gamefi-social-bots && heroku deploy

# Deploy Supabase functions
supabase functions deploy vrf-request
supabase functions deploy vrf-callback
supabase functions deploy vrf-status

# Run all services locally
docker-compose up
```

## 📈 Monitoring Endpoints

### Health Checks
```
GET /health              → All services
GET /metrics             → Prometheus metrics
GET /api/status          → Detailed status
```

### Service Discovery
```
GET /api/services        → List all services
GET /api/services/:name  → Service details
```

## 🔗 Inter-Service Auth

### API Key Header
```
X-API-Key: service-specific-key
```

### Service Token (JWT)
```
Authorization: Bearer <service-jwt>
```

## 📝 Database Schemas

### Core Tables (Supabase)
- `users` - User accounts
- `game_sessions` - Active/completed sessions
- `lives_transactions` - Lives history
- `payments` - Payment records

### Raffle Tables
- `raffles` - Raffle configurations
- `raffle_entries` - User entries
- `raffle_winners` - Selected winners
- `vrf_requests` - VRF request tracking

## 🎮 Game Integration Checklist

- [ ] Install GameFi SDK
- [ ] Configure API endpoint
- [ ] Implement wallet connection
- [ ] Add session management
- [ ] Integrate score submission
- [ ] Add lives display
- [ ] Test anti-cheat validation
- [ ] Deploy to production

## 🆘 Common Issues

### CORS Errors
```javascript
// Add to Supabase Edge Function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

### Rate Limiting
```javascript
// Implement exponential backoff
await retry(apiCall, {
  retries: 3,
  factor: 2,
  minTimeout: 1000
});
```

### VRF Timeout
```javascript
// Increase timeout for VRF
const result = await vrfClient.waitForRandomness(requestId, 60000); // 60s
```