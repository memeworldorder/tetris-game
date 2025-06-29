#!/bin/bash

# 🎮 GameFi Platform Interactive CLI
# Simple, interactive command-line interface for managing the platform

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SOLANA_NETWORK="mainnet-beta"
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"

# Create logs directory if it doesn't exist
mkdir -p logs

# Function to display header
show_header() {
    clear
    echo -e "${PURPLE}╔════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║           🎮 GameFi Platform CLI        ║${NC}"
    echo -e "${PURPLE}║              Interactive Manager         ║${NC}"
    echo -e "${PURPLE}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}Network: ${YELLOW}${SOLANA_NETWORK}${NC}"
    echo -e "${CYAN}RPC: ${YELLOW}${SOLANA_RPC_URL}${NC}"
    echo ""
}

# Function to check service status
check_service_status() {
    echo -e "${BLUE}🔍 Checking Platform Status...${NC}"
    echo ""
    
    echo -e "${YELLOW}Infrastructure Services:${NC}"
    docker-compose -f docker-compose.microservices.yml ps --format table 2>/dev/null | head -10 || echo "  ❌ Docker services not running"
    
    echo ""
    echo -e "${YELLOW}Microservices:${NC}"
    services=("3010:User Service" "3011:Game Engine" "3012:Rewards Service" "3013:Payment Service" "3014:Analytics Service" "3000:API Gateway")
    
    for service in "${services[@]}"; do
        port="${service%%:*}"
        name="${service##*:}"
        
        if curl -s --max-time 2 http://localhost:$port/health > /dev/null; then
            echo -e "  ✅ ${name} (${port}): ${GREEN}RUNNING${NC}"
        else
            echo -e "  ❌ ${name} (${port}): ${RED}DOWN${NC}"
        fi
    done
    
    echo ""
    echo -e "${YELLOW}Frontend Services:${NC}"
    if curl -s --max-time 2 http://localhost:3001 > /dev/null; then
        echo -e "  ✅ Main UI (3001): ${GREEN}RUNNING${NC}"
    else
        echo -e "  ❌ Main UI (3001): ${RED}DOWN${NC}"
    fi
    
    if curl -s --max-time 2 http://localhost:3019/health > /dev/null; then
        echo -e "  ✅ Admin Dashboard (3019): ${GREEN}RUNNING${NC}"
    else
        echo -e "  ❌ Admin Dashboard (3019): ${RED}DOWN${NC}"
    fi
}

# Function to start infrastructure
start_infrastructure() {
    echo -e "${BLUE}🏗️ Starting Infrastructure Services...${NC}"
    echo ""
    
    echo -e "${YELLOW}Starting PostgreSQL, Redis, RabbitMQ, ClickHouse...${NC}"
    docker-compose -f docker-compose.microservices.yml up -d postgres redis rabbitmq clickhouse
    
    echo ""
    echo -e "${YELLOW}Waiting for services to be ready...${NC}"
    sleep 10
    
    if docker exec tetris-game_postgres_1 pg_isready -U gamefi_user -d gamefi_platform > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Infrastructure started successfully!${NC}"
    else
        echo -e "${RED}❌ Infrastructure startup failed${NC}"
    fi
}

