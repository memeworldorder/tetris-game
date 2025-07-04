#!/bin/bash

# 🚀 GameFi Microservices Migration - Master Script
# Orchestrates the complete migration from monolithic to microservices architecture

set -e

echo "🚀 GameFi Microservices Migration"
echo "=================================="
echo ""
echo "This script will transform your GameFi platform from monolithic"
echo "to a microservices architecture with separate repositories for:"
echo ""
echo "✅ Raffle operations (completely separate)"
echo "✅ Social bots (Telegram/Twitter)"  
echo "✅ Individual games (separate repos)"
echo "✅ Core API (minimal services + Supabase)"
echo "✅ VRF calls (Supabase Edge Functions)"
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "   Install: https://cli.github.com/"
    exit 1
fi

# Check if logged into GitHub
if ! gh auth status &> /dev/null; then
    echo "❌ Please log into GitHub CLI first:"
    echo "   gh auth login"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo "   Install: https://nodejs.org/"
    exit 1
fi

# Check Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI is not installed."
    echo "   Installing now..."
    npm install -g supabase@latest
fi

echo "✅ All prerequisites met!"
echo ""

# Configuration
echo "📝 Configuration:"
read -p "Enter your GitHub organization name (e.g., MWOR-GameFi): " ORG_NAME
read -p "Make repositories private? (y/N): " -n 1 -r PRIVATE_REPOS
echo ""

if [[ $PRIVATE_REPOS =~ ^[Yy]$ ]]; then
    VISIBILITY="--private"
else
    VISIBILITY="--public"
fi

echo ""
echo "🎯 Migration Plan:"
echo "   Organization: $ORG_NAME"
echo "   Visibility: $(if [[ $VISIBILITY == "--private" ]]; then echo "Private"; else echo "Public"; fi)"
echo ""

read -p "Continue with migration? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 1
fi

# Update configuration in scripts
echo "🔧 Updating configuration in migration scripts..."
sed -i "s/ORG_NAME=\"MWOR-GameFi\"/ORG_NAME=\"$ORG_NAME\"/" 01-create-repositories.sh
sed -i "s/VISIBILITY=\"--private\"/VISIBILITY=\"$VISIBILITY\"/" 01-create-repositories.sh

echo ""
echo "🚀 Starting migration process..."
echo ""

# Phase 1: Create repositories
echo "📋 Phase 1: Creating repositories..."
if ./01-create-repositories.sh; then
    echo "✅ Phase 1 completed successfully!"
else
    echo "❌ Phase 1 failed. Check the output above."
    exit 1
fi

echo ""
read -p "Continue with Phase 2 (Core API setup)? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration paused. You can resume by running individual scripts."
    exit 0
fi

# Phase 2: Core API setup
echo "🏗️ Phase 2: Setting up Core API..."
if ./02-setup-core-api.sh; then
    echo "✅ Phase 2 completed successfully!"
else
    echo "❌ Phase 2 failed. Check the output above."
    exit 1
fi

echo ""
read -p "Continue with Phase 3 (Raffle system extraction)? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration paused. You can resume by running individual scripts."
    exit 0
fi

# Phase 3: Raffle system extraction
echo "🎲 Phase 3: Extracting Raffle System..."
if ./03-extract-raffle-system.sh; then
    echo "✅ Phase 3 completed successfully!"
else
    echo "❌ Phase 3 failed. Check the output above."
    exit 1
fi

echo ""
echo "🎉 Migration completed successfully!"
echo ""
echo "📁 Created repositories:"
echo "   🏗️ $ORG_NAME/gamefi-core-api"
echo "   🎲 $ORG_NAME/gamefi-raffle-system"
echo "   🤖 $ORG_NAME/gamefi-telegram-bot"
echo "   🐦 $ORG_NAME/gamefi-twitter-bot"
echo "   📱 $ORG_NAME/gamefi-social-hub"
echo "   🎮 $ORG_NAME/game-tetris"
echo "   🚀 $ORG_NAME/game-asteroid-blaster"
echo "   🧩 $ORG_NAME/game-memory-challenge"
echo "   🎯 $ORG_NAME/gamefi-admin-dashboard"
echo "   📊 $ORG_NAME/gamefi-analytics-service"
echo "   📦 $ORG_NAME/gamefi-sdk"
echo ""
echo "🔧 Next steps:"
echo "   1. Configure environment variables in each repository"
echo "   2. Set up Supabase projects and credentials"
echo "   3. Deploy services individually"
echo "   4. Test inter-service communication"
echo ""
echo "📖 Documentation:"
echo "   - Each repository has detailed setup instructions"
echo "   - Check README.md in each service directory"
echo "   - Review migration-scripts/README.md for complete guide"
echo ""
echo "🌐 Example service URLs (after deployment):"
echo "   - Core API: https://api.gamefi.mwor.com"
echo "   - Raffle System: https://raffle.gamefi.mwor.com"
echo "   - Telegram Bot: https://telegram.gamefi.mwor.com"
echo "   - Twitter Bot: https://twitter.gamefi.mwor.com"
echo ""
echo "🚀 Your GameFi platform is now ready for microservices architecture!"