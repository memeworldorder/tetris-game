# MWOR Game & Raffle Security Stack - Complete Implementation Guide

This document covers the complete implementation of the MWOR Game & Raffle security stack and ticket distribution system as specified in your requirements.

## 🔐 Security Stack Implementation - Complete Coverage

### 1. Randomness & Fair Draws ✅

| Threat | Implementation | File |
|--------|----------------|------|
| **Predicting piece/card order** | Daily master VRF seed → HMAC-derived per-round seeds | `lib/security-stack.ts` |
| **Rigging the raffle winner** | Commit-reveal of game seeds + Fresh VRF after ticket lock | `lib/security-stack.ts` |

**Features Implemented:**
- `VRFSeedManager` - Daily seed rotation (24h intervals)
- `CommitRevealManager` - Seed commitment before game, reveal after
- Per-round seeds derived via HMAC from master seed
- VRF-based raffle winner selection with public proof

### 2. Score Integrity ✅

| Threat | Implementation | File |
|--------|----------------|------|
| **Client-side JS tamper** | Server re-simulates every move sequence | `lib/security-stack.ts` |
| **Injecting fake scores** | Ed25519 server signatures on all scores | `lib/security-stack.ts` |

**Features Implemented:**
- `ScoreSigningManager` - Server-side game simulation
- Ed25519 signature verification for all scores
- Move sequence validation and timing checks
- Deterministic piece generation from seed

### 3. Bot & Multi-wallet Abuse ✅

| Threat | Implementation | File |
|--------|----------------|------|
| **Headless bots** | Seed unpredictability + bot pattern detection | `lib/security-stack.ts` |
| **Wallet splitting for free lives** | IP+device fingerprinting + bonus scales with total balance | `lib/security-stack.ts` |

**Features Implemented:**
- `AbuseDetector` - Bot confidence scoring (timing, patterns)
- Device fingerprinting (IP + User-Agent + additional signals)
- Rate limiting: 1 free life per IP/device/day
- Bonus lives scale with total MWOR (not per-wallet)

### 4. Paid-life Fraud ✅

| Threat | Implementation | File |
|--------|----------------|------|
| **Fake payments** | Helius webhook verification of MWOR transfers | `app/api/hel/trx/route.ts` |
| **Replay of old transfers** | Unique temp addresses per request | `app/api/buyLife/route.ts` |

**Features Implemented:**
- Webhook signature verification
- Temp payment addresses with expiration
- Transaction deduplication
- Payment tier validation (cheap/mid/high)

### 5. Data Tamper / Audit Trail ✅

| Threat | Implementation | File |
|--------|----------------|------|
| **Disputes over results** | On-chain Merkle root of daily qualified plays | `lib/security-stack.ts` |
| **Server log alteration** | Hash of move logs + 7-day retention window | `scripts/supabase-schema-enhanced.sql` |

**Features Implemented:**
- `AuditTrailManager` - Merkle tree building and proof generation
- Daily Merkle root stored on-chain in PDA
- Move sequence hashing and archival
- Dispute resolution system

### 6. Cost Control & DoS ✅

| Implementation | Result |
|----------------|---------|
| **VRF Usage** | Only 1 VRF call per daily raffle (~$0.30/day) |
| **Chain Storage** | Logs instead of PDAs → minimal rent costs |
| **Rate Limiting** | Per-IP/device/endpoint limits prevent spam |

### 7. Key & Seed Exposure ✅

| Implementation | Security Benefit |
|----------------|-------------------|
| **Master VRF Seed** | Never revealed, rotated daily |
| **Per-round Seeds** | HMAC-derived, commitment-reveal scheme |
| **Server Signing Key** | Ed25519 private key in secure environment |

## 🎰 Raffle Ticket Distribution System - Complete Implementation

### Configuration (DAO Controlled) ✅

