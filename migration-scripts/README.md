# 🚀 GameFi Microservices Migration Scripts

Complete repository separation and microservices migration toolkit for transforming your GameFi platform from monolithic to microservices architecture.

## 📋 Migration Overview

This migration separates your current monolithic GameFi platform into independent repositories:

- ✅ **Raffle operations** → Completely separate `gamefi-raffle-system`
- ✅ **Social bots** → Independent `gamefi-telegram-bot` & `gamefi-twitter-bot`
- ✅ **Individual games** → Separate repositories per game
- ✅ **Core API** → Minimal essential services with Supabase integration
- ✅ **VRF calls** → Moved to Supabase Edge Functions

## 🛠️ Prerequisites

Before running the migration scripts, ensure you have:

- [ ] **GitHub CLI** installed (`gh`)
- [ ] **Node.js** 18+ installed
- [ ] **Supabase CLI** installed
- [ ] **GitHub organization** or account set up
- [ ] **Supabase project** created
- [ ] **Git** configured with proper credentials

### Quick Setup:
```bash
# Install GitHub CLI
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update && sudo apt install gh

# Install Supabase CLI
npm i supabase@latest

# Login to GitHub
gh auth login
```

## 🚀 Migration Scripts

### 1. **Repository Creation** (`01-create-repositories.sh`)
Creates all required repositories on GitHub:
- `gamefi-core-api` - Essential services
- `gamefi-raffle-system` - Standalone raffle operations
- `gamefi-telegram-bot` - Telegram integration
- `gamefi-twitter-bot` - Twitter integration
- `gamefi-social-hub` - Social coordination
- `game-tetris` - Tetris game
- `game-asteroid-blaster` - Asteroid game
- `game-memory-challenge` - Memory game
- `gamefi-admin-dashboard` - Admin interface
- `gamefi-analytics-service` - Analytics
- `gamefi-sdk` - JavaScript SDK

### 2. **Core API Setup** (`02-setup-core-api.sh`)
Extracts essential APIs to a minimal core repository:
- Authentication via Supabase Auth
- Lives system (purchase, claim, status)
- Basic game verification
- Payment verification
- Simple leaderboards
- Supabase Edge Functions for VRF

### 3. **Raffle System Extraction** (`03-extract-raffle-system.sh`)
Creates completely standalone raffle system:
- Express.js API server
- VRF integration with Supabase Edge Functions
- Merkle tree verification
- Complete database schema
- Docker containerization
- Comprehensive testing

### 4. **Social Bots Migration** (Future: `04-setup-social-bots.sh`)
Moves existing social bot services to separate repositories
- Telegram bot migration
- Twitter bot migration  
- Social hub coordination setup

### 5. **Game Extraction** (Future: `05-extract-games.sh`)
Separates each game into individual repositories
- Tetris game extraction
- SDK integration setup
- Independent deployment configs

## 📝 Usage Instructions

### Step 1: Prepare Migration
```bash
# Clone or navigate to your current monolithic repository
cd your-gamefi-project

# Create migration scripts directory
mkdir -p migration-scripts
cd migration-scripts

# Make scripts executable
chmod +x *.sh
```

### Step 2: Configure Settings
Edit the scripts to match your setup:

**In `01-create-repositories.sh`:**
```bash
ORG_NAME="YOUR-GITHUB-ORG"  # Change to your GitHub organization
VISIBILITY="--private"       # or --public
```

### Step 3: Execute Migration
```bash
# 1. Create all repositories
./01-create-repositories.sh

# 2. Set up core API
./02-setup-core-api.sh

# 3. Extract raffle system
./03-extract-raffle-system.sh

# 4. (Future) Set up social bots
# ./04-setup-social-bots.sh

# 5. (Future) Extract games
# ./05-extract-games.sh
```

## 🔧 Post-Migration Configuration

After running the scripts, configure each service:

### Core API Configuration
```bash
cd gamefi-core-api
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
npm install
npx supabase start
npm run dev
```

### Raffle System Configuration
```bash
cd gamefi-raffle-system
cp .env.example .env
# Edit .env with your configuration
npm install
npx supabase start
npm run dev
```

## 🌐 Service URLs

After deployment, your microservices will be accessible at:

- **Core API**: `https://api.gamefi.mwor.com`
- **Raffle System**: `https://raffle.gamefi.mwor.com`
- **Telegram Bot**: `https://telegram.gamefi.mwor.com`
- **Twitter Bot**: `https://twitter.gamefi.mwor.com`
- **Admin Dashboard**: `https://admin.gamefi.mwor.com`

## 🔄 Inter-Service Communication

Services communicate via REST APIs:

```typescript
// Example: Core API calling Raffle System
const raffleResult = await fetch('https://raffle.gamefi.mwor.com/api/execute', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${serviceToken}` },
  body: JSON.stringify({ participants })
})

// Example: Social coordination
await Promise.all([
  fetch('https://telegram.gamefi.mwor.com/api/announce/winner', { ... }),
  fetch('https://twitter.gamefi.mwor.com/api/announce/winner', { ... })
])
```

## 📊 Deployment Strategy

### Development Environment
- Local development with Docker Compose
- Supabase local instance
- Individual service ports (3000, 3001, 3002, etc.)

### Production Environment
- Vercel for API services
- Railway/Fly.io for backend services
- Supabase hosted for database
- Individual domains/subdomains

## 🔒 Security Considerations

- **Service Authentication**: JWT tokens for service-to-service communication
- **Rate Limiting**: Individual rate limits per service
- **CORS Configuration**: Service-specific CORS settings
- **Environment Variables**: Service-specific environment isolation
- **Audit Trails**: Separate logging per service

## 📈 Benefits After Migration

### Development Benefits
- **Independent Development**: Teams can work on separate services
- **Faster Deployments**: Deploy individual services without affecting others
- **Technology Flexibility**: Choose best tech stack per service
- **Easier Testing**: Test services in isolation

### Operational Benefits
- **Fault Isolation**: Service failures don't cascade
- **Independent Scaling**: Scale services based on demand
- **Better Monitoring**: Service-specific observability
- **Easier Debugging**: Isolated service logs

### Business Benefits
- **Feature Development**: Add new games/features independently
- **Partnership Opportunities**: License individual services
- **Market Flexibility**: Launch services to different markets
- **Cost Optimization**: Pay for what you use per service

## 🆘 Troubleshooting

### Common Issues

**GitHub CLI Authentication:**
```bash
gh auth login --web
```

**Supabase Connection Issues:**
```bash
supabase login
supabase projects list
```

**Port Conflicts:**
```bash
# Check what's running on ports
lsof -i :3000
lsof -i :3001

# Kill processes if needed
kill -9 <PID>
```

**Environment Variables:**
- Ensure all `.env` files are properly configured
- Check Supabase URLs and keys
- Verify service JWT secrets

## 📞 Support

If you encounter issues during migration:

1. **Check Logs**: Each service has detailed logging
2. **Review Documentation**: Each repository has comprehensive README
3. **Test Endpoints**: Use provided health checks
4. **Validate Configuration**: Ensure environment variables are correct

## 🎯 Next Steps After Migration

1. **Set up CI/CD** for each repository
2. **Configure monitoring** for all services
3. **Implement service discovery** for dynamic endpoints
4. **Set up centralized logging** aggregation
5. **Create integration tests** across services
6. **Document API contracts** between services

---

**🚀 Ready to transform your GameFi platform into a scalable microservices architecture!**