#!/bin/bash

# 🔧 Fix Railway Deployment Issues
# This script fixes common Railway deployment problems

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Fixing Railway Deployment Issues${NC}"
echo ""

# Services to fix
SERVICES=(
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

# Function to check and fix package.json issues
fix_package_json() {
    local service=$1
    local package_file="services/$service/package.json"
    
    echo -e "${YELLOW}🔧 Fixing $service package.json...${NC}"
    
    if [ -f "$package_file" ]; then
        # Backup original
        cp "$package_file" "$package_file.backup"
        
        # Fix common issues
        python3 -c "
import json
import sys

with open('$package_file', 'r') as f:
    data = json.load(f)

# Ensure proper scripts
if 'scripts' not in data:
    data['scripts'] = {}

# Fix build script
if 'build' not in data['scripts']:
    data['scripts']['build'] = 'tsc'
elif 'tsc' not in data['scripts']['build']:
    data['scripts']['build'] = 'tsc'

# Fix start script
if 'start' not in data['scripts']:
    data['scripts']['start'] = 'node dist/server.js'
elif 'src/' in data['scripts']['start']:
    data['scripts']['start'] = 'node dist/server.js'

# Ensure main points to compiled file
data['main'] = 'dist/server.js'

# Add engines if missing
if 'engines' not in data:
    data['engines'] = {'node': '>=18.0.0'}

with open('$package_file', 'w') as f:
    json.dump(data, f, indent=2)

print('✅ Fixed package.json')
"
    else
        echo -e "${RED}❌ Package.json not found for $service${NC}"
    fi
}

# Function to ensure TypeScript config exists
fix_typescript_config() {
    local service=$1
    local ts_config="services/$service/tsconfig.json"
    
    echo -e "${YELLOW}📝 Checking TypeScript config for $service...${NC}"
    
    if [ ! -f "$ts_config" ]; then
        echo -e "${YELLOW}⚠️ Creating tsconfig.json for $service${NC}"
        cat > "$ts_config" << 'EOF'
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
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
EOF
        echo -e "${GREEN}✅ TypeScript config created for $service${NC}"
    fi
}

# Function to ensure health check endpoint exists
add_health_check() {
    local service=$1
    local server_file="services/$service/src/server.ts"
    
    echo -e "${YELLOW}🏥 Checking health endpoint for $service...${NC}"
    
    if [ -f "$server_file" ]; then
        if ! grep -q "/health" "$server_file"; then
            echo -e "${YELLOW}⚠️ Adding health check endpoint to $service${NC}"
            
            # Add health check before the last lines
            sed -i '/app\.listen/i \
// Health check endpoint\
app.get("/health", (req, res) => {\
  res.json({\
    status: "healthy",\
    service: "'$service'",\
    version: "1.0.0",\
    uptime: process.uptime()\
  })\
})\
' "$server_file"
            
            echo -e "${GREEN}✅ Health check added to $service${NC}"
        fi
    fi
}

# Function to fix port configuration
fix_port_config() {
    local service=$1
    local server_file="services/$service/src/server.ts"
    
    echo -e "${YELLOW}🔌 Fixing port configuration for $service...${NC}"
    
    if [ -f "$server_file" ]; then
        # Replace hardcoded ports with process.env.PORT
        sed -i 's/const PORT = [0-9]*/const PORT = process.env.PORT || 3000/' "$server_file"
        sed -i 's/app\.listen([0-9]*,/app.listen(PORT,/' "$server_file"
        
        echo -e "${GREEN}✅ Port configuration fixed for $service${NC}"
    fi
}

# Function to create .dockerignore
create_dockerignore() {
    local service=$1
    local dockerignore="services/$service/.dockerignore"
    
    if [ ! -f "$dockerignore" ]; then
        echo -e "${YELLOW}🐳 Creating .dockerignore for $service...${NC}"
        cat > "$dockerignore" << 'EOF'
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.nyc_output
coverage
.nyc_output
.coverage
.coverage/
*.log
EOF
        echo -e "${GREEN}✅ .dockerignore created for $service${NC}"
    fi
}

# Apply fixes to all services
for service in "${SERVICES[@]}"; do
    if [ -d "services/$service" ]; then
        echo -e "${BLUE}🔧 Fixing $service...${NC}"
        
        fix_package_json "$service"
        fix_typescript_config "$service"
        add_health_check "$service"
        fix_port_config "$service"
        create_dockerignore "$service"
        
        echo -e "${GREEN}✅ $service fixed${NC}"
        echo ""
    else
        echo -e "${YELLOW}⚠️ Service directory services/$service not found${NC}"
    fi
done

# Create global Railway deployment troubleshooting guide
echo -e "${BLUE}📝 Creating Railway Deployment Troubleshooting Guide...${NC}"
cat > "RAILWAY_DEPLOYMENT_GUIDE.md" << 'EOF'
# 🚂 Railway Deployment Troubleshooting Guide

## Common Deployment Failures and Solutions

### 1. **Build Failures**
**Problem**: TypeScript compilation errors
**Solution**:
```bash
# Check if all services have proper tsconfig.json
# Ensure build script exists: "build": "tsc"
# Verify TypeScript dependencies are installed
```

### 2. **Start Command Failures**
**Problem**: Service won't start on Railway
**Solution**:
```bash
# Ensure start script points to compiled JS: "start": "node dist/server.js"
# Check if dist/ folder is created during build
# Verify main field in package.json: "main": "dist/server.js"
```

### 3. **Port Configuration Issues**
**Problem**: Service not accessible on Railway
**Solution**:
```javascript
// Use Railway's PORT environment variable
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

### 4. **Health Check Failures**
**Problem**: Railway can't health check the service
**Solution**:
```javascript
// Add health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'service-name',
    uptime: process.uptime()
  })
})
```

### 5. **Service Communication Issues**
**Problem**: Services can't communicate on Railway
**Solution**:
```bash
# Use Railway internal networking
API_GATEWAY_URL=http://api-gateway:$PORT  # Not localhost!
USER_SERVICE_URL=http://user-service:$PORT
```

### 6. **Environment Variable Issues**
**Problem**: Missing or incorrect environment variables
**Solution**:
1. Set variables in Railway dashboard
2. Use Railway's variable references
3. Check environment loading: `dotenv.config()`

### 7. **Dependency Issues**
**Problem**: Missing dependencies during deployment
**Solution**:
```bash
# Ensure all dependencies are in package.json
# Use exact versions, not ranges
# Include @types/* for TypeScript
```

## Railway-Specific Configuration

### railway.json Template
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "sleepApplication": false,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Environment Variables for Railway
```bash
# Required for all services
DATABASE_URL=$DATABASE_URL
JWT_SECRET=$JWT_SECRET
NODE_ENV=production
PORT=$PORT

