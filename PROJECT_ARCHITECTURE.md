# GameFi P2E Backend Architecture Document

## Project Overview

**Vision**: A completely modular backend GameFi Play-to-Earn system that can be "dropped into" any HTML canvas or JavaScript in-browser game to transform it into a Web3-capable gaming experience.

**Current Status**: Partially implemented Tetris game with Web3 features
**Target**: Fully modular, game-agnostic P2E platform

## System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend SDK  │    │  Game Backend   │    │  Blockchain     │
│   (Any Game)    │◄──►│    (API)        │◄──►│   (Solana)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                        ▲
                              ▼                        │
                       ┌─────────────────┐             │
                       │   Database      │             │
                       │  (PostgreSQL)   │             │
                       └─────────────────┘             │
                              │                        │
                              ▼                        │
                  ┌─────────────────────────────────────┼─────────────────┐
                  │                     │               │                 │
                  ▼                     ▼               │                 ▼
          ┌─────────────────┐    ┌─────────────────┐    │    ┌─────────────────┐
          │ Social Networks │    │ Admin Dashboard │    │    │   Analytics     │
          │   (X, Telegram) │    │   (Web UI)      │────┘    │   (Real-time)   │
          └─────────────────┘    └─────────────────┘         └─────────────────┘
```

### Core Components

#### 1. **Game SDK Layer** (To Be Built)
- **Purpose**: Drop-in JavaScript SDK for any HTML5/Canvas game
- **Responsibilities**:
  - Wallet connection management
  - Lives system integration
  - Score submission with anti-cheat
  - Leaderboard display components
  - Payment flows

#### 2. **API Gateway** (Existing - Needs Modularization)
- **Purpose**: Centralized backend services
- **Current Endpoints**:
  - `/api/claimDaily` - Daily life claiming
  - `/api/buyLife` - Life purchases
  - `/api/endRound` - Score submission & validation
  - `/api/leaderboard/daily` - Daily rankings
  - `/api/payments/process` - Payment processing
  - `/api/game/start` & `/api/game/end` - Game session management

#### 3. **Lives Management System** (Existing - Mature)
- **Free Lives**: 1 per day per IP/device
- **Bonus Lives**: Score-based calculation (score/50000, max 40)
- **Paid Lives**: MWOR token purchases (3 tiers: $0.03, $0.09, $0.27)
- **Lives Bank**: Up to 10 paid lives storage

#### 4. **Anti-Cheat Engine** (Existing - Good)
- Server-side game simulation
- Move sequence validation
- Deterministic seeding
- Rate limiting by IP/device
- Merkle proof verification

#### 5. **Leaderboard System** (Existing - Needs Enhancement)
- **Current**: Daily leaderboards only
- **Needed**: Weekly, monthly, custom period support
- **Features**: Top 25% qualification, tiered ticket distribution

#### 6. **Raffle/Lottery Engine** (Existing - Advanced)
- VRF-based random number generation (Switchboard)
- Tiered ticket distribution:
  - Rank 1: 25 tickets
  - Ranks 2-5: 15 tickets each
  - Ranks 6-10: 10 tickets each
  - Remaining qualified: 1 ticket each
- Merkle tree verification
- Winner selection algorithm

#### 7. **Payment Processing** (Existing - Solid)
- MWOR token integration
- Helius webhook processing
- Multi-tier pricing
- Transaction verification

#### 8. **Social Announcements** (Partial - Telegram Only)
- **Existing**: Telegram bot integration
- **Needed**: X/Twitter API integration
- **Features**: Winner announcements, leaderboard updates

#### 9. **Admin Dashboard** (To Be Built - Critical)
- **Purpose**: Web-based administration and analytics interface
- **Core Features**:
  - Real-time analytics dashboard
  - User metrics and engagement tracking
  - Purchase and revenue analytics
  - Exportable business reports
  - Game configuration management
  - Raffle and leaderboard settings
  - Live system monitoring
- **Multi-tenant Support**: Manage multiple games from single interface

### Database Schema

#### Core Tables (Existing)
```sql
-- User management
users (wallet_address, total_lives, last_life_lost, created_at, updated_at)

-- Payment tracking  
payments (wallet_address, transaction_hash, amount_sol, amount_mwor, lives_added)

