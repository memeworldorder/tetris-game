#!/bin/bash

# 🚀 GameFi Platform Mainnet Startup Script
# Starts complete microservices platform with Solana mainnet configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Mainnet Configuration
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
SOLANA_NETWORK="mainnet-beta"

echo -e "${PURPLE}🚀 STARTING GAMEFI PLATFORM - MAINNET MODE${NC}"
echo -e "${PURPLE}==============================================${NC}"
echo ""
echo -e "${BLUE}🌐 Network Configuration:${NC}"
echo -e "   Solana: ${YELLOW}${SOLANA_NETWORK}${NC}"
echo -e "   RPC: ${YELLOW}${SOLANA_RPC_URL}${NC}"
echo ""

# Step 1: Start Infrastructure
echo -e "${BLUE}🏗️ Starting Infrastructure Services...${NC}"
if docker-compose -f docker-compose.microservices.yml up -d postgres redis rabbitmq clickhouse; then
    echo -e "${GREEN}✅ Infrastructure started successfully${NC}"
else
    echo -e "${RED}❌ Failed to start infrastructure${NC}"
    exit 1
fi

echo ""

# Wait for PostgreSQL
echo -e "${YELLOW}⏳ Waiting for PostgreSQL...${NC}"
sleep 10

# Check if database is ready
if docker exec tetris-game_postgres_1 pg_isready -U gamefi_user -d gamefi_platform > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL ready${NC}"
else
    echo -e "${RED}❌ PostgreSQL not ready${NC}"
    exit 1
fi

echo ""

# Step 2: Kill any existing microservices
echo -e "${BLUE}🔄 Stopping existing microservices...${NC}"
pkill -f "user-service" || true
pkill -f "game-engine" || true
pkill -f "rewards-service" || true
pkill -f "payment-service" || true
pkill -f "analytics-service" || true
pkill -f "api-gateway" || true
sleep 2

# Step 3: Start Core Services with Mainnet Config
echo -e "${BLUE}🚀 Starting Core Microservices...${NC}"

# Start User Service
echo -e "${YELLOW}Starting User Service (3010)...${NC}"
cd services/user-service
DATABASE_URL=postgresql://gamefi_user:gamefi_password@localhost:5432/gamefi_platform \
REDIS_URL=redis://localhost:6379 \
RABBITMQ_URL=amqp://gamefi:gamefi_queue@localhost:5672/gamefi_vhost \
SOLANA_RPC_URL=${SOLANA_RPC_URL} \
SOLANA_NETWORK=${SOLANA_NETWORK} \
npm start > ../../logs/user-service.log 2>&1 &

cd ../..
sleep 3

# Start Game Engine
echo -e "${YELLOW}Starting Game Engine (3011)...${NC}"
cd services/game-engine
DATABASE_URL=postgresql://gamefi_user:gamefi_password@localhost:5432/gamefi_platform \
REDIS_URL=redis://localhost:6379 \
RABBITMQ_URL=amqp://gamefi:gamefi_queue@localhost:5672/gamefi_vhost \
SOLANA_RPC_URL=${SOLANA_RPC_URL} \
SOLANA_NETWORK=${SOLANA_NETWORK} \
npm start > ../../logs/game-engine.log 2>&1 &

cd ../..
sleep 3

# Start Rewards Service
echo -e "${YELLOW}Starting Rewards Service (3012)...${NC}"
cd services/rewards-service
DATABASE_URL=postgresql://gamefi_user:gamefi_password@localhost:5432/gamefi_platform \
REDIS_URL=redis://localhost:6379 \
RABBITMQ_URL=amqp://gamefi:gamefi_queue@localhost:5672/gamefi_vhost \
SOLANA_RPC_URL=${SOLANA_RPC_URL} \
SOLANA_NETWORK=${SOLANA_NETWORK} \
npm start > ../../logs/rewards-service.log 2>&1 &

cd ../..
sleep 3

# Start Payment Service
echo -e "${YELLOW}Starting Payment Service (3013)...${NC}"
cd services/payment-service
DATABASE_URL=postgresql://gamefi_user:gamefi_password@localhost:5432/gamefi_platform \
REDIS_URL=redis://localhost:6379 \
RABBITMQ_URL=amqp://gamefi:gamefi_queue@localhost:5672/gamefi_vhost \
SOLANA_RPC_URL=${SOLANA_RPC_URL} \
SOLANA_NETWORK=${SOLANA_NETWORK} \
npm start > ../../logs/payment-service.log 2>&1 &

cd ../..
sleep 3

# Start Analytics Service
echo -e "${YELLOW}Starting Analytics Service (3014)...${NC}"
cd services/analytics-service
DATABASE_URL=postgresql://gamefi_user:gamefi_password@localhost:5432/gamefi_platform \
REDIS_URL=redis://localhost:6379 \
RABBITMQ_URL=amqp://gamefi:gamefi_queue@localhost:5672/gamefi_vhost \
SOLANA_RPC_URL=${SOLANA_RPC_URL} \
SOLANA_NETWORK=${SOLANA_NETWORK} \
npm start > ../../logs/analytics-service.log 2>&1 &

cd ../..
sleep 5

# Start API Gateway
echo -e "${YELLOW}Starting API Gateway (3000)...${NC}"
cd services/api-gateway
REDIS_URL=redis://localhost:6379 \
USER_SERVICE_URL=http://localhost:3010 \
GAME_ENGINE_URL=http://localhost:3011 \
REWARDS_SERVICE_URL=http://localhost:3012 \
PAYMENT_SERVICE_URL=http://localhost:3013 \
ANALYTICS_SERVICE_URL=http://localhost:3014 \
SOLANA_RPC_URL=${SOLANA_RPC_URL} \
SOLANA_NETWORK=${SOLANA_NETWORK} \
npm start > ../../logs/api-gateway.log 2>&1 &

cd ../..
sleep 5

echo ""

# Step 4: Health Check
echo -e "${BLUE}🔍 Health Check - Mainnet Services...${NC}"
mkdir -p logs

# Check each service
services=("3010:User Service" "3011:Game Engine" "3012:Rewards Service" "3013:Payment Service" "3014:Analytics Service" "3000:API Gateway")

for service in "${services[@]}"; do
    port="${service%%:*}"
    name="${service##*:}"
    
    if curl -s --max-time 3 http://localhost:$port/health > /dev/null; then
        echo -e "  ✅ ${name} (${port}): ${GREEN}HEALTHY${NC}"
    else
        echo -e "  ❌ ${name} (${port}): ${RED}DOWN${NC}"
    fi
done

echo ""

# Step 5: Final Status
echo -e "${GREEN}🎉 GAMEFI PLATFORM STARTED - MAINNET MODE${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""
echo -e "${BLUE}🌐 Mainnet Configuration Active:${NC}"
echo -e "   Network: ${YELLOW}${SOLANA_NETWORK}${NC}"
echo -e "   RPC URL: ${YELLOW}${SOLANA_RPC_URL}${NC}"
echo ""
echo -e "${BLUE}🔗 Access Points:${NC}"
echo -e "   🎮 Main API: ${YELLOW}http://localhost:3000${NC}"
echo -e "   👤 User Service: ${YELLOW}http://localhost:3010${NC}"
echo -e "   🎲 Game Engine: ${YELLOW}http://localhost:3011${NC}"
echo -e "   🏆 Rewards: ${YELLOW}http://localhost:3012${NC}"
echo -e "   💳 Payments: ${YELLOW}http://localhost:3013${NC}"
echo -e "   📊 Analytics: ${YELLOW}http://localhost:3014${NC}"
echo ""
echo -e "${BLUE}🗄️ Infrastructure:${NC}"
echo -e "   📁 PostgreSQL: ${YELLOW}localhost:5432${NC}"
echo -e "   📝 Redis: ${YELLOW}localhost:6379${NC}"
echo -e "   🐰 RabbitMQ: ${YELLOW}localhost:15672${NC} (gamefi/gamefi_queue)"
echo -e "   📈 ClickHouse: ${YELLOW}localhost:8123${NC}"
echo ""
echo -e "${BLUE}📊 Monitoring:${NC}"
echo -e "   📝 Logs: ${YELLOW}./logs/[service-name].log${NC}"
echo -e "   🔍 Health: ${YELLOW}curl http://localhost:3000/health${NC}"
echo ""
echo -e "${PURPLE}✨ READY FOR MAINNET PRODUCTION! ✨${NC}" 