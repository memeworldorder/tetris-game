#!/bin/bash

# 🐙 Push GameFi Platform to GitHub
# Run this after creating your GitHub repository

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐙 Pushing GameFi Platform to GitHub${NC}"
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Not a git repository! Run: git init${NC}"
    exit 1
fi

# Prompt for GitHub username and repository name
echo -e "${YELLOW}📝 Please provide your GitHub details:${NC}"
read -p "GitHub username: " GITHUB_USERNAME
read -p "Repository name [gamefi-p2e-platform]: " REPO_NAME

# Set default if empty
REPO_NAME=${REPO_NAME:-gamefi-p2e-platform}

# GitHub repository URL
GITHUB_URL="https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"

echo ""
echo -e "${BLUE}🔗 Connecting to GitHub repository:${NC}"
echo "  $GITHUB_URL"
echo ""

# Add GitHub as remote origin
echo -e "${YELLOW}🔗 Adding GitHub remote...${NC}"
git remote add origin $GITHUB_URL || {
    echo -e "${YELLOW}⚠️ Remote 'origin' already exists, updating...${NC}"
    git remote set-url origin $GITHUB_URL
}

# Set upstream and push
echo -e "${YELLOW}🚀 Pushing to GitHub...${NC}"
git branch -M main  # Rename master to main (GitHub standard)
git push -u origin main

echo ""
echo -e "${GREEN}🎉 Successfully pushed to GitHub!${NC}"
echo ""
echo -e "${BLUE}📋 Your repository is now available at:${NC}"
echo "  🌐 https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo ""
echo -e "${BLUE}🔗 Repository features:${NC}"
echo "  ✅ Complete GameFi P2E platform code"
echo "  ✅ 12 microservices architecture"
echo "  ✅ Railway deployment configurations"
echo "  ✅ Comprehensive documentation"
echo "  ✅ SDK examples and integration guides"
echo ""
echo -e "${YELLOW}🚀 Next steps:${NC}"
echo "1. Star your repository ⭐"
echo "2. Create issues for planned features 📝"
echo "3. Set up GitHub Actions for CI/CD 🔄"
echo "4. Deploy to Railway: ./deploy-priority-services-railway.sh"
echo "5. Share with the community! 📢"
echo ""
echo -e "${GREEN}🎮 Your GameFi platform is now open source!${NC}" 