# Function to start microservices
start_microservices() {
    echo -e "${BLUE}🚀 Starting All Microservices...${NC}"
    echo ""
    
    # Kill existing services
    echo -e "${YELLOW}Stopping existing services...${NC}"
    pkill -f "user-service" || true
    pkill -f "game-engine" || true
    pkill -f "rewards-service" || true
    pkill -f "payment-service" || true
    pkill -f "analytics-service" || true
    pkill -f "api-gateway" || true
    sleep 2
    
    echo -e "${YELLOW}Starting services with mainnet configuration...${NC}"
    
    # Start User Service
    cd services/user-service
    DATABASE_URL=postgresql://gamefi_user:gamefi_password@localhost:5432/gamefi_platform \
    REDIS_URL=redis://localhost:6379 \
    RABBITMQ_URL=amqp://gamefi:gamefi_queue@localhost:5672/gamefi_vhost \
    SOLANA_RPC_URL=${SOLANA_RPC_URL} \
    npm start > ../../logs/user-service.log 2>&1 &
    cd ../..
    sleep 2
    
    # Start Game Engine
    cd services/game-engine
    DATABASE_URL=postgresql://gamefi_user:gamefi_password@localhost:5432/gamefi_platform \
    REDIS_URL=redis://localhost:6379 \
    RABBITMQ_URL=amqp://gamefi:gamefi_queue@localhost:5672/gamefi_vhost \
    SOLANA_RPC_URL=${SOLANA_RPC_URL} \
    npm start > ../../logs/game-engine.log 2>&1 &
    cd ../..
    sleep 2
    
    # Start Rewards Service
    cd services/rewards-service
    DATABASE_URL=postgresql://gamefi_user:gamefi_password@localhost:5432/gamefi_platform \
    REDIS_URL=redis://localhost:6379 \
    RABBITMQ_URL=amqp://gamefi:gamefi_queue@localhost:5672/gamefi_vhost \
    SOLANA_RPC_URL=${SOLANA_RPC_URL} \
    npm start > ../../logs/rewards-service.log 2>&1 &
    cd ../..
    sleep 2
    
    # Start Payment Service
    cd services/payment-service
    DATABASE_URL=postgresql://gamefi_user:gamefi_password@localhost:5432/gamefi_platform \
    REDIS_URL=redis://localhost:6379 \
    RABBITMQ_URL=amqp://gamefi:gamefi_queue@localhost:5672/gamefi_vhost \
    SOLANA_RPC_URL=${SOLANA_RPC_URL} \
    npm start > ../../logs/payment-service.log 2>&1 &
    cd ../..
    sleep 2
    
    # Start Analytics Service
    cd services/analytics-service
    DATABASE_URL=postgresql://gamefi_user:gamefi_password@localhost:5432/gamefi_platform \
    REDIS_URL=redis://localhost:6379 \
    RABBITMQ_URL=amqp://gamefi:gamefi_queue@localhost:5672/gamefi_vhost \
    SOLANA_RPC_URL=${SOLANA_RPC_URL} \
    npm start > ../../logs/analytics-service.log 2>&1 &
    cd ../..
    sleep 3
    
    # Start API Gateway
    cd services/api-gateway
    REDIS_URL=redis://localhost:6379 \
    USER_SERVICE_URL=http://localhost:3010 \
    GAME_ENGINE_URL=http://localhost:3011 \
    REWARDS_SERVICE_URL=http://localhost:3012 \
    PAYMENT_SERVICE_URL=http://localhost:3013 \
    ANALYTICS_SERVICE_URL=http://localhost:3014 \
    npm start > ../../logs/api-gateway.log 2>&1 &
    cd ../..
    sleep 3
    
    echo -e "${GREEN}✅ Microservices started!${NC}"
}

# Function to start frontend
start_frontend() {
    echo -e "${BLUE}🎮 Starting Frontend Services...${NC}"
    echo ""
    
    # Kill existing UI processes
    pkill -f "next dev" || true
    pkill -f "npm run dev" || true
    sleep 2
    
    echo -e "${YELLOW}Starting Main UI (port 3001) - MAINNET LIVE MODE...${NC}"
    chmod +x start-frontend-mainnet.sh
    ./start-frontend-mainnet.sh
    
    echo -e "${YELLOW}Starting Admin Dashboard (port 3019)...${NC}"
    cd services/admin-dashboard
    DATABASE_URL=postgresql://gamefi_user:gamefi_password@localhost:5432/gamefi_platform \
    REDIS_URL=redis://localhost:6379 \
    API_GATEWAY_URL=http://localhost:3000 \
    npm start > ../../logs/admin-dashboard.log 2>&1 &
    cd ../..
    
    sleep 5
    echo -e "${GREEN}✅ Frontend services started!${NC}"
}

# Function to stop all services
stop_all_services() {
    echo -e "${BLUE}🛑 Stopping All Services...${NC}"
    echo ""
    
    echo -e "${YELLOW}Stopping microservices...${NC}"
    pkill -f "user-service" || true
    pkill -f "game-engine" || true
    pkill -f "rewards-service" || true
    pkill -f "payment-service" || true
    pkill -f "analytics-service" || true
    pkill -f "api-gateway" || true
    pkill -f "next dev" || true
    pkill -f "npm run dev" || true
    
    echo -e "${YELLOW}Stopping infrastructure...${NC}"
    docker-compose -f docker-compose.microservices.yml down
    
    echo -e "${GREEN}✅ All services stopped!${NC}"
}

# Function to view logs
view_logs() {
    echo -e "${BLUE}📋 Available Log Files:${NC}"
    echo ""
    
    if [ -d "logs" ] && [ "$(ls -A logs)" ]; then
        ls -la logs/
        echo ""
        echo -e "${YELLOW}Enter log file name (without .log extension):${NC}"
        read -p "> " log_name
        
        if [ -f "logs/${log_name}.log" ]; then
            echo -e "${BLUE}Showing last 50 lines of ${log_name}.log:${NC}"
            echo ""
            tail -50 "logs/${log_name}.log"
        else
            echo -e "${RED}Log file not found!${NC}"
        fi
    else
        echo -e "${YELLOW}No log files found. Start some services first.${NC}"
    fi
}

# Function to run tests
run_tests() {
    echo -e "${BLUE}🧪 Running Platform Tests...${NC}"
    echo ""
    
    echo -e "${YELLOW}Available test options:${NC}"
    echo "1. Microservices API Test"
    echo "2. VRF System Test" 
    echo "3. Database Test"
    echo "4. Full Integration Test"
    echo ""
    read -p "Select test (1-4): " test_choice
    
    case $test_choice in
        1)
            echo -e "${BLUE}Running microservices test...${NC}"
            if [ -f "scripts/test-microservices.sh" ]; then
                chmod +x scripts/test-microservices.sh
                ./scripts/test-microservices.sh
            else
                echo -e "${RED}Test script not found!${NC}"
            fi
            ;;
        2)
            echo -e "${BLUE}Running VRF test...${NC}"
            if [ -f "test-vrf-fix.sh" ]; then
                chmod +x test-vrf-fix.sh
                ./test-vrf-fix.sh
            else
                echo -e "${RED}VRF test script not found!${NC}"
            fi
            ;;
        3)
            echo -e "${BLUE}Testing database connection...${NC}"
            docker exec tetris-game_postgres_1 psql -U gamefi_user -d gamefi_platform -c "SELECT 'Database Test: Connected!' as status, COUNT(*) as tables FROM information_schema.tables WHERE table_schema = 'public';"
            ;;
        4)
            echo -e "${BLUE}Running full integration test...${NC}"
            check_service_status
            ;;
        *)
            echo -e "${RED}Invalid option!${NC}"
            ;;
    esac
}