-- Game sessions
game_sessions (wallet_address, score, level, lines_cleared, started_at, ended_at)

-- Anti-cheat validation
plays (wallet, score, moves_hash, seed_hash, merkle_proof, created_at)

-- Raffle system
raffle_results (date, winners, vrf_seed, merkle_root, total_tickets)
qualified_wallets (date, wallet_address, rank, score, tickets, merkle_proof)
```

#### Proposed Additional Tables
```sql
-- Game configuration
game_configs (
  game_id, 
  name, 
  lives_config, 
  scoring_rules, 
  leaderboard_config,
  raffle_config,
  created_at
)

-- Multi-game support
game_sessions_v2 (
  session_id,
  game_id,
  wallet_address,
  score,
  game_data,
  validation_hash,
  created_at
)

-- Enhanced leaderboards
leaderboards (
  period_type, -- daily, weekly, monthly
  period_start,
  period_end,
  game_id,
  wallet_address,
  score,
  rank,
  tickets_earned
)

-- Admin dashboard and analytics
admin_users (
  admin_id,
  username,
  email,
  role, -- super_admin, game_admin, analytics_viewer
  permissions,
  created_at,
  last_login
)

-- Analytics events tracking
analytics_events (
  event_id,
  game_id,
  wallet_address,
  event_type, -- game_start, game_end, payment, life_purchase, etc.
  event_data,
  timestamp,
  session_id
)

-- Aggregated analytics for fast queries
analytics_daily (
  date,
  game_id,
  total_users,
  total_games_played,
  total_revenue,
  avg_session_duration,
  top_score,
  lives_purchased,
  raffle_tickets_distributed
)

-- System monitoring and alerts
system_alerts (
  alert_id,
  alert_type,
  severity,
  message,
  metadata,
  resolved,
  created_at,
  resolved_at
)
```

## Modular Design Principles

### 1. **Game Agnostic Core**
- Abstract game logic from P2E mechanics
- Configurable scoring systems
- Pluggable validation rules
- Generic move/action recording

### 2. **Configuration-Driven**
- Game-specific settings via database
- Runtime configuration updates
- A/B testing capabilities
- Multi-tenant support

### 3. **SDK Architecture**
```javascript
// Example integration for any game
import { GameFiSDK } from '@gamefi/sdk'

const gamefi = new GameFiSDK({
  gameId: 'my-puzzle-game',
  rpcEndpoint: 'https://api.gamefi.com',
  walletAdapter: solanaWalletAdapter
})

// Initialize P2E features
await gamefi.initialize()

// Start game session
const session = await gamefi.startGame()

// Submit score with validation data
await gamefi.submitScore({
  score: 1250,
  validationData: gameMovesArray,
  sessionId: session.id
})
```

### 4. **Microservices Architecture**
- Lives Service
- Scoring Service  
- Leaderboard Service
- Raffle Service
- Payment Service
- Social Service

## Integration Patterns

### For Game Developers

#### Option 1: Full SDK Integration
```html
<script src="https://cdn.gamefi.com/sdk.js"></script>
<script>
  const gamefi = new GameFiSDK({ gameId: 'your-game' })
  // Full P2E integration with 3 lines of code
