#!/bin/bash

# 🚀 SUPABASE EDGE FUNCTIONS AUTO-SETUP SCRIPT
# This script uses the Supabase CLI to create and deploy all edge functions

set -e  # Exit on any error

echo "🔥 SUPABASE EDGE FUNCTIONS AUTO-SETUP"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project configuration
PROJECT_REF="qtwmykpyhcvfavjgncty"
SUPABASE_URL="https://qtwmykpyhcvfavjgncty.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTU2MDcsImV4cCI6MjA2NjYzMTYwN30.lhpqOaxVxadQamtHT_vx3-JyoKyThV3uMGMLvOMHRyU"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA1NTYwNywiZXhwIjoyMDY2NjMxNjA3fQ.fwu/6tRriMFnAYMa2UH6HoKu2uMdCU8P8wScHcX3Us0kFbOl0pfQ0vjPUM34XRyRu82LZ0dVCmAiXUJjlVpC2A"

# Function to print colored output
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

# Check if Supabase CLI is installed
check_cli() {
    print_info "Checking Supabase CLI installation..."
    
    if ! command -v supabase &> /dev/null; then
        print_warning "Supabase CLI not found. Installing via recommended method..."
        
        # Check if we're on Linux/macOS and try different installation methods
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux installation
            print_info "Installing Supabase CLI for Linux..."
            if command -v curl &> /dev/null; then
                curl -fsSL https://supabase.com/install.sh | sh
                export PATH="$HOME/.local/bin:$PATH"
            elif command -v wget &> /dev/null; then
                wget -qO- https://supabase.com/install.sh | sh
                export PATH="$HOME/.local/bin:$PATH"
            else
                print_error "Neither curl nor wget found. Please install Supabase CLI manually:"
                print_info "Visit: https://github.com/supabase/cli#install-the-cli"
                exit 1
            fi
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS installation
            print_info "Installing Supabase CLI for macOS..."
            if command -v brew &> /dev/null; then
                brew install supabase/tap/supabase
            else
                curl -fsSL https://supabase.com/install.sh | sh
                export PATH="$HOME/.local/bin:$PATH"
            fi
        else
            print_error "Unsupported OS. Please install Supabase CLI manually:"
            print_info "Visit: https://github.com/supabase/cli#install-the-cli"
            exit 1
        fi
        
        # Verify installation
        if command -v supabase &> /dev/null; then
            print_status "Supabase CLI installed successfully"
        else
            print_error "Supabase CLI installation failed. Please install manually:"
            print_info "Visit: https://github.com/supabase/cli#install-the-cli"
            exit 1
        fi
    else
        print_status "Supabase CLI is already installed"
        supabase --version
    fi
}

# Initialize Supabase project
init_project() {
    print_info "Initializing Supabase project..."
    
    if [ ! -d "supabase" ]; then
        supabase init
        print_status "Supabase project initialized"
    else
        print_status "Supabase project already initialized"
    fi
}

# Login and link project
link_project() {
    print_info "Linking to Supabase project..."
    
    # Check if already linked
    if supabase status &> /dev/null; then
        print_status "Project already linked"
    else
        print_warning "Please login to Supabase when prompted..."
        supabase login
        supabase link --project-ref $PROJECT_REF
        print_status "Project linked successfully"
    fi
}

# Create edge functions
create_functions() {
    print_info "Creating edge functions..."
    
    # List of functions to create
    functions=("handle-game-start" "handle-game-end" "daily-reset" "verify-wallet")
    
    for func in "${functions[@]}"; do
        if [ ! -d "supabase/functions/$func" ]; then
            print_info "Creating function: $func"
            supabase functions new $func
            print_status "Created function: $func"
        else
            print_status "Function $func already exists"
        fi
    done
}

