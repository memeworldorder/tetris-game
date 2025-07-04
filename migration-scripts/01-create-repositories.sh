#!/bin/bash

# 🚀 Repository Creation Script for GameFi Microservices Migration
# This script creates all the required repositories for the separated architecture

set -e

echo "🏗️  GameFi Microservices Migration - Repository Creation"
echo "======================================================="

# Configuration
ORG_NAME="MWOR-GameFi"  # Change this to your GitHub organization
VISIBILITY="--private"   # Use --public if you want public repos

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it first:"
    echo "   https://cli.github.com/"
    exit 1
fi

# Check if user is logged into GitHub CLI
if ! gh auth status &> /dev/null; then
    echo "❌ Please log into GitHub CLI first:"
    echo "   gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is ready"

# Repository definitions
declare -A REPOS=(
    ["gamefi-core-api"]="Minimal core API with essential services - auth, lives, payments, basic verification"
    ["gamefi-raffle-system"]="Standalone raffle and lottery operations with VRF integration"
    ["gamefi-telegram-bot"]="Telegram social integration and community management"
    ["gamefi-twitter-bot"]="Twitter social media automation and announcements"
    ["gamefi-social-hub"]="Cross-platform social coordination and campaign management"
    ["game-tetris"]="Standalone Tetris game with GameFi SDK integration"
    ["game-asteroid-blaster"]="Asteroid Blaster game with GameFi SDK integration"
    ["game-memory-challenge"]="Memory Challenge game with GameFi SDK integration"
    ["gamefi-admin-dashboard"]="Administrative interface and multi-service management"
    ["gamefi-analytics-service"]="Data processing, analytics, and business intelligence"
    ["gamefi-sdk"]="JavaScript SDK for easy game integration with GameFi platform"
)

echo ""
echo "📋 Creating ${#REPOS[@]} repositories:"
for repo in "${!REPOS[@]}"; do
    echo "   - $repo"
done

echo ""
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Create repositories
echo ""
echo "🔨 Creating repositories..."

for repo_name in "${!REPOS[@]}"; do
    description="${REPOS[$repo_name]}"
    
    echo ""
    echo "Creating: $repo_name"
    echo "Description: $description"
    
    # Create repository
    if gh repo create "$ORG_NAME/$repo_name" $VISIBILITY --description "$description" --gitignore "Node" --license "MIT"; then
        echo "✅ Created: $ORG_NAME/$repo_name"
        
        # Clone repository locally
        if [ ! -d "$repo_name" ]; then
            echo "📥 Cloning $repo_name..."
            gh repo clone "$ORG_NAME/$repo_name"
        else
            echo "📁 Directory $repo_name already exists, skipping clone"
        fi
        
    else
        echo "❌ Failed to create: $ORG_NAME/$repo_name (might already exist)"
    fi
    
    sleep 1  # Rate limiting courtesy
done

echo ""
echo "🎉 Repository creation complete!"
echo ""
echo "📁 Local directories created:"
ls -la | grep "^d" | grep -E "(gamefi-|game-)" | awk '{print "   - " $9}'

echo ""
echo "🔗 GitHub repositories created:"
for repo_name in "${!REPOS[@]}"; do
    echo "   - https://github.com/$ORG_NAME/$repo_name"
done

echo ""
echo "🎯 Next steps:"
echo "   1. Run: ./02-setup-core-api.sh"
echo "   2. Run: ./03-extract-raffle-system.sh" 
echo "   3. Run: ./04-setup-social-bots.sh"
echo "   4. Run: ./05-extract-games.sh"
echo ""
echo "🚀 Happy coding!"