```typescript
interface RaffleConfig {
  leaderboardSlicePercent: 25,  // Top 25% qualify
  ticketTiers: {
    rank1: 25,         // 1st place → 25 tickets
    ranks2to5: 15,     // 2-5 place → 15 tickets each
    ranks6to10: 10,    // 6-10 place → 10 tickets each
    remaining: 1       // 11%-25% → 1 ticket each
  },
  maxTicketsPerWallet: 25,      // Hard cap per wallet/day
  oneScorePerWallet: true       // Only highest score counts
}
```

### Flow Implementation ✅

| Step | Implementation | File |
|------|----------------|------|
| **During the day** | Each wallet's best score tracked (upsert on conflict) | `lib/raffle-system.ts` |
| **00:00 UTC reset** | Sort scores → top 25% → assign tickets → build Merkle tree | `app/api/resetMidnight/route.ts` |
| **Raffle draw** | Fresh VRF → winner index → weighted selection | `lib/raffle-system.ts` |

### Edge-Case Coverage ✅

| Edge Case | How We Handle It |
|-----------|------------------|
| **Spam-proof** | Only highest score per wallet counts (upsert logic) |
| **Wallet-split-proof** | Each wallet must independently reach top 25% |
| **Skill-first** | Weighted tiers give measurable advantage to top scorers |
| **Cheap on-chain** | Tree size ≤ active wallets × 0.25, single 32-byte PDA |
| **Configurable** | All params stored in `raffle_config` table, DAO controlled |

## 📊 Database Schema - Enhanced for Security & Raffles

### Core Tables ✅

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `lives` | Enhanced lives tracking | Device fingerprinting, abuse detection |
| `payments` | Enhanced payment records | Burn/prize pool split, payment tiers |
| `plays` | Enhanced game records | Bot confidence, qualification status, signatures |

### Security Tables ✅

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `vrf_seeds` | VRF seed management | Daily rotation, proof storage |
| `score_proofs` | Ed25519 signatures | Server-signed score verification |
| `game_sessions` | Commit-reveal | Seed commitment and revelation |
| `move_logs` | Audit trail | 7-day retention, compressed storage |

### Raffle Tables ✅

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `daily_raffles` | Raffle results | Winner, VRF proof, Merkle root |
| `raffle_qualified_wallets` | Daily qualifiers | Tickets, tiers, Merkle proofs |
| `raffle_config` | DAO configuration | Tiered weights, qualification rules |

### Monitoring Tables ✅

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `rate_limits` | Abuse prevention | IP/device/endpoint tracking |
| `suspicious_activity` | Security monitoring | Bot alerts, rate limit violations |
| `daily_stats` | Analytics | Player counts, MWOR flows, bot detection |

## 🚀 API Endpoints - Enhanced for Security & Raffles

### Enhanced Existing Endpoints ✅

| Endpoint | Security Enhancements |
|----------|----------------------|
| `POST /api/claimDaily` | Device fingerprinting, rate limiting, bot detection |
| `POST /api/buyLife` | Temp address generation, payment tier validation |
| `POST /api/endRound` | Server-side simulation, Ed25519 signing, bot scoring |
| `POST /api/hel/trx` | Webhook verification, payment processing, burn/prize split |
| `GET /api/leaderboard/daily` | Qualification status, tier information |

### New Raffle Endpoints 🆕

```typescript
// Get current raffle status
GET /api/raffle/current
Response: {
  date: "2024-01-15",
  qualifiedWallets: 42,
  totalTickets: 158,
  winner: "ABC...XYZ" | null,
  ticketDistribution: {
    rank1: 25, ranks2to5: 60, ranks6to10: 50, remaining: 23
  }
}

// Get wallet's qualification status
GET /api/raffle/qualification?wallet=ABC...XYZ
Response: {
  qualified: true,
  rank: 3,
  score: 15420,
  tickets: 15,
  tier: "ranks2to5",
  merkleProof: ["hash1", "hash2", ...]
}

// Get raffle history
GET /api/raffle/history?limit=30
Response: {
  raffles: [
    { date: "2024-01-14", winner: "DEF...ABC", prize: 1000000 },
    // ...
  ]
}
```