</script>
```

#### Option 2: API Integration
```javascript
// Manual API calls for custom implementations
fetch('/api/gamefi/start-session', {
  method: 'POST',
  body: JSON.stringify({ gameId: 'custom-game', wallet: address })
})
```

#### Option 3: Widget Integration
```html
<!-- Drop-in leaderboard widget -->
<div id="gamefi-leaderboard" data-game="my-game"></div>
<script src="https://cdn.gamefi.com/widgets.js"></script>
```

## Security Architecture

### 1. **Multi-Layer Validation**
- Client-side: Basic validation, UX optimization
- Server-side: Authoritative validation, anti-cheat
- Blockchain: Payment verification, immutable records

### 2. **Anti-Abuse Measures**
- Rate limiting (IP, device, wallet)
- Move sequence validation
- Statistical anomaly detection
- Merkle proof verification

### 3. **Access Control**
- JWT-based authentication
- Wallet signature verification
- API key management for developers
- Role-based permissions

## Scalability Considerations

### 1. **Database Optimization**
- Read replicas for leaderboards
- Partitioning by date/game
- Indexing strategy for fast queries
- Connection pooling

### 2. **Caching Strategy**
- Redis for leaderboards
- CDN for static assets
- API response caching
- Real-time updates via WebSocket

### 3. **Load Distribution**
- Microservices deployment
- Auto-scaling based on usage
- Geographic distribution
- Queue systems for async tasks

## Deployment Architecture

### Development Environment
```
├── Local Development
│   ├── Next.js dev server
│   ├── PostgreSQL (Docker)
│   ├── Solana localnet
│   └── Redis cache
```

### Production Environment
```
├── Vercel (API + Frontend)
├── Neon Database (PostgreSQL)
├── Solana Mainnet
├── Upstash Redis
├── Helius RPC & Webhooks
└── Switchboard VRF
```

## Performance Targets

### Response Times
- Lives check: <100ms
- Score submission: <200ms
- Leaderboard fetch: <150ms
- Payment processing: <500ms

### Throughput
- 1000+ concurrent users per game
- 10+ games simultaneously
- 100+ score submissions per minute
- 24/7 uptime for raffle system

## Monitoring & Observability

### Metrics to Track
- API response times
- Error rates by endpoint
- Payment success rates
- VRF randomness generation time
- User retention by game
- Revenue per user

### Alerting
- Payment processing failures
- VRF timeout/failures
- Database connection issues
- Rate limiting violations
- Security anomalies

## Future Enhancements

### Phase 2: Advanced Features
- Cross-game leaderboards
- Tournament systems
- NFT rewards integration
- Multi-token support (not just MWOR)

### Phase 3: Platform Expansion  
- Mobile SDK (React Native)
- Unity plugin
- Godot integration
- Unreal Engine support

### Phase 4: Ecosystem
- Game developer marketplace
- Revenue sharing models
- White-label solutions
- DAO governance for game parameters

## Technology Stack

### Core Technologies
- **Backend**: Next.js API routes, TypeScript
- **Database**: PostgreSQL (Neon), Redis caching
- **Blockchain**: Solana, SPL tokens
- **VRF**: Switchboard oracles
- **Social**: Telegram Bot API, X/Twitter API
- **Admin Dashboard**: React/Next.js, Recharts, React Admin
- **Analytics**: Real-time event streaming, aggregated daily metrics
- **Reports**: PDF generation (jsPDF), Excel export (SheetJS)

### Development Tools
- **Package Manager**: pnpm
- **Deployment**: Vercel
- **Monitoring**: Vercel Analytics + Custom metrics
- **Testing**: Jest, Playwright
- **Documentation**: Markdown + Docusaurus

### Third-Party Services
- **RPC**: Helius (Solana)
- **Webhooks**: Helius transaction tracking
- **VRF**: Switchboard randomness
- **Database**: Neon serverless PostgreSQL
- **Cache**: Upstash Redis

## Admin Dashboard Detailed Features

### Analytics & Reporting
- **Real-Time Dashboard**: Live user counts, active games, revenue tracking
- **User Analytics**: Registration trends, engagement metrics, retention rates
- **Financial Reporting**: Revenue by game, payment success rates, token sink analysis
- **Game Performance**: Popular games, average session time, score distributions
- **Custom Reports**: Drag-and-drop report builder with scheduling capabilities

### Configuration Management
- **Game Settings**: Lives systems, scoring rules, validation parameters
- **Raffle Configuration**: Ticket distribution, winner selection, prize pools
- **Leaderboard Management**: Ranking periods, qualification rules, reward tiers
- **Payment Settings**: Token prices, tier configurations, promotional rates
- **Feature Flags**: Enable/disable features per game or globally

### User & Game Management  
- **User Administration**: Account verification, fraud prevention, support tools
- **Game Approval**: New game registration, configuration validation
- **Moderation Tools**: Content review, user bans, dispute resolution
- **Support Dashboard**: Ticket management, user communication, escalation workflows

### System Monitoring
- **Performance Metrics**: API response times, database performance, error rates
- **Infrastructure Health**: Server resources, connectivity, third-party services
- **Security Alerts**: Suspicious activity, failed authentication, rate limit violations
- **Automated Alerts**: Email/SMS notifications for critical issues

This architecture provides a solid foundation for building a modular, scalable GameFi platform that can transform any browser game into a Web3 P2E experience with comprehensive administrative control and business intelligence. 