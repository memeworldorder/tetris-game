#!/bin/bash

# Tetris Game API - Vercel Deployment Script
# This script handles the complete deployment process to Vercel

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm is not installed. Please install it first:"
        echo "npm install -g pnpm"
        exit 1
    fi
    
    if ! command -v vercel &> /dev/null; then
        log_error "Vercel CLI is not installed. Please install it first:"
        echo "npm install -g vercel"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    pnpm install
    log_success "Dependencies installed"
}

# Validate TypeScript and linting
validate_code() {
    log_info "Validating code..."
    
    if ! pnpm type-check; then
        log_error "TypeScript validation failed"
        exit 1
    fi
    
    if ! pnpm lint; then
        log_warning "Linting issues found (continuing anyway)"
    fi
    
    log_success "Code validation completed"
}

# Build the project
build_project() {
    log_info "Building project..."
    
    if ! pnpm build; then
        log_error "Build failed"
        exit 1
    fi
    
    log_success "Build completed"
}

# Check environment variables
check_environment() {
    log_info "Checking environment variables..."
    
    required_vars=(
        "SUPABASE_URL"
        "SUPABASE_SERVICE_KEY"
        "MWOR_MINT"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ] && ! vercel env ls | grep -q "$var"; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        log_info "Add them using: pnpm env:add"
        exit 1
    fi
    
    log_success "Environment variables check passed"
}

# Deploy to Vercel
deploy_to_vercel() {
    local environment=${1:-preview}
    
    log_info "Deploying to Vercel (${environment})..."
    
    if [ "$environment" = "production" ]; then
        vercel --prod --yes
        log_success "Production deployment completed!"
        log_info "Don't forget to:"
        log_info "1. Set up Helius webhook pointing to your production URL"
        log_info "2. Update your frontend to use the new API endpoints"
        log_info "3. Test the payment flow end-to-end"
    else
        vercel --yes
        log_success "Preview deployment completed!"
    fi
}

# Show deployment URLs
show_deployment_info() {
    log_info "Getting deployment information..."
    
    echo ""
    echo "🚀 Deployment URLs:"
    echo "   Preview: $(vercel ls | head -n 2 | tail -n 1 | awk '{print $2}')"
    echo "   Production: https://$(vercel ls --prod | head -n 2 | tail -n 1 | awk '{print $2}')"
    echo ""
    echo "📋 Important endpoints:"
    echo "   POST /api/claimDaily     - Daily life claiming"
    echo "   POST /api/buyLife        - Life purchases"
    echo "   POST /api/endRound       - Score submission"
    echo "   GET  /api/leaderboard/daily - Daily leaderboard"
    echo "   POST /api/hel/trx        - Helius webhook"
    echo "   POST /api/resetMidnight  - Daily reset (CRON)"
    echo ""
}

# Main deployment function
main() {
    local environment=${1:-preview}
    
    log_info "Starting Tetris Game API deployment..."
    log_info "Target environment: ${environment}"
    echo ""
    
    # Run all deployment steps
    check_prerequisites
    install_dependencies
    validate_code
    build_project
    check_environment
    deploy_to_vercel "$environment"
    show_deployment_info
    
    echo ""
    log_success "🎉 Deployment completed successfully!"
    
    if [ "$environment" = "production" ]; then
        echo ""
        log_info "Post-deployment checklist:"
        log_info "□ Configure Helius webhook"
        log_info "□ Test all API endpoints"
        log_info "□ Verify CRON job is working"
        log_info "□ Update frontend API calls"
        log_info "□ Test payment flow"
        log_info "□ Monitor logs for errors"
    fi
}

# Handle script arguments
case "${1:-preview}" in
    "prod"|"production")
        main "production"
        ;;
    "preview"|"staging")
        main "preview"
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [production|preview|help]"
        echo ""
        echo "Commands:"
        echo "  production  Deploy to production"
        echo "  preview     Deploy to preview (default)"
        echo "  help        Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0                    # Deploy to preview"
        echo "  $0 preview           # Deploy to preview"
        echo "  $0 production        # Deploy to production"
        ;;
    *)
        log_error "Unknown environment: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac 