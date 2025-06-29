#!/bin/bash

# Tetris Game API - Environment Setup Script
# This script helps set up all required environment variables for deployment

set -e

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

prompt_user() {
    local prompt="$1"
    local default="$2"
    local secret="$3"
    
    if [ "$secret" = "true" ]; then
        echo -n -e "${BLUE}$prompt${NC}"
        [ -n "$default" ] && echo -n " (default: ***)"
        echo -n ": "
        read -s value
        echo ""
    else
        echo -n -e "${BLUE}$prompt${NC}"
        [ -n "$default" ] && echo -n " (default: $default)"
        echo -n ": "
        read value
    fi
    
    if [ -z "$value" ] && [ -n "$default" ]; then
        value="$default"
    fi
    
    echo "$value"
}

# Check if Vercel CLI is installed
check_vercel_cli() {
    if ! command -v vercel &> /dev/null; then
        log_error "Vercel CLI is not installed. Please install it first:"
        echo "npm install -g vercel"
        exit 1
    fi
    
    log_success "Vercel CLI found"
}

# Login to Vercel if needed
ensure_vercel_login() {
    if ! vercel whoami &> /dev/null; then
        log_info "Please login to Vercel..."
        vercel login
    fi
    
    local user=$(vercel whoami)
    log_success "Logged in as: $user"
}

# Setup environment variables
setup_environment_variables() {
    log_info "Setting up environment variables for Game API microservice..."
    echo ""
    
    # Core Supabase Configuration
    echo -e "${GREEN}=== Supabase Configuration ===${NC}"
    supabase_url=$(prompt_user "Supabase Project URL")
    supabase_key=$(prompt_user "Supabase Service Role Key" "" "true")
    
    # Solana Configuration
    echo ""
    echo -e "${GREEN}=== Solana Configuration ===${NC}"
    solana_rpc=$(prompt_user "Solana RPC URL" "https://api.mainnet-beta.solana.com")
    mwor_mint=$(prompt_user "MWOR Token Mint Address")
    mworgov_mint=$(prompt_user "MWORGOV Token Mint Address (optional)")
    price_oracle=$(prompt_user "Switchboard Price Oracle Feed (optional)")
    vrf_queue=$(prompt_user "Switchboard VRF Queue (optional)")
    temp_seed=$(prompt_user "Temp Address Derive Seed" "lifebank")
    
    # Webhook Configuration
    echo ""
    echo -e "${GREEN}=== Webhook Configuration ===${NC}"
    helius_secret=$(prompt_user "Helius Webhook Secret" "" "true")
    
    # Game Rules
    echo ""
    echo -e "${GREEN}=== Game Rules Configuration ===${NC}"
    free_life_limit=$(prompt_user "Free Life Limit Per IP/Day" "1")
    paid_life_cap=$(prompt_user "Paid Life Cap Per Day" "10")
    bonus_divisor=$(prompt_user "Bonus Life Divisor" "50000")
    bonus_cap=$(prompt_user "Bonus Life Cap" "40")
    
    # Pricing Configuration
    echo ""
    echo -e "${GREEN}=== Pricing Configuration ===${NC}"
    price_cheap=$(prompt_user "Cheap Life Price (USD)" "0.03")
    price_mid=$(prompt_user "Mid Life Price (USD)" "0.09")
    price_high=$(prompt_user "High Life Price (USD)" "0.27")
    
    # Security
    echo ""
    echo -e "${GREEN}=== Security Configuration ===${NC}"
    cron_secret=$(prompt_user "CRON Secret Token" "" "true")
    if [ -z "$cron_secret" ]; then
        cron_secret=$(openssl rand -hex 32)
        log_info "Generated CRON secret: $cron_secret"
    fi
    
    # Add environment variables to Vercel
    echo ""
    log_info "Adding environment variables to Vercel..."
    
    # Required variables
    echo "$supabase_url" | vercel env add SUPABASE_URL production
    echo "$supabase_key" | vercel env add SUPABASE_SERVICE_KEY production
    echo "$mwor_mint" | vercel env add MWOR_MINT production
    
    # Solana config
    echo "$solana_rpc" | vercel env add SOLANA_RPC production
    [ -n "$mworgov_mint" ] && echo "$mworgov_mint" | vercel env add MWORGOV_MINT production
    [ -n "$price_oracle" ] && echo "$price_oracle" | vercel env add PRICE_ORACLE_FEED production
    [ -n "$vrf_queue" ] && echo "$vrf_queue" | vercel env add VRF_QUEUE production
    echo "$temp_seed" | vercel env add TEMP_ADDR_DERIVE_SEED production
    
    # Webhook
    [ -n "$helius_secret" ] && echo "$helius_secret" | vercel env add HELIUS_WEBHOOK_SECRET production
    
    # Game rules
    echo "$free_life_limit" | vercel env add FREE_LIFE_LIMIT_PER_IP production
    echo "$paid_life_cap" | vercel env add PAID_LIFE_CAP production
    echo "$bonus_divisor" | vercel env add BONUS_DIVISOR production
    echo "$bonus_cap" | vercel env add BONUS_CAP production
    
    # Pricing
    echo "$price_cheap" | vercel env add PAID_LIFE_USD_CHEAP production
    echo "$price_mid" | vercel env add PAID_LIFE_USD_MID production
    echo "$price_high" | vercel env add PAID_LIFE_USD_HIGH production
    
    # Security
    echo "$cron_secret" | vercel env add CRON_SECRET production
    echo "production" | vercel env add NODE_ENV production
    
    log_success "Environment variables added to production"
    
    # Ask if user wants to add to preview as well
    echo ""
    read -p "Do you want to copy these variables to preview environment? (y/N): " copy_preview
    
    if [[ $copy_preview =~ ^[Yy]$ ]]; then
        log_info "Copying variables to preview environment..."
        
        # Copy all variables to preview (this is a simplified approach)
        vercel env pull .env.production --environment production
        vercel env add .env.production preview < .env.production
        
        log_success "Variables copied to preview environment"
        rm -f .env.production
    fi
}