# Service discovery (Railway internal)
API_GATEWAY_URL=http://api-gateway:$PORT
USER_SERVICE_URL=http://user-service:$PORT
```

## Deployment Commands
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy a service
cd services/api-gateway
railway up

# Check service status
railway status

# View logs
railway logs

# Set environment variables
railway variables set KEY=VALUE
```

## Debugging Failed Deployments
1. Check Railway deployment logs
2. Verify build process completed
3. Check start command execution
4. Test health check endpoint locally
5. Verify environment variables are set
6. Check service-to-service communication
EOF

echo ""
echo -e "${GREEN}🎉 All Railway deployment issues fixed!${NC}"
echo ""
echo -e "${BLUE}📋 What was fixed:${NC}"
echo "  ✅ Package.json scripts (build/start)"
echo "  ✅ TypeScript configurations"
echo "  ✅ Health check endpoints"
echo "  ✅ Port configurations"
echo "  ✅ .dockerignore files"
echo "  ✅ Railway troubleshooting guide"
echo ""
echo -e "${YELLOW}🚀 Next Steps:${NC}"
echo "1. Test builds locally: cd services/[service] && npm run build"
echo "2. Apply Railway environment: ./apply-env-railway.sh"
echo "3. Deploy to Railway: ./deploy-to-railway.sh"
echo "4. Monitor deployments in Railway dashboard"
echo ""
echo -e "${GREEN}✨ Ready for successful Railway deployment!${NC}" 