# Vercel Deployment Guide - Tetris Game API

This guide explains how to deploy your Tetris Game API microservice to Vercel using the provided deployment scripts and configuration.

## 🚀 Quick Start

### Prerequisites

1. **Install required tools:**
   ```bash
   # Install pnpm globally
   npm install -g pnpm
   
   # Install Vercel CLI
   npm install -g vercel
   
   # Login to Vercel
   vercel login
   ```

2. **Prepare your project:**
   ```bash
   # Install dependencies
   pnpm install
   
   # Make scripts executable
   chmod +x scripts/deploy.sh
   chmod +x scripts/setup-env.sh
   ```

### One-Command Deployment

```bash
# Setup environment variables (first time only)
./scripts/setup-env.sh

# Deploy to production
./scripts/deploy.sh production
```

## 📋 Step-by-Step Deployment

### Step 1: Environment Variables Setup

Run the interactive environment setup script:

```bash
./scripts/setup-env.sh
```

This script will prompt you for all required configuration:

#### Supabase Configuration
- **Supabase Project URL**: Your Supabase project URL
- **Supabase Service Role Key**: Your service role key (keep secret!)

#### Solana Configuration
- **Solana RPC URL**: Usually `https://api.mainnet-beta.solana.com`
- **MWOR Token Mint Address**: Your MWOR token mint address
- **MWORGOV Token Mint**: Optional governance token mint
- **Switchboard Oracle Feed**: For price fetching (optional)
- **VRF Queue**: For randomness (optional)

#### Game Rules
- **Free Life Limit**: Lives per IP/day (default: 1)
- **Paid Life Cap**: Max paid lives per day (default: 10)
- **Bonus Divisor**: MWOR per bonus life (default: 50000)
- **Bonus Cap**: Max bonus lives (default: 40)

#### Pricing
- **Cheap Life Price**: USD price (default: $0.03)
- **Mid Life Price**: USD price (default: $0.09)
- **High Life Price**: USD price (default: $0.27)

### Step 2: Deploy to Vercel

#### Option A: Using the deployment script (Recommended)

```bash
# Deploy to preview environment
./scripts/deploy.sh preview

# Deploy to production
./scripts/deploy.sh production
```

#### Option B: Using package.json scripts

```bash
# Deploy to preview
pnpm run deploy:preview

# Deploy to production  
pnpm run deploy
```

#### Option C: Manual Vercel commands

```bash
# Build and validate
pnpm build

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Step 3: Post-Deployment Configuration

After successful deployment, you need to:

1. **Set up Supabase Database:**
   - Go to your Supabase project
   - Run the SQL from `scripts/supabase-schema.sql` in the SQL editor
   - This creates the required `lives`, `payments`, and `plays` tables

2. **Configure Helius Webhook:**
   - Go to your Helius dashboard
   - Create a webhook pointing to: `https://your-domain.vercel.app/api/hel/trx`
   - Set it to track MWOR token transfers
   - Use the webhook secret you configured

3. **Verify CRON Job:**
   - The daily reset CRON job is automatically configured in `vercel.json`
   - It runs at midnight UTC: `0 0 * * *`
   - Check Vercel dashboard → Functions → Crons

## 📁 Deployment Files Overview

### `vercel.json`
```json
{
  "version": 2,
  "buildCommand": "pnpm build",
  "framework": "nextjs",
  "functions": {
    "app/api/*/route.ts": { "maxDuration": 30 }
  },
  "crons": [
    { "path": "/api/resetMidnight", "schedule": "0 0 * * *" }
  ]
}
```

Key features:
- ✅ Automatic CRON job for daily resets
- ✅ Extended timeouts for complex API functions
- ✅ CORS headers for API endpoints
- ✅ Regional deployment (US East)

### `scripts/deploy.sh`
Comprehensive deployment script that:
- ✅ Validates prerequisites (pnpm, vercel CLI)
- ✅ Installs dependencies
- ✅ Runs TypeScript and linting checks
- ✅ Builds the project
- ✅ Validates environment variables
- ✅ Deploys to chosen environment
- ✅ Shows deployment URLs and endpoints

### `scripts/setup-env.sh`
Interactive environment setup that:
- ✅ Prompts for all required configuration
- ✅ Adds variables to Vercel environments
- ✅ Creates local `.env.local` file
- ✅ Validates Vercel CLI and authentication

## 🔧 Package.json Scripts

```json
{
  "scripts": {
    "deploy": "vercel --prod",
    "deploy:preview": "vercel", 
    "deploy:local": "vercel dev",
    "env:pull": "vercel env pull .env.local",
    "env:add": "vercel env add",
    "validate": "pnpm type-check && pnpm lint"
  }
}
```

