#!/bin/bash

# 🏗️ Infrastructure Services Startup Script
# Starts PostgreSQL, Redis, RabbitMQ, and ClickHouse for microservices

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting infrastructure services...${NC}"
echo ""

# Start infrastructure services
echo -e "${YELLOW}🐳 Starting: PostgreSQL, Redis, RabbitMQ, ClickHouse...${NC}"
docker-compose -f docker-compose.microservices.yml up -d postgres redis rabbitmq clickhouse

echo ""
echo -e "${GREEN}✅ Infrastructure services started!${NC}"
echo ""
echo -e "${BLUE}📊 Services Running:${NC}"
echo -e "   📁 PostgreSQL: ${YELLOW}localhost:5432${NC}"
echo -e "   📝 Redis: ${YELLOW}localhost:6379${NC}"
echo -e "   🐰 RabbitMQ: ${YELLOW}localhost:15672${NC} (admin: gamefi/gamefi_queue)"
echo -e "   📈 ClickHouse: ${YELLOW}localhost:8123${NC}"
echo ""
echo -e "${YELLOW}💡 To initialize the database, run: ./setup-database.sh${NC}"
