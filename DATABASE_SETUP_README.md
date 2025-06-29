# 🗄️ Database Setup Guide

This guide helps you set up the complete database infrastructure for the GameFi microservices platform.

## 🚀 Quick Start (Recommended)

**Option 1: One-Command Setup**
```bash
./setup-database.sh
```

This script will:
- ✅ Start PostgreSQL, Redis, RabbitMQ, and ClickHouse
- ✅ Wait for services to be ready
- ✅ Initialize all 12 microservices schemas
- ✅ Verify the setup
- ✅ Show connection details

## 🐳 Alternative: Manual Docker Commands

**Option 2: Step-by-Step Setup**

1. **Start Infrastructure Services:**
   ```bash
   ./deployment/scripts/start-infrastructure.sh
   # OR
   docker-compose -f docker-compose.microservices.yml up -d postgres redis rabbitmq clickhouse
   ```

2. **Wait for PostgreSQL to be ready:**
   ```bash
   # Check if PostgreSQL is ready
   docker exec tetris-game-postgres-1 pg_isready -U gamefi_user -d gamefi_platform
   ```

3. **Initialize Database Schemas:**
   ```bash
   # Run the complete microservices setup
   docker exec -i tetris-game-postgres-1 psql -U gamefi_user -d gamefi_platform < scripts/complete-microservices-setup.sql
   ```

## 📊 What Gets Created

The setup creates **35+ database tables** across all microservices:

### 🏗️ Shared Foundation
- **users** - Core user accounts
- **platform_config** - Global configuration

### 🎮 Gaming Hub Service (Port 3001)
- **game_catalog** - Available games
- **game_lobbies** - Multiplayer lobbies
- **lobby_participants** - Lobby membership
- **matchmaking_queue** - Player matching
- **user_game_stats** - Game statistics
- **daily_challenges** - Daily objectives
- **tournaments** - Tournament system

### 🎲 Game Engine Service (Port 3011)
- **game_sessions** - Active game sessions
- **vrf_requests** - VRF randomness system
- **anti_cheat_logs** - Security monitoring

### 🏆 Rewards Service (Port 3012)
- **leaderboards** - Ranking system
- **raffles** - Prize system
- **raffle_entries** - Raffle participation
- **user_lives** - Energy/lives system

### 💳 Payment Service (Port 3013)
- **transactions** - Blockchain transactions
- **wallet_balances** - Cached balances

### 📊 Analytics Service (Port 3014)
- **analytics_events** - Event tracking
- **daily_metrics** - Aggregated metrics

### 🤖 Social Services (Ports 3015-3017)
- **telegram_messages** - Telegram bot
- **twitter_tweets** - Twitter bot
- **social_campaigns** - Cross-platform campaigns

### ⏰ Background Services (Port 3018)
- **scheduled_jobs** - Cron jobs
- **job_executions** - Job history

### 🔧 Admin Dashboard (Port 3019)
- **service_configs** - Service management
- **game_configs** - Game configuration
- **admin_audit_logs** - Admin actions

## 🔍 Verification Commands

**Check Services Status:**
```bash
docker-compose -f docker-compose.microservices.yml ps
```

**View Database Tables:**
```bash
docker exec -it tetris-game-postgres-1 psql -U gamefi_user -d gamefi_platform -c "\dt"
```

**Check Table Count:**
```bash
docker exec -it tetris-game-postgres-1 psql -U gamefi_user -d gamefi_platform -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

## 🔗 Connection Details

| Service | Host | Port | Details |
|---------|------|------|---------|
| **PostgreSQL** | localhost | 5432 | Database: `gamefi_platform`<br>User: `gamefi_user`<br>Password: `gamefi_password` |
| **Redis** | localhost | 6379 | Cache and sessions |
| **RabbitMQ** | localhost | 15672 | Management UI<br>User: `gamefi`<br>Password: `gamefi_queue` |
| **ClickHouse** | localhost | 8123 | Analytics database |

## 🛠️ Useful Commands

**Connect to Database:**
```bash
docker exec -it tetris-game-postgres-1 psql -U gamefi_user -d gamefi_platform
```

**View Service Logs:**
```bash
docker-compose -f docker-compose.microservices.yml logs postgres
docker-compose -f docker-compose.microservices.yml logs redis
```

**Stop All Services:**
```bash
docker-compose -f docker-compose.microservices.yml down
```

**Stop Services and Remove Data:**
```bash
docker-compose -f docker-compose.microservices.yml down -v
```

## 🚨 Troubleshooting

**PostgreSQL won't start:**
```bash
# Check logs
docker-compose -f docker-compose.microservices.yml logs postgres

# Remove and recreate
docker-compose -f docker-compose.microservices.yml down -v
./setup-database.sh
```

**Database schema errors:**
```bash
# Check if file exists
ls -la scripts/complete-microservices-setup.sql

# Run manually
docker exec -i tetris-game-postgres-1 psql -U gamefi_user -d gamefi_platform < scripts/complete-microservices-setup.sql
```

**Permission denied:**
```bash
chmod +x setup-database.sh
chmod +x deployment/scripts/start-infrastructure.sh
```

## ✨ Next Steps

Once the database is running:

1. **Start microservices:** Use individual service commands or:
   ```bash
   ./deployment/scripts/start-all-services.sh
   ```

2. **Access services:**
   - API Gateway: http://localhost:3000
   - Gaming Hub: http://localhost:3001
   - Admin Dashboard: http://localhost:3019

3. **Monitor:** Check service health at `/health` endpoints

---

🎮 **Ready to play!** Your GameFi platform database is now set up and ready for all microservices. 