## 🌐 API Endpoints

After deployment, your API will be available at:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/claimDaily` | POST | Daily life claiming |
| `/api/buyLife` | POST | Life purchase initiation |
| `/api/endRound` | POST | Score submission |
| `/api/leaderboard/daily` | GET | Daily leaderboard |
| `/api/hel/trx` | POST | Helius webhook |
| `/api/resetMidnight` | POST | Daily reset (CRON) |

## 🔍 Testing Your Deployment

### 1. Test API Endpoints

```bash
# Test daily claim
curl -X POST https://your-domain.vercel.app/api/claimDaily \
  -H "Content-Type: application/json" \
  -d '{"wallet":"test","deviceId":"test","ip":"127.0.0.1"}'

# Test leaderboard
curl https://your-domain.vercel.app/api/leaderboard/daily?limit=5

# Test life purchase (should return payment address)
curl -X POST https://your-domain.vercel.app/api/buyLife \
  -H "Content-Type: application/json" \
  -d '{"wallet":"your_wallet_address"}'
```

### 2. Verify CRON Job

Check in Vercel dashboard:
1. Go to your project
2. Click "Functions" tab
3. Look for "Crons" section
4. Verify `/api/resetMidnight` is scheduled

### 3. Test Webhook

- Send a test MWOR transaction
- Check Vercel function logs
- Verify payment is recorded in Supabase

## 🚨 Troubleshooting

### Common Issues

1. **"Build failed"**
   ```bash
   # Check TypeScript errors
   pnpm type-check
   
   # Fix linting issues
   pnpm lint --fix
   ```

2. **"Environment variables not found"**
   ```bash
   # Check Vercel environment variables
   vercel env ls
   
   # Add missing variables
   vercel env add VARIABLE_NAME
   ```

3. **"Function timeout"**
   - Check `vercel.json` function timeouts
   - Complex operations may need longer timeouts

4. **"CRON job not running"**
   - Verify it's configured in `vercel.json`
   - Check Vercel dashboard → Functions → Crons
   - Look at function logs

### Debug Commands

```bash
# Check Vercel project info
vercel ls

# View function logs
vercel logs

# Pull environment variables
vercel env pull

# Test locally
vercel dev
```

## 🔒 Security Considerations

1. **Environment Variables:**
   - Never commit `.env.local` to git
   - Use Vercel's environment variable system
   - Rotate secrets regularly

2. **Webhook Security:**
   - Always verify webhook signatures
   - Use HTTPS endpoints only
   - Monitor for suspicious activity

3. **Rate Limiting:**
   - Monitor rate limit violations
   - Adjust limits based on usage patterns
   - Implement IP blocking for abuse

## 📊 Monitoring & Maintenance

### Vercel Dashboard Monitoring

1. **Functions Tab:**
   - Monitor API endpoint performance
   - Check error rates and timeouts
   - View invocation counts

2. **Analytics Tab:**
   - Track deployment frequency
   - Monitor build success rates
   - View traffic patterns

3. **Logs:**
   - Real-time function logs
   - Error tracking and debugging
   - Performance monitoring

### Regular Maintenance Tasks

1. **Weekly:**
   - Check payment processing logs
   - Verify CRON job execution
   - Monitor rate limiting effectiveness

2. **Monthly:**
   - Review and rotate secrets
   - Analyze leaderboard integrity
   - Clean up old play records

3. **As Needed:**
   - Update pricing based on MWOR price
   - Adjust rate limits based on usage
   - Scale functions if needed

## 🎯 Production Checklist

Before going live:

- [ ] ✅ All environment variables configured
- [ ] ✅ Supabase database schema deployed
- [ ] ✅ Helius webhook configured and tested
- [ ] ✅ CRON job verified and scheduled
- [ ] ✅ All API endpoints tested
- [ ] ✅ Payment flow tested end-to-end
- [ ] ✅ Frontend updated to use new API endpoints
- [ ] ✅ Rate limiting tested and configured
- [ ] ✅ Monitoring and alerting set up
- [ ] ✅ Error handling and logging verified

## 🔄 Continuous Deployment

For automated deployments, you can:

1. **Connect to GitHub:**
   ```bash
   # Link your repository
   vercel --repo
   ```

2. **Auto-deploy on push:**
   - Vercel will auto-deploy on git push
   - Preview deployments for branches
   - Production deployment for main branch

3. **Environment-specific deployments:**
   - Use branch-based environment variables
   - Different configurations per environment
   - Automated testing in preview deployments

Your Tetris Game API is now ready for production deployment! 🎮🚀 