#!/bin/bash

# GameFi Platform - Modular Architecture Migration Script
# This script helps migrate from monolithic to multi-repository architecture

set -e

echo "🚀 GameFi Platform - Modular Architecture Migration"
echo "=================================================="

# Configuration
MAIN_REPO_PATH=$(pwd)
MIGRATION_PATH="$HOME/gamefi-migration"
GITHUB_ORG="your-github-org" # Change this to your GitHub organization

# Create migration directory
mkdir -p "$MIGRATION_PATH"
cd "$MIGRATION_PATH"

echo "📁 Creating repository structure in $MIGRATION_PATH"

# Function to create a new repository with initial structure
create_repository() {
    local repo_name=$1
    local description=$2
    
    echo "🔧 Creating $repo_name..."
    mkdir -p "$repo_name"
    cd "$repo_name"
    
    # Initialize git repository
    git init
    
    # Create basic structure
    cat > README.md << EOF
# $repo_name

$description

## Part of GameFi Platform

This repository is part of the modular GameFi platform architecture.

## Setup

\`\`\`bash
npm install
cp .env.example .env
# Configure environment variables
npm run dev
\`\`\`

## Architecture

See [GameFi Platform Architecture](https://github.com/$GITHUB_ORG/gamefi-docs) for overall architecture.
EOF

    # Create .gitignore
    cat > .gitignore << EOF
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output

# Production
build/
dist/
.next/
out/

# Misc
.DS_Store
*.pem
.vscode/
.idea/

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
EOF

    # Create package.json
    cat > package.json << EOF
{
  "name": "$repo_name",
  "version": "0.1.0",
  "description": "$description",
  "main": "index.js",
  "scripts": {
    "dev": "npm run dev:local",
    "build": "npm run build:production",
    "test": "jest",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "keywords": ["gamefi", "web3", "solana"],
  "author": "GameFi Team",
  "license": "MIT",
  "dependencies": {},
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "jest": "^29.0.0"
  }
}
EOF

    # Create TypeScript config
    cat > tsconfig.json << EOF
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "lib": ["es2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowJs": true,
    "noEmit": false,
    "incremental": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

    # Create .env.example
    touch .env.example
    
    # Create source directory
    mkdir -p src
    
    cd ..
}

# 1. Create Core API Repository
create_repository "gamefi-core-api" "Core API for GameFi platform - handles lives, sessions, and payments"

cd gamefi-core-api

# Create API structure
mkdir -p src/{routes,services,middleware,utils,types}

# Copy relevant files from main repo
echo "📋 Copying core API files..."
cp -r "$MAIN_REPO_PATH/app/api/buyLife" src/routes/ 2>/dev/null || true
cp -r "$MAIN_REPO_PATH/app/api/claimDaily" src/routes/ 2>/dev/null || true
cp -r "$MAIN_REPO_PATH/app/api/game" src/routes/ 2>/dev/null || true
cp -r "$MAIN_REPO_PATH/app/api/payments" src/routes/ 2>/dev/null || true
cp -r "$MAIN_REPO_PATH/lib/supabase-client.ts" src/services/ 2>/dev/null || true
cp -r "$MAIN_REPO_PATH/lib/config.ts" src/ 2>/dev/null || true

# Create environment template
cat > .env.example << EOF
# Supabase Configuration
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# API Configuration
NODE_ENV=development
PORT=3001
API_KEY=

# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
MWOR_TOKEN_ADDRESS=
EOF

cd ..

# 2. Create Raffle Engine Repository
create_repository "gamefi-raffle-engine" "Independent raffle and lottery system for GameFi platform"

cd gamefi-raffle-engine

mkdir -p src/{controllers,services,models,utils,types}

# Copy raffle-related files
echo "📋 Copying raffle engine files..."
cp "$MAIN_REPO_PATH/lib/raffle-system.ts" src/services/ 2>/dev/null || true

cat > .env.example << EOF
# Database Configuration
DATABASE_URL=

# Supabase Configuration (for VRF)
SUPABASE_URL=
SUPABASE_ANON_KEY=

# Redis Configuration
REDIS_URL=

# API Configuration
PORT=3002
API_KEY=
CORE_API_URL=http://localhost:3001
EOF

cd ..

# 3. Create Social Bots Repository
create_repository "gamefi-social-bots" "Social media bots for GameFi platform announcements"

cd gamefi-social-bots

mkdir -p src/{telegram,twitter,discord,coordinator}

# Copy social bot files
echo "📋 Copying social bot files..."
cp "$MAIN_REPO_PATH/lib/telegram-bot.ts" src/telegram/ 2>/dev/null || true

cat > .env.example << EOF
# Telegram Configuration
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHANNEL_ID=
TELEGRAM_GROUP_ID=

# Twitter Configuration
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_TOKEN_SECRET=

# Discord Configuration
DISCORD_BOT_TOKEN=
DISCORD_CHANNEL_ID=

# Message Queue
REDIS_URL=

# API Configuration
PORT=3003
CORE_API_URL=http://localhost:3001
RAFFLE_API_URL=http://localhost:3002
EOF

cd ..

# 4. Create Tetris Game Repository
create_repository "gamefi-tetris" "Tetris game implementation for GameFi platform"

cd gamefi-tetris

mkdir -p src/{game-engine,frontend,integration,assets}

# Copy Tetris files
echo "📋 Copying Tetris game files..."
# Add copy commands for Tetris-specific files

cat > .env.example << EOF
# GameFi SDK Configuration
GAMEFI_API_URL=http://localhost:3001
GAMEFI_SDK_KEY=

# Game Configuration
GAME_ID=tetris
GAME_VERSION=1.0.0
EOF

cd ..

# 5. Create SDK Repository
create_repository "gamefi-sdk" "JavaScript/TypeScript SDK for GameFi integration"

cd gamefi-sdk

mkdir -p src/{core,utils,types,components}

cat > src/index.ts << EOF
export { GameFiSDK } from './core/sdk';
export { VrfClient } from './core/vrf-client';
export { WalletConnector } from './core/wallet-connector';
export * from './types';
EOF

cd ..

# 6. Create Admin Dashboard Repository
create_repository "gamefi-admin-dashboard" "Administrative dashboard for GameFi platform"

cd gamefi-admin-dashboard

mkdir -p src/{pages,components,services,utils}

cat > .env.example << EOF
# API Endpoints
NEXT_PUBLIC_CORE_API_URL=http://localhost:3001
NEXT_PUBLIC_RAFFLE_API_URL=http://localhost:3002

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Admin Configuration
ADMIN_SECRET_KEY=
EOF

cd ..

# Create migration tracking
echo "📊 Creating migration status tracker..."

cat > migration-status.md << EOF
# GameFi Platform Migration Status

## Repository Status

- [ ] gamefi-core-api
  - [ ] Lives management extracted
  - [ ] Payment processing extracted
  - [ ] Game session management extracted
  - [ ] Supabase auth integrated
  - [ ] Deployed to production

- [ ] gamefi-raffle-engine
  - [ ] Raffle logic extracted
  - [ ] VRF edge functions created
  - [ ] Database schema migrated
  - [ ] Event system implemented
  - [ ] Deployed to production

- [ ] gamefi-social-bots
  - [ ] Telegram bot extracted
  - [ ] Twitter bot implemented
  - [ ] Message queue setup
  - [ ] Coordinator service created
  - [ ] Deployed to production

- [ ] gamefi-tetris
  - [ ] Game engine extracted
  - [ ] SDK integration completed
  - [ ] Assets migrated
  - [ ] Deployed to production

- [ ] gamefi-sdk
  - [ ] Core SDK implemented
  - [ ] VRF client created
  - [ ] Published to npm
  - [ ] Documentation written

- [ ] gamefi-admin-dashboard
  - [ ] Dashboard UI created
  - [ ] Analytics integrated
  - [ ] User management implemented
  - [ ] Deployed to production

## Data Migration

- [ ] User data migrated to Supabase
- [ ] Game sessions migrated
- [ ] Raffle history preserved
- [ ] Payment records transferred

## Integration Testing

- [ ] End-to-end game flow tested
- [ ] Raffle system tested
- [ ] Social announcements tested
- [ ] Payment flow tested
EOF

# Create deployment scripts
echo "🚀 Creating deployment helpers..."

cat > deploy-all.sh << EOF
#!/bin/bash
# Deploy all GameFi services

echo "Deploying GameFi Platform Services..."

# Deploy Core API
cd gamefi-core-api && npm run deploy && cd ..

# Deploy Raffle Engine
cd gamefi-raffle-engine && npm run deploy && cd ..

# Deploy Social Bots
cd gamefi-social-bots && npm run deploy && cd ..

# Deploy Games
cd gamefi-tetris && npm run deploy && cd ..

# Deploy Admin Dashboard
cd gamefi-admin-dashboard && npm run deploy && cd ..

echo "✅ All services deployed!"
EOF

chmod +x deploy-all.sh

# Create docker-compose for local development
cat > docker-compose.yml << EOF
version: '3.8'

services:
  core-api:
    build: ./gamefi-core-api
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
    depends_on:
      - postgres
      - redis

  raffle-engine:
    build: ./gamefi-raffle-engine
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=development
    depends_on:
      - postgres
      - redis

  social-bots:
    build: ./gamefi-social-bots
    ports:
      - "3003:3003"
    environment:
      - NODE_ENV=development
    depends_on:
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: gamefi
      POSTGRES_USER: gamefi
      POSTGRES_PASSWORD: gamefi123
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
EOF

echo "✅ Migration structure created!"
echo ""
echo "📋 Next Steps:"
echo "1. Review the created repositories in $MIGRATION_PATH"
echo "2. Update the GITHUB_ORG variable in this script"
echo "3. Copy additional files from the main repository as needed"
echo "4. Configure environment variables in each .env file"
echo "5. Push each repository to GitHub"
echo "6. Set up CI/CD for each repository"
echo ""
echo "📚 Documentation:"
echo "- Architecture: NEW_MODULAR_ARCHITECTURE.md"
echo "- VRF Guide: SUPABASE_VRF_IMPLEMENTATION.md"
echo "- Migration Status: $MIGRATION_PATH/migration-status.md"