#!/bin/bash

# 🎯 Simple GameFi Deployment - Core Services Only
# Deploy the essential services first to get working quickly

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎯 SIMPLE GAMEFI DEPLOYMENT${NC}"
echo -e "${BLUE}===========================${NC}"
echo ""
echo -e "${YELLOW}This script deploys only the CORE services needed for a working GameFi platform:${NC}"
echo -e "  • Gaming Hub (Frontend)"
echo -e "  • API Gateway (Backend)"
echo -e "  • User Service (Authentication)"
echo -e "  • Game Engine (Game Logic)"
echo -e "  • Payment Service (Transactions)"
echo ""
echo -e "${YELLOW}Database: Uses your existing Supabase setup${NC}"
echo ""

# Core services only
CORE_SERVICES=(
    "gaming-hub"
    "api-gateway"
    "user-service"
    "game-engine"
    "payment-service"
)

# Option 1: Vercel (Simplest)
deploy_vercel() {
    echo -e "${BLUE}🚀 Option 1: Vercel Deployment${NC}"
    echo ""
    
    # Check if vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        echo -e "${YELLOW}Installing Vercel CLI...${NC}"
        npm install -g vercel
    fi
    
    # Deploy to Vercel
    echo -e "${YELLOW}Deploying to Vercel...${NC}"
    vercel --prod --confirm
    
    echo -e "${GREEN}✅ Deployed to Vercel!${NC}"
    echo -e "${BLUE}Your app is available at the URL shown above${NC}"
}

# Option 2: Render.com (Good alternative)
deploy_render() {
    echo -e "${BLUE}🚀 Option 2: Render.com Deployment${NC}"
    echo ""
    
    # Create render.yaml
    cat > render.yaml << 'EOF'
services:
  - type: web
    name: gamefi-tetris
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
             - key: NEXT_PUBLIC_SUPABASE_URL
         value: https://qtwmykpyhcvfavjgncty.supabase.co
       - key: NEXT_PUBLIC_SUPABASE_ANON_KEY
         value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTU2MDcsImV4cCI6MjA2NjYzMTYwN30.lhpqOaxVxadQamtHT_vx3-JyoKyThV3uMGMLvOMHRyU
       - key: SUPABASE_SERVICE_ROLE_KEY
         value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA1NTYwNywiZXhwIjoyMDY2NjMxNjA3fQ.L8sIHwA9HFHS8tLn1KNg8Ei8V-C0c8EsjK3i3frQtQo
       - key: JWT_SECRET
         value: fwu/6tRriMFnAYMa2UH6HoKu2uMdCU8P8wScHcX3Us0kFbOl0pfQ0vjPUM34XRyRu82LZ0dVCmAiXUJjlVpC2A==
      - key: SOLANA_RPC_URL
        value: https://api.mainnet-beta.solana.com
EOF
    
    echo -e "${GREEN}✅ render.yaml created${NC}"
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Go to https://render.com"
    echo "2. Connect your GitHub repository"
    echo "3. Render will automatically deploy using render.yaml"
    echo ""
}

# Option 3: Railway (Microservices)
deploy_railway_simple() {
    echo -e "${BLUE}🚀 Option 3: Railway Deployment (Microservices)${NC}"
    echo ""
    
    # Check if railway CLI is installed
    if ! command -v railway &> /dev/null; then
        echo -e "${YELLOW}Installing Railway CLI...${NC}"
        npm install -g @railway/cli
    fi
    
    # Check if logged in
    if ! railway whoami &> /dev/null; then
        echo -e "${RED}Please log in to Railway first:${NC}"
        echo "railway login"
        exit 1
    fi
    
    # Initialize project
    echo -e "${YELLOW}Creating Railway project...${NC}"
    railway init --name gamefi-simple
    
    # Deploy core services
    for service in "${CORE_SERVICES[@]}"; do
        if [ -d "services/$service" ]; then
            echo -e "${YELLOW}Deploying $service...${NC}"
            cd "services/$service"
            
                         # Set environment variables with ACTUAL credentials
             railway variables set NODE_ENV=production
             railway variables set SUPABASE_URL="https://qtwmykpyhcvfavjgncty.supabase.co"
             railway variables set SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTU2MDcsImV4cCI6MjA2NjYzMTYwN30.lhpqOaxVxadQamtHT_vx3-JyoKyThV3uMGMLvOMHRyU"
             railway variables set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA1NTYwNywiZXhwIjoyMDY2NjMxNjA3fQ.L8sIHwA9HFHS8tLn1KNg8Ei8V-C0c8EsjK3i3frQtQo"
             railway variables set JWT_SECRET="fwu/6tRriMFnAYMa2UH6HoKu2uMdCU8P8wScHcX3Us0kFbOl0pfQ0vjPUM34XRyRu82LZ0dVCmAiXUJjlVpC2A=="
             railway variables set SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
            
            # Deploy
            railway up --service "$service"
            
            cd "../.."
            echo -e "${GREEN}✅ $service deployed${NC}"
        fi
    done
    
    echo -e "${GREEN}✅ Core services deployed to Railway!${NC}"
}

# Main menu
show_menu() {
    echo -e "${YELLOW}Choose your deployment option:${NC}"
    echo ""
    echo "1. Vercel (Simplest - monolith Next.js app)"
    echo "2. Render.com (Easy - managed platform)"
    echo "3. Railway (Microservices - most scalable)"
    echo "4. Show current setup status"
    echo "5. Exit"
    echo ""
    read -p "Enter your choice (1-5): " choice
    
    case $choice in
        1)
            deploy_vercel
            ;;
        2)
            deploy_render
            ;;
        3)
            deploy_railway_simple
            ;;
        4)
            show_status
            ;;
        5)
            echo -e "${GREEN}Goodbye! 👋${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice. Please try again.${NC}"
            show_menu
            ;;
    esac
}

# Show current setup status
show_status() {
    echo -e "${BLUE}📊 Current Setup Status${NC}"
    echo ""
    
    # Check if Next.js app exists
    if [ -f "package.json" ]; then
        echo -e "${GREEN}✅ Next.js application found${NC}"
    else
        echo -e "${RED}❌ Next.js application not found${NC}"
    fi
    
    # Check if services exist
    echo -e "${YELLOW}Microservices:${NC}"
    for service in "${CORE_SERVICES[@]}"; do
        if [ -d "services/$service" ]; then
            echo -e "  ✅ $service"
        else
            echo -e "  ❌ $service"
        fi
    done
    
    # Check if Supabase is configured
    if [ -f ".env.local" ] && grep -q "SUPABASE" .env.local; then
        echo -e "${GREEN}✅ Supabase configuration found${NC}"
    else
        echo -e "${YELLOW}⚠️  Supabase configuration needs to be set${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}📋 Recommendations:${NC}"
    echo "• If you want to deploy quickly: Choose Vercel (Option 1)"
    echo "• If you want managed microservices: Choose Railway (Option 3)"
    echo "• If you want a middle ground: Choose Render (Option 2)"
    echo ""
}

# Pre-flight checks
preflight_checks() {
    echo -e "${BLUE}🔍 Running pre-flight checks...${NC}"
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed${NC}"
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] && [ ! -d "services" ]; then
        echo -e "${RED}❌ Please run this script from the root of your GameFi project${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Pre-flight checks passed${NC}"
    echo ""
}

# Main execution
main() {
    preflight_checks
    show_status
    show_menu
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}Deployment interrupted. You can run this script again anytime.${NC}"; exit 1' INT

# Run main function
main "$@" 