# Set environment secrets
set_secrets() {
    print_info "Setting environment secrets..."
    
    # Generate a random JWT secret if not provided
    JWT_SECRET=${JWT_SECRET:-"gamefi-tetris-jwt-secret-$(openssl rand -hex 32)"}
    
    supabase secrets set JWT_SECRET="$JWT_SECRET"
    supabase secrets set SUPABASE_URL="$SUPABASE_URL"
    supabase secrets set SUPABASE_ANON_KEY="$ANON_KEY"
    supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
    
    print_status "Environment secrets set successfully"
    print_info "JWT Secret: $JWT_SECRET"
    print_info "All Supabase keys configured"
}

# Deploy functions
deploy_functions() {
    print_info "Deploying edge functions..."
    
    # Check if functions have content (not just templates)
    if [ -s "supabase/functions/handle-game-start/index.ts" ]; then
        supabase functions deploy
        print_status "All functions deployed successfully"
    else
        print_warning "Functions appear to be empty templates"
        print_info "Please add function code before deploying"
        print_info "See SUPABASE_CLI_SETUP.md for function code examples"
    fi
}

# Test functions
test_functions() {
    print_info "Testing deployed functions..."
    
    # Test handle-game-start function
    print_info "Testing handle-game-start function..."
    
    response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/handle-game-start" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ANON_KEY" \
        -d '{"wallet_address":"test-wallet-123","game_type":"tetris"}' \
        -w "%{http_code}")
    
    http_code="${response: -3}"
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "400" ]; then
        print_status "Function is responding (HTTP $http_code)"
    else
        print_warning "Function test returned HTTP $http_code"
    fi
}

# Create import map
create_import_map() {
    print_info "Creating import map..."
    
    cat > supabase/functions/import_map.json << 'EOF'
{
  "imports": {
    "std/": "https://deno.land/std@0.208.0/",
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.39.7",
    "@supabase/functions-js": "https://esm.sh/@supabase/functions-js@2.1.5",
    "cors": "https://deno.land/x/cors@v1.2.2/mod.ts"
  }
}
EOF
    
    print_status "Import map created"
}

# Create config file
create_config() {
    print_info "Creating Supabase config..."
    
    if [ ! -f "supabase/config.toml" ]; then
        cat > supabase/config.toml << 'EOF'
[api]
enabled = true
port = 54321

[db]
port = 54322
major_version = 15

[functions]
verify_jwt = false

[auth]
enabled = true

[studio]
enabled = true
port = 54323
EOF
        print_status "Config file created"
    else
        print_status "Config file already exists"
    fi
}

# Show next steps
show_next_steps() {
    echo ""
    echo "🎉 SETUP COMPLETE!"
    echo "=================="
    echo ""
    print_info "Your Supabase Edge Functions are ready!"
    echo ""
    print_info "Next steps:"
    echo "1. Add function code to the created templates in supabase/functions/"
    echo "2. Run: supabase functions deploy"
    echo "3. Test your functions at: $SUPABASE_URL/functions/v1/"
    echo ""
    print_info "Available functions:"
    echo "• handle-game-start - Start new game sessions"
    echo "• handle-game-end - Complete game sessions"
    echo "• daily-reset - Reset daily lives (cron job)"
    echo "• verify-wallet - Verify Solana wallet signatures"
    echo ""
    print_info "Useful commands:"
    echo "• supabase functions serve    - Test locally"
    echo "• supabase functions logs     - View logs"
    echo "• supabase functions list     - List functions"
    echo "• supabase status            - Check status"
    echo ""
    print_info "Documentation:"
    echo "• See SUPABASE_CLI_SETUP.md for detailed instructions"
    echo "• See SUPABASE_DEPLOYMENT_GUIDE.md for usage examples"
}

# Main execution
main() {
    echo "Starting Supabase Edge Functions setup..."
    echo ""
    
    check_cli
    init_project
    link_project
    create_import_map
    create_config
    create_functions
    set_secrets
    
    # Ask user if they want to deploy (functions need code first)
    echo ""
    read -p "Do you want to deploy the functions now? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_functions
        test_functions
    else
        print_info "Skipping deployment. Add function code first, then run: supabase functions deploy"
    fi
    
    show_next_steps
}

# Run main function
main "$@" 