# Function to show access URLs
show_access_urls() {
    echo -e "${BLUE}🌐 Platform Access URLs:${NC}"
    echo ""
    echo -e "${YELLOW}Main Interfaces:${NC}"
    echo -e "  🎮 Game UI: ${CYAN}http://localhost:3001${NC}"
    echo -e "  🔧 Admin Dashboard: ${CYAN}http://localhost:3001/admin${NC}"
    echo -e "  🏢 Admin Service: ${CYAN}http://localhost:3019${NC}"
    echo ""
    echo -e "${YELLOW}API Endpoints:${NC}"
    echo -e "  🌐 API Gateway: ${CYAN}http://localhost:3000${NC}"
    echo -e "  👤 User Service: ${CYAN}http://localhost:3010${NC}"
    echo -e "  🎲 Game Engine: ${CYAN}http://localhost:3011${NC}"
    echo -e "  🏆 Rewards: ${CYAN}http://localhost:3012${NC}"
    echo -e "  💳 Payments: ${CYAN}http://localhost:3013${NC}"
    echo -e "  📊 Analytics: ${CYAN}http://localhost:3014${NC}"
    echo ""
    echo -e "${YELLOW}Infrastructure:${NC}"
    echo -e "  📁 PostgreSQL: ${CYAN}localhost:5432${NC}"
    echo -e "  📝 Redis: ${CYAN}localhost:6379${NC}"
    echo -e "  🐰 RabbitMQ Admin: ${CYAN}http://localhost:15672${NC} (gamefi/gamefi_queue)"
    echo -e "  📈 ClickHouse: ${CYAN}localhost:8123${NC}"
}

# Main menu
show_main_menu() {
    echo -e "${BLUE}Select an option:${NC}"
    echo ""
    echo -e "${YELLOW}🚀 PLATFORM MANAGEMENT:${NC}"
    echo "  1. 🏗️  Start Infrastructure Only"
    echo "  2. 🔧  Start Microservices Only" 
    echo "  3. 🎮  Start Frontend Only"
    echo "  4. ⚡  Start Everything"
    echo "  5. 🛑  Stop All Services"
    echo ""
    echo -e "${YELLOW}📊 MONITORING & TESTING:${NC}"
    echo "  6. 🔍  Check Status"
    echo "  7. 📋  View Logs"
    echo "  8. 🧪  Run Tests"
    echo ""
    echo -e "${YELLOW}🌐 ACCESS & INFO:${NC}"
    echo "  9. 🔗  Show Access URLs"
    echo " 10. 📚  View Documentation"
    echo ""
    echo " 99. ❌  Exit"
    echo ""
    read -p "Enter your choice: " choice
}

# Function to show documentation
show_documentation() {
    echo -e "${BLUE}📚 Available Documentation:${NC}"
    echo ""
    echo "1. README-MICROSERVICES.md - Microservices overview"
    echo "2. DATABASE_SETUP_README.md - Database setup guide"
    echo "3. VERCEL_DEPLOYMENT.md - Deployment guide"
    echo "4. VRF_TESTING_QUICKSTART.md - VRF testing guide"
    echo ""
    read -p "Select document to view (1-4): " doc_choice
    
    case $doc_choice in
        1) [ -f "README-MICROSERVICES.md" ] && cat README-MICROSERVICES.md | head -50 ;;
        2) [ -f "DATABASE_SETUP_README.md" ] && cat DATABASE_SETUP_README.md | head -50 ;;
        3) [ -f "VERCEL_DEPLOYMENT.md" ] && cat VERCEL_DEPLOYMENT.md | head -50 ;;
        4) [ -f "VRF_TESTING_QUICKSTART.md" ] && cat VRF_TESTING_QUICKSTART.md | head -50 ;;
        *) echo -e "${RED}Invalid option!${NC}" ;;
    esac
}

# Main loop
main() {
    while true; do
        show_header
        check_service_status
        echo ""
        show_main_menu
        
        case $choice in
            1)
                start_infrastructure
                ;;
            2)
                start_microservices
                ;;
            3)
                start_frontend
                ;;
            4)
                start_infrastructure
                sleep 5
                start_microservices
                sleep 5
                start_frontend
                ;;
            5)
                stop_all_services
                ;;
            6)
                check_service_status
                ;;
            7)
                view_logs
                ;;
            8)
                run_tests
                ;;
            9)
                show_access_urls
                ;;
            10)
                show_documentation
                ;;
            99)
                echo -e "${GREEN}Goodbye! 👋${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid option! Please try again.${NC}"
                ;;
        esac
        
        echo ""
        echo -e "${YELLOW}Press Enter to continue...${NC}"
        read
    done
}

# Run the CLI
main 