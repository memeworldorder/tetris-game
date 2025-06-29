#!/bin/bash

# 🔧 PostgreSQL Timeout Fix Script
# Diagnoses and fixes common PostgreSQL startup issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${PURPLE}🔧 ================================${NC}"
    echo -e "${PURPLE}🔧 $1${NC}"
    echo -e "${PURPLE}🔧 ================================${NC}\n"
}

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_action() {
    echo -e "${CYAN}🚀 $1${NC}"
}

# Check Docker resources
check_docker_resources() {
    print_info "Checking Docker resources..."
    
    # Check available memory
    TOTAL_MEM=$(docker system info --format '{{.MemTotal}}' 2>/dev/null || echo "0")
    if [ "$TOTAL_MEM" -lt 2147483648 ]; then  # Less than 2GB
        print_warning "Docker has less than 2GB RAM available. PostgreSQL may be slow to start."
        print_info "Consider increasing Docker memory allocation in Docker Desktop settings."
    else
        print_status "Docker memory allocation looks good"
    fi
    
    # Check disk space
    AVAILABLE_SPACE=$(df . | tail -1 | awk '{print $4}')
    if [ "$AVAILABLE_SPACE" -lt 1048576 ]; then  # Less than 1GB in KB
        print_warning "Low disk space available. This may affect PostgreSQL startup."
    else
        print_status "Disk space looks adequate"
    fi
}

# Clean up any existing PostgreSQL containers and volumes
clean_postgres() {
    print_action "Cleaning up existing PostgreSQL containers and data..."
    
    # Stop and remove containers
    docker-compose -f docker-compose.microservices.yml stop postgres 2>/dev/null || true
    docker-compose -f docker-compose.microservices.yml rm -f postgres 2>/dev/null || true
    
    # Remove the volume to start fresh
    docker volume rm tetris-game_postgres_data 2>/dev/null || true
    
    print_status "PostgreSQL cleanup complete"
}

# Start PostgreSQL with extended timeout
start_postgres_slow() {
    print_action "Starting PostgreSQL with extended timeouts..."
    
    # Start just PostgreSQL
    docker-compose -f docker-compose.microservices.yml up -d postgres
    
    print_info "Waiting for PostgreSQL to initialize (this may take 2-3 minutes)..."
    
    # Wait longer with more detailed feedback
    for i in {1..60}; do
        if docker-compose -f docker-compose.microservices.yml exec -T postgres pg_isready -U gamefi_user -d gamefi_platform >/dev/null 2>&1; then
            print_status "PostgreSQL is ready!"
            return 0
        fi
        
        # Show progress every 10 seconds
        if [ $((i % 10)) -eq 0 ]; then
            print_info "Still waiting... (${i}/60 attempts)"
            # Show container logs for debugging
            docker-compose -f docker-compose.microservices.yml logs --tail=3 postgres
        fi
        
        sleep 3
    done
    
    print_error "PostgreSQL failed to start within 3 minutes"
    return 1
}

# Test database connection and show info
test_postgres() {
    print_action "Testing PostgreSQL connection..."
    
    if docker-compose -f docker-compose.microservices.yml exec -T postgres psql -U gamefi_user -d gamefi_platform -c "SELECT version();" >/dev/null 2>&1; then
        print_status "Database connection successful!"
        
        # Show database info
        print_info "Database information:"
        docker-compose -f docker-compose.microservices.yml exec -T postgres psql -U gamefi_user -d gamefi_platform -c "
            SELECT 
                'Database: ' || current_database() as info
            UNION ALL
            SELECT 'User: ' || current_user
            UNION ALL 
            SELECT 'Tables: ' || count(*)::text FROM information_schema.tables WHERE table_schema = 'public';
        "
        
        # Test if our tables exist
        TABLE_COUNT=$(docker-compose -f docker-compose.microservices.yml exec -T postgres psql -U gamefi_user -d gamefi_platform -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' \n')
        
        if [ "$TABLE_COUNT" -gt 0 ]; then
            print_status "Found $TABLE_COUNT tables in database"
            
            # Show table list
            print_info "Tables created:"
            docker-compose -f docker-compose.microservices.yml exec -T postgres psql -U gamefi_user -d gamefi_platform -c "\dt"
        else
            print_warning "No tables found - initialization may have failed"
        fi
    else
        print_error "Database connection failed"
        return 1
    fi
}

# Show PostgreSQL logs
show_postgres_logs() {
    print_action "Recent PostgreSQL logs:"
    docker-compose -f docker-compose.microservices.yml logs --tail=20 postgres
}

# Alternative: Start PostgreSQL without initialization scripts
start_postgres_minimal() {
    print_action "Starting PostgreSQL without initialization scripts (for debugging)..."
    
    # Create a minimal docker-compose override
    cat > docker-compose.debug.yml << 'EOF'
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: gamefi_platform
      POSTGRES_USER: gamefi_user
      POSTGRES_PASSWORD: gamefi_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data_debug:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gamefi_user -d gamefi_platform"]
      interval: 5s
      timeout: 10s
      retries: 20
      start_period: 60s
volumes:
  postgres_data_debug:
EOF
    
    docker-compose -f docker-compose.debug.yml up -d postgres
    
    print_info "Waiting for minimal PostgreSQL setup..."
    timeout 120 bash -c 'until docker-compose -f docker-compose.debug.yml exec -T postgres pg_isready -U gamefi_user -d gamefi_platform; do sleep 2; done'
    
    if [ $? -eq 0 ]; then
        print_status "Minimal PostgreSQL is working!"
        print_info "You can now run the schema manually:"
        echo "  docker-compose -f docker-compose.debug.yml exec -T postgres psql -U gamefi_user -d gamefi_platform < shared/database/init.sql"
        echo "  docker-compose -f docker-compose.debug.yml exec -T postgres psql -U gamefi_user -d gamefi_platform < shared/database/seed.sql"
    else
        print_error "Even minimal PostgreSQL failed to start"
    fi
}

# Main troubleshooting function
main() {
    print_header "PostgreSQL Timeout Troubleshooting"
    
    echo "This script will help diagnose and fix PostgreSQL startup issues."
    echo ""
    echo "Choose an option:"
    echo "1. Quick fix (clean restart with extended timeout)"
    echo "2. Full diagnosis and clean restart"
    echo "3. Show PostgreSQL logs"
    echo "4. Start minimal PostgreSQL (no init scripts)"
    echo "5. Test existing PostgreSQL connection"
    echo ""
    read -p "Enter choice (1-5): " choice
    
    case $choice in
        1)
            clean_postgres
            start_postgres_slow
            test_postgres
            ;;
        2)
            check_docker_resources
            clean_postgres
            start_postgres_slow
            test_postgres
            ;;
        3)
            show_postgres_logs
            ;;
        4)
            start_postgres_minimal
            ;;
        5)
            test_postgres
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    print_header "Troubleshooting Complete"
    print_info "If PostgreSQL is working, you can now run:"
    echo "  ./scripts/start-gamefi-microservices.sh"
}

# Run main function
main 