# Create local .env file
create_local_env() {
    echo ""
    read -p "Do you want to create a local .env.local file for development? (y/N): " create_local
    
    if [[ $create_local =~ ^[Yy]$ ]]; then
        log_info "Creating .env.local file..."
        
        vercel env pull .env.local --environment development
        
        if [ -f .env.local ]; then
            log_success "Created .env.local file"
            log_warning "Remember to add your actual values to .env.local for local development"
        else
            log_warning "Could not create .env.local file. You can create it manually."
        fi
    fi
}

# Show setup summary
show_setup_summary() {
    echo ""
    echo -e "${GREEN}=== Setup Summary ===${NC}"
    echo "✅ Environment variables configured for production"
    echo "✅ Vercel deployment ready"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Run: pnpm run deploy:preview  (for preview deployment)"
    echo "2. Run: pnpm run deploy         (for production deployment)"
    echo "3. Or use: ./scripts/deploy.sh production"
    echo ""
    echo -e "${YELLOW}Important:${NC}"
    echo "• Set up your Supabase database using scripts/supabase-schema.sql"
    echo "• Configure Helius webhook to point to your deployed URL"
    echo "• Test all API endpoints after deployment"
    echo "• The CRON job will run automatically on Vercel"
    echo ""
    echo -e "${BLUE}Environment variables added:${NC}"
    vercel env ls
}

# Main setup function
main() {
    log_info "Starting Tetris Game API environment setup..."
    echo ""
    
    check_vercel_cli
    ensure_vercel_login
    setup_environment_variables
    create_local_env
    show_setup_summary
    
    echo ""
    log_success "🎉 Environment setup completed!"
}

# Handle help
if [[ "${1:-}" == "help" ]] || [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    echo "Tetris Game API - Environment Setup Script"
    echo ""
    echo "This script helps you configure all required environment variables"
    echo "for the Game API microservice deployment to Vercel."
    echo ""
    echo "Usage: $0"
    echo ""
    echo "The script will prompt you for all required configuration values"
    echo "and automatically add them to your Vercel project."
    echo ""
    exit 0
fi

# Run main setup
main 