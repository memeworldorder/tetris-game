#!/bin/bash

# 🎮 GameFi Microservices Startup Script
# This script automatically creates and starts all microservices with database initialization

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo -e "\n${PURPLE}🎮 ================================${NC}"
    echo -e "${PURPLE}🎮 $1${NC}"
    echo -e "${PURPLE}🎮 ================================${NC}\n"
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

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    print_status "Docker is running"
}

# Check if docker-compose is available
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        print_error "docker-compose is not installed. Please install docker-compose first."
        exit 1
    fi
    print_status "docker-compose is available"
}

# Clean up any existing containers
cleanup_containers() {
    print_action "Cleaning up existing containers..."
    docker-compose -f docker-compose.microservices.yml down --remove-orphans >/dev/null 2>&1 || true
    print_status "Cleanup complete"
}

# Start infrastructure services first
start_infrastructure() {
    print_action "Starting infrastructure services (PostgreSQL, Redis, RabbitMQ, ClickHouse)..."
    
    docker-compose -f docker-compose.microservices.yml up -d postgres redis rabbitmq clickhouse
    
    print_info "Waiting for infrastructure services to be healthy..."
    
    # Wait for PostgreSQL
    print_info "Waiting for PostgreSQL..."
    timeout 60 bash -c 'until docker-compose -f docker-compose.microservices.yml exec -T postgres pg_isready -U gamefi_user -d gamefi_platform; do sleep 2; done'
    
    # Wait for Redis
    print_info "Waiting for Redis..."
    timeout 30 bash -c 'until docker-compose -f docker-compose.microservices.yml exec -T redis redis-cli ping | grep PONG; do sleep 2; done'
    
    # Wait for RabbitMQ
    print_info "Waiting for RabbitMQ..."
    timeout 60 bash -c 'until docker-compose -f docker-compose.microservices.yml exec -T rabbitmq rabbitmq-diagnostics ping; do sleep 2; done'
    
    # Wait for ClickHouse
    print_info "Waiting for ClickHouse..."
    timeout 60 bash -c 'until docker-compose -f docker-compose.microservices.yml exec -T clickhouse clickhouse-client --query "SELECT 1"; do sleep 2; done'
    
    print_status "All infrastructure services are healthy!"
}

# Check if User Service can be built (has dependencies installed)
check_user_service() {
    if [ ! -d "services/user-service/node_modules" ]; then
        print_action "Installing User Service dependencies..."
        cd services/user-service
        npm install
        cd ../..
        print_status "User Service dependencies installed"
    else
        print_status "User Service dependencies already installed"
    fi
}

# Start the User Service (core service)
start_user_service() {
    print_action "Starting User Service..."
    docker-compose -f docker-compose.microservices.yml up -d user-service
    
    print_info "Waiting for User Service to be healthy..."
    timeout 90 bash -c 'until curl -f http://localhost:3010/health >/dev/null 2>&1; do sleep 3; done'
    
    print_status "User Service is running!"
}

# Check database has data
verify_database() {
    print_action "Verifying database initialization..."
    
    USER_COUNT=$(docker-compose -f docker-compose.microservices.yml exec -T postgres psql -U gamefi_user -d gamefi_platform -t -c "SELECT COUNT(*) FROM users;" | tr -d ' \n')
    
    if [ "$USER_COUNT" -gt 0 ]; then
        print_status "Database has $USER_COUNT users - data loaded successfully!"
    else
        print_warning "Database seems empty, but schema should be created"
    fi
}

# Display service URLs
show_service_urls() {
    print_header "GameFi Microservices Running!"
    
    echo -e "${GREEN}🎮 Core Services:${NC}"
    echo -e "  User Service:      http://localhost:3010"
    echo -e "  User Service Health: http://localhost:3010/health"
    echo -e ""
    
    echo -e "${BLUE}📊 Infrastructure:${NC}"
    echo -e "  PostgreSQL:        localhost:5432 (gamefi_user/gamefi_password)"
    echo -e "  Redis:             localhost:6379"
    echo -e "  RabbitMQ:          localhost:15672 (gamefi/gamefi_queue)"
    echo -e "  ClickHouse:        localhost:8123"
    echo -e ""
    
    echo -e "${YELLOW}🔧 Quick Tests:${NC}"
    echo -e "  curl http://localhost:3010/health"
    echo -e "  curl http://localhost:3010/api/auth/status"
    echo -e "  curl http://localhost:3010/"
    echo -e ""
    
    echo -e "${PURPLE}📚 Database Access:${NC}"
    echo -e "  docker-compose -f docker-compose.microservices.yml exec postgres psql -U gamefi_user -d gamefi_platform"
    echo -e ""
    
    echo -e "${CYAN}🛑 To Stop Services:${NC}"
    echo -e "  docker-compose -f docker-compose.microservices.yml down"
    echo -e ""
}

# Main execution
main() {
    print_header "Starting GameFi Microservices Platform"
    
    # Pre-flight checks
    print_info "Running pre-flight checks..."
    check_docker
    check_docker_compose
    
    # Clean slate
    cleanup_containers
    
    # Start infrastructure
    start_infrastructure
    
    # Verify database
    verify_database
    
    # Check user service
    check_user_service
    
    # Start core service
    start_user_service
    
    # Show results
    show_service_urls
    
    print_header "Setup Complete! 🚀"
    print_status "Your GameFi microservices platform is ready for development!"
    print_info "Press Ctrl+C to stop all services when you're done."
    
    # Keep script running and show logs
    print_action "Showing live logs (Ctrl+C to stop)..."
    docker-compose -f docker-compose.microservices.yml logs -f user-service
}

# Handle Ctrl+C gracefully
trap 'print_info "\nStopping services..."; docker-compose -f docker-compose.microservices.yml down; print_status "All services stopped. Goodbye! 👋"; exit 0' INT

# Run main function
main 