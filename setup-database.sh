#!/bin/bash

# 🗄️ GameFi Platform Database Setup Script
# This script sets up the complete database infrastructure for all microservices

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="gamefi_platform"
DB_USER="gamefi_user"
DB_PASSWORD="gamefi_password"
DB_HOST="localhost"
DB_PORT="5432"

echo -e "${BLUE}🚀 Starting GameFi Platform Database Setup...${NC}"
echo ""

# Function to check if PostgreSQL is ready
check_postgres_ready() {
    docker exec -i tetris-game-postgres-1 pg_isready -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1
}

# Function to wait for PostgreSQL
wait_for_postgres() {
    echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if check_postgres_ready; then
            echo -e "${GREEN}✅ PostgreSQL is ready!${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}   Attempt $attempt/$max_attempts - PostgreSQL not ready yet...${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ PostgreSQL failed to start within expected time${NC}"
    return 1
}

# Step 1: Start infrastructure services
echo -e "${BLUE}🐳 Starting database infrastructure...${NC}"
docker-compose -f docker-compose.microservices.yml up -d postgres redis rabbitmq clickhouse

echo ""

# Step 2: Wait for PostgreSQL to be ready
if ! wait_for_postgres; then
    echo -e "${RED}❌ Database setup failed - PostgreSQL not ready${NC}"
    echo -e "${YELLOW}💡 Try running: docker-compose -f docker-compose.microservices.yml logs postgres${NC}"
    exit 1
fi

echo ""

# Step 3: Run the complete database setup
echo -e "${BLUE}📋 Setting up database schemas...${NC}"
echo -e "${YELLOW}   This includes all 12 microservices schemas and sample data${NC}"

docker exec -i tetris-game-postgres-1 psql -U "$DB_USER" -d "$DB_NAME" < scripts/complete-microservices-setup.sql

echo -e "${GREEN}✅ Database schemas created successfully!${NC}"

echo ""

# Step 4: Verify the setup
echo -e "${BLUE}🔍 Verifying database setup...${NC}"

# Check if tables were created
TABLE_COUNT=$(docker exec -i tetris-game-postgres-1 psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

if [ "$TABLE_COUNT" -gt 30 ]; then
    echo -e "${GREEN}✅ Database verification successful - $TABLE_COUNT tables created${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: Only $TABLE_COUNT tables found (expected 30+)${NC}"
fi

echo ""

# Step 5: Show connection information
echo -e "${GREEN}🎉 Database Setup Complete!${NC}"
echo ""
echo -e "${BLUE}📊 Database Connection Info:${NC}"
echo -e "   Host: ${YELLOW}$DB_HOST${NC}"
echo -e "   Port: ${YELLOW}$DB_PORT${NC}"
echo -e "   Database: ${YELLOW}$DB_NAME${NC}"
echo -e "   Username: ${YELLOW}$DB_USER${NC}"
echo -e "   Password: ${YELLOW}$DB_PASSWORD${NC}"
echo ""

echo -e "${BLUE}🔧 Infrastructure Services Running:${NC}"
echo -e "   📁 PostgreSQL: ${YELLOW}localhost:5432${NC}"
echo -e "   📝 Redis: ${YELLOW}localhost:6379${NC}"
echo -e "   🐰 RabbitMQ: ${YELLOW}localhost:15672${NC} (admin: gamefi/gamefi_queue)"
echo -e "   📈 ClickHouse: ${YELLOW}localhost:8123${NC}"
echo ""

echo -e "${BLUE}💡 Useful Commands:${NC}"
echo -e "   🔍 Check services: ${YELLOW}docker-compose -f docker-compose.microservices.yml ps${NC}"
echo -e "   📝 View logs: ${YELLOW}docker-compose -f docker-compose.microservices.yml logs postgres${NC}"
echo -e "   🛠️  Connect to DB: ${YELLOW}docker exec -it tetris-game-postgres-1 psql -U $DB_USER -d $DB_NAME${NC}"
echo -e "   🛑 Stop services: ${YELLOW}docker-compose -f docker-compose.microservices.yml down${NC}"
echo ""

echo -e "${GREEN}✨ Ready to start microservices!${NC}"
echo -e "${YELLOW}   Next step: Run individual microservices or use start-all-services.sh${NC}" 