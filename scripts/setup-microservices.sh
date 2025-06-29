#!/bin/bash

# 🚀 GameFi Microservices Setup Script
# This script creates the initial directory structure and basic files for all microservices

set -e

echo "🎮 Setting up GameFi Microservices Architecture..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

print_status "Prerequisites check passed!"

# Create main directories
print_info "Creating directory structure..."

# Infrastructure directories
mkdir -p infrastructure/{docker,k8s,terraform,monitoring,nginx}
mkdir -p shared/{database,types,utils,config}
mkdir -p deployment/scripts

# Service directories
services=(
    "api-gateway"
    "gaming-hub"
    "user-service"
    "game-engine"
    "rewards-service"
    "payment-service"
    "analytics-service"
    "telegram-bot"
    "twitter-bot"
    "social-hub"
    "scheduler"
    "admin-dashboard"
)

for service in "${services[@]}"; do
    print_info "Setting up $service..."
    mkdir -p "services/$service/src/{config,controllers,middleware,routes,services,types,utils}"
    mkdir -p "services/$service/tests"
    
    # Create basic package.json for each service
    cat > "services/$service/package.json" << EOF
{
  "name": "@gamefi/$service",
  "version": "1.0.0",
  "description": "$service microservice for GameFi platform",
  "main": "dist/server.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix"
  },
  "keywords": ["gamefi", "microservice", "$service"],
  "author": "GameFi Platform Team",
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

    # Create basic TypeScript config
    cat > "services/$service/tsconfig.json" << EOF
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@config/*": ["config/*"],
      "@controllers/*": ["controllers/*"],
      "@middleware/*": ["middleware/*"],
      "@models/*": ["models/*"],
      "@services/*": ["services/*"],
      "@utils/*": ["utils/*"],
      "@types/*": ["types/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
EOF

    # Create basic Dockerfile
    cat > "services/$service/Dockerfile" << EOF
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Remove dev dependencies and source
RUN npm prune --production && rm -rf src tsconfig.json

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S gamefi -u 1001
RUN chown -R gamefi:nodejs /app
USER gamefi

# Expose port (different for each service)
EXPOSE 3000

# Start the service
CMD ["node", "dist/server.js"]
EOF

    # Create basic .env.example
    cat > "services/$service/.env.example" << EOF
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/gamefi_platform
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://guest:guest@localhost:5672
JWT_SECRET=your-jwt-secret-here
EOF

    # Create .gitignore
    cat > "services/$service/.gitignore" << EOF
node_modules/
dist/
.env
.env.local
.DS_Store
*.log
coverage/
.nyc_output/
EOF

    print_status "Created $service structure"
done

# Create shared types
print_info "Creating shared types..."
cat > "shared/types/index.ts" << 'EOF'
// Shared types across all microservices

export interface User {
  id: string
  wallet_address: string
  username?: string
  display_name?: string
  created_at: Date
  last_active: Date
}

export interface GameSession {
  id: string
  user_id: string
  game_type: string
  status: 'active' | 'completed' | 'abandoned'
  score?: number
  start_time: Date
  end_time?: Date
  vrf_seed?: string
}

export interface LeaderboardEntry {
  user_id: string
  wallet_address: string
  score: number
  rank: number
  period: 'daily' | 'weekly' | 'monthly'
}

export interface SocialAnnouncement {
  id: string
  type: 'leaderboard_winner' | 'raffle_winner' | 'milestone' | 'new_game'
  title: string
  content: string
  platforms: {
    twitter: boolean
    telegram: boolean
    discord: boolean
  }
  status: 'draft' | 'scheduled' | 'posted' | 'failed'
  created_at: Date
  posted_at?: Date
}

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

export interface ServiceHealthCheck {
  service: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  version: string
  uptime: number
  dependencies: {
    database: boolean
    redis: boolean
    queue: boolean
  }
}
EOF

# Create shared database schema
print_info "Creating shared database schema..."
cat > "shared/database/init.sql" << 'EOF'
-- GameFi Platform Database Schema
-- Shared across all microservices

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(44) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    avatar_nft TEXT,
    bio TEXT,
    social_links JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    game_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    score INTEGER DEFAULT 0,
    moves_data JSONB DEFAULT '[]',
    vrf_seed TEXT,
    vrf_proof TEXT,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leaderboards table
CREATE TABLE IF NOT EXISTS leaderboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    game_type VARCHAR(50) NOT NULL,
    period VARCHAR(20) NOT NULL, -- daily, weekly, monthly
    score INTEGER NOT NULL,
    rank INTEGER,
    period_start DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, game_type, period, period_start)
);

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id),
    session_id UUID,
    event_data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_leaderboards_period ON leaderboards(period, period_start);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EOF

# Create shared utilities
print_info "Creating shared utilities..."
cat > "shared/utils/logger.ts" << 'EOF'
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: process.env.SERVICE_NAME || 'gamefi-service' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }))
}

export { logger }
EOF

# Create nginx configuration
print_info "Creating nginx configuration..."
cat > "infrastructure/nginx/nginx.conf" << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream api_gateway {
        server api-gateway:3000;
    }
    
    upstream gaming_hub {
        server gaming-hub:3001;
    }
    
    upstream admin_dashboard {
        server admin-dashboard:3019;
    }

    server {
        listen 80;
        server_name localhost;

        # API Gateway
        location /api/ {
            proxy_pass http://api_gateway;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Gaming Hub
        location / {
            proxy_pass http://gaming_hub;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Admin Dashboard
        location /admin/ {
            proxy_pass http://admin_dashboard;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF

# Create deployment scripts
print_info "Creating deployment scripts..."
cat > "deployment/scripts/start-infrastructure.sh" << 'EOF'
#!/bin/bash
echo "Starting infrastructure services..."
docker-compose up postgres redis rabbitmq clickhouse -d
echo "Infrastructure services started!"
EOF

cat > "deployment/scripts/start-all-services.sh" << 'EOF'
#!/bin/bash
echo "Starting all microservices..."
docker-compose up -d
echo "All services started!"
EOF

cat > "deployment/scripts/stop-all-services.sh" << 'EOF'
#!/bin/bash
echo "Stopping all services..."
docker-compose down
echo "All services stopped!"
EOF

# Make scripts executable
chmod +x deployment/scripts/*.sh
chmod +x scripts/setup-microservices.sh

# Create main README
cat > "README-MICROSERVICES.md" << 'EOF'
# 🎮 GameFi Microservices Platform

This is the microservices architecture for the GameFi platform, extracted from the monolithic Next.js application.

## 🚀 Quick Start

1. **Start infrastructure services:**
   ```bash
   ./deployment/scripts/start-infrastructure.sh
   ```

2. **Start all services:**
   ```bash
   ./deployment/scripts/start-all-services.sh
   ```

3. **Access the platform:**
   - Gaming Hub: http://localhost:3001
   - API Gateway: http://localhost:3000
   - Admin Dashboard: http://localhost:3019
   - RabbitMQ Management: http://localhost:15672

## 📚 Documentation

- [Architecture Overview](MICROSERVICES_ARCHITECTURE.md)
- [Migration Guide](MICROSERVICES_MIGRATION_GUIDE.md)
- [Individual Service READMEs](services/)

## 🛠️ Development

Each service can be developed independently. See the README in each service directory for specific instructions.

## 🐳 Docker

All services are containerized and can be run with Docker Compose for local development.
EOF

print_status "Directory structure created successfully!"
print_info "Next steps:"
echo "  1. Review the created structure"
echo "  2. Start extracting code from the monolith following the migration guide"
echo "  3. Set up environment variables for each service"
echo "  4. Start with the User Service as it's foundational"
echo ""
print_info "To start the infrastructure services:"
echo "  ./deployment/scripts/start-infrastructure.sh"
echo ""
print_info "Documentation created:"
echo "  - MICROSERVICES_ARCHITECTURE.md"
echo "  - MICROSERVICES_MIGRATION_GUIDE.md"
echo "  - README-MICROSERVICES.md"

print_status "🎮 GameFi Microservices setup complete!"
EOF 