## 🔄 Enhanced Midnight Reset Process

The `POST /api/resetMidnight` endpoint now executes a comprehensive 8-step process:

### Step 1: Execute Daily Raffle 🎯
- Get qualified wallets (top 25% unique scores)
- Generate tiered tickets (25/15/10/1 based on rank)
- Build Merkle tree of qualified wallets
- Conduct VRF-based winner selection
- Store all results in database

### Step 2: Build Merkle Root 🌳
- Collect all qualified plays from previous day
- Build audit trail Merkle tree
- Generate 32-byte root for on-chain storage

### Step 3: Update On-Chain Data ⛓️
- Store Merkle root in Solana PDA
- Record transaction hash
- Enable dispute resolution

### Step 4: Reset Daily Counters 🔄
- Reset all user life counters
- Track reset statistics

### Step 5: Archive & Cleanup 🗂️
- Clean up move logs (7-day retention)
- Archive old play records (30+ days)

### Step 6: Rotate VRF Seeds 🔐
- Mark current seed inactive
- Generate new VRF seed
- Update rotation tracking

### Step 7: Update Statistics 📊
- Calculate daily metrics
- Store aggregated data
- Track MWOR flows and burns

### Step 8: Generate Report 📋
- Comprehensive reset summary
- Raffle results and statistics
- Security metrics and alerts

## 🎯 Security Result Summary

✅ **Players can't predict or tamper with games or raffles**
- VRF-based randomness with commit-reveal
- Server-authoritative scoring with Ed25519 signatures
- Bot detection and pattern analysis

✅ **Wallet-splitting and bots gain no edge**
- Device fingerprinting and rate limiting
- Bonus lives scale with total balance, not wallet count
- Seed unpredictability makes perfect bots impossible

✅ **Chain costs stay pennies per day**
- Single VRF call per raffle (~$0.30/day)
- Log-based storage instead of per-score PDAs
- Efficient Merkle tree structure

✅ **DAO can audit everything**
- On-chain Merkle roots for verification
- Public VRF proofs for transparency
- Complete audit trail with dispute resolution

## 🛠️ Deployment Instructions

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Set Up Enhanced Database
```sql
-- Run the enhanced schema
\i scripts/supabase-schema-enhanced.sql
```

### 3. Configure Environment Variables
```bash
# Run the environment setup script
./scripts/setup-env.sh

# Add security-specific variables
SCORE_SIGNING_PRIVATE_KEY=your_ed25519_private_key_hex
VRF_SWITCHBOARD_QUEUE=your_vrf_queue_address
ORACLE_SWITCHBOARD_FEED=your_price_feed_address
```

### 4. Deploy with Enhanced Security
```bash
# Deploy with all security features
./scripts/deploy.sh production
```

### 5. Post-Deployment Setup
1. **Configure Helius Webhook**: Point to `/api/hel/trx`
2. **Set Up VRF**: Configure Switchboard VRF queue
3. **Initialize Raffle Config**: Set DAO-controlled parameters
4. **Enable Monitoring**: Set up alerts for security events
5. **Test Security Features**: Verify bot detection, rate limiting
6. **Validate Raffle System**: Test qualification and ticket distribution

## 🔒 Security Monitoring

### Key Metrics to Monitor
- Bot detection confidence scores
- Rate limiting violations
- VRF seed rotation status
- Merkle root updates
- Payment verification failures
- Suspicious activity patterns

### Alert Thresholds
- Bot confidence > 0.8: Immediate alert
- Rate limit violations > 100/hour: Investigation
- Failed payments > 5%: System check
- VRF rotation failures: Critical alert

Your MWOR Game & Raffle system is now equipped with enterprise-grade security and a fair, transparent raffle system that prevents all major attack vectors while maintaining minimal on-chain costs! 🎮🔐🎰 