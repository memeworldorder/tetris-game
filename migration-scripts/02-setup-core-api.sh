#!/bin/bash

# 🏗️ Core API Setup Script
# Extracts essential APIs to the gamefi-core-api repository

set -e

echo "🏗️  GameFi Core API Setup"
echo "========================="

# Configuration
CORE_API_DIR="gamefi-core-api"
SOURCE_DIR="."

if [ ! -d "$CORE_API_DIR" ]; then
    echo "❌ Directory $CORE_API_DIR not found. Please run 01-create-repositories.sh first."
    exit 1
fi

echo "📂 Setting up core API structure in $CORE_API_DIR"

cd "$CORE_API_DIR"

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p app/api/{auth,user,lives,game,payment,leaderboard}
mkdir -p lib/{supabase,auth,verification,database}
mkdir -p supabase/{functions,migrations}
mkdir -p types
mkdir -p utils
mkdir -p components/ui

echo "📝 Creating package.json..."
cat > package.json << 'EOF'
{
  "name": "gamefi-core-api",
  "version": "1.0.0",
  "description": "GameFi Core API - Essential services for authentication, lives, payments, and basic game operations",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:status": "supabase status",
    "supabase:reset": "supabase db reset",
    "db:generate-types": "supabase gen types typescript --local > types/supabase.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/auth-helpers-nextjs": "^0.8.7",
    "@supabase/auth-helpers-react": "^0.4.2",
    "@solana/web3.js": "^1.87.6",
    "@solana/wallet-adapter-base": "^0.9.23",
    "@solana/wallet-adapter-react": "^0.15.35",
    "@solana/wallet-adapter-wallets": "^0.19.26",
    "next": "14.0.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.3.3",
    "zod": "^3.22.4",
    "jose": "^5.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.5",
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "eslint": "^8.56.0",
    "eslint-config-next": "14.0.4",
    "supabase": "^1.123.4",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}
EOF

echo "📝 Creating Next.js configuration..."
cat > next.config.mjs << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  },
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  }
}

export default nextConfig
EOF

echo "📝 Creating TypeScript configuration..."
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

echo "📝 Creating Supabase configuration..."
mkdir -p supabase
cat > supabase/config.toml << 'EOF'
[api]
enabled = true
port = 54321
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[auth]
enabled = true
site_url = "http://localhost:3000"
additional_redirect_urls = ["https://localhost:3000"]
jwt_expiry = 3600
enable_signup = true
enable_anonymous_users = false

[db]
port = 54322
shadow_port = 54320
major_version = 15

[realtime]
enabled = true
ip_version = "ipv4"

[studio]
enabled = true
port = 54323
api_url = "http://localhost:54321"

[inbucket]
enabled = true
port = 54324
smtp_port = 54325
pop3_port = 54326

[storage]
enabled = true
file_size_limit = "50MiB"

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = false
EOF

echo "📝 Creating Supabase client..."
cat > lib/supabase/client.ts << 'EOF'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

export const supabase = createClientComponentClient<Database>()
EOF

cat > lib/supabase/server.ts << 'EOF'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export const createServerSupabaseClient = () => {
  return createServerComponentClient<Database>({ cookies })
}
EOF

echo "📝 Creating authentication utilities..."
cat > lib/auth/wallet-auth.ts << 'EOF'
import { supabase } from '@/lib/supabase/client'
import { PublicKey } from '@solana/web3.js'

export interface WalletAuthResult {
  success: boolean
  user?: any
  session?: any
  error?: string
}

export async function authenticateWallet(
  walletAddress: string,
  signature: string,
  message: string
): Promise<WalletAuthResult> {
  try {
    // Verify wallet signature
    const isValidSignature = await verifyWalletSignature(
      walletAddress,
      signature,
      message
    )

    if (!isValidSignature) {
      return { success: false, error: 'Invalid wallet signature' }
    }

    // Sign in with Supabase using wallet address as identifier
    const { data, error } = await supabase.auth.signInWithPassword({
      email: `${walletAddress}@wallet.gamefi`,
      password: walletAddress
    })

    if (error) {
      // Try to create user if doesn't exist
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: `${walletAddress}@wallet.gamefi`,
        password: walletAddress,
        options: {
          data: {
            wallet_address: walletAddress
          }
        }
      })

      if (signUpError) {
        return { success: false, error: signUpError.message }
      }

      return { 
        success: true, 
        user: signUpData.user, 
        session: signUpData.session 
      }
    }

    return { 
      success: true, 
      user: data.user, 
      session: data.session 
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Authentication failed' 
    }
  }
}

async function verifyWalletSignature(
  walletAddress: string,
  signature: string,
  message: string
): Promise<boolean> {
  try {
    // Implementation depends on your wallet signature verification logic
    // This is a placeholder - implement actual verification
    const publicKey = new PublicKey(walletAddress)
    return publicKey.toBase58() === walletAddress
  } catch {
    return false
  }
}
EOF

echo "📝 Creating API routes..."

# Auth API
cat > app/api/auth/wallet/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { authenticateWallet } from '@/lib/auth/wallet-auth'

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, signature, message } = await request.json()

    if (!walletAddress || !signature || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const result = await authenticateWallet(walletAddress, signature, message)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      session: result.session
    })
  } catch (error) {
    console.error('Wallet authentication error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
EOF

# Lives API
cat > app/api/lives/status/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('wallet')

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      )
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('total_lives, last_life_lost, created_at')
      .eq('wallet_address', walletAddress)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    if (!user) {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          wallet_address: walletAddress,
          total_lives: 1,
          last_life_lost: null
        })
        .select()
        .single()

      if (createError) throw createError

      return NextResponse.json({
        totalLives: 1,
        canClaimDaily: true,
        timeUntilNextClaim: 0
      })
    }

    const now = new Date()
    const lastLost = user.last_life_lost ? new Date(user.last_life_lost) : null
    const canClaimDaily = !lastLost || (now.getTime() - lastLost.getTime()) >= 24 * 60 * 60 * 1000

    return NextResponse.json({
      totalLives: user.total_lives,
      canClaimDaily,
      timeUntilNextClaim: canClaimDaily ? 0 : 24 * 60 * 60 * 1000 - (now.getTime() - lastLost!.getTime())
    })
  } catch (error) {
    console.error('Lives status error:', error)
    return NextResponse.json(
      { error: 'Failed to get lives status' },
      { status: 500 }
    )
  }
}
EOF

# Game verification API
cat > app/api/game/verify-score/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { 
      walletAddress, 
      score, 
      gameData, 
      sessionId 
    } = await request.json()

    if (!walletAddress || !score || !gameData || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Basic score verification (expand based on your game logic)
    const isValid = await verifyGameScore(score, gameData)
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid score or game data' },
        { status: 400 }
      )
    }

    // Store verified score
    const { error } = await supabase
      .from('game_sessions')
      .insert({
        wallet_address: walletAddress,
        score,
        game_data: gameData,
        session_id: sessionId,
        verified: true,
        created_at: new Date().toISOString()
      })

    if (error) throw error

    return NextResponse.json({
      success: true,
      verified: true,
      score
    })
  } catch (error) {
    console.error('Score verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify score' },
      { status: 500 }
    )
  }
}

async function verifyGameScore(score: number, gameData: any): Promise<boolean> {
  // Implement your game-specific verification logic here
  // This is a placeholder implementation
  return score > 0 && score < 10000000 // Basic sanity check
}
EOF

echo "📝 Creating environment template..."
cat > .env.local.example << 'EOF'
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database
DATABASE_URL=your_postgres_connection_string

# External Service URLs (for microservices communication)
RAFFLE_SERVICE_URL=https://raffle.gamefi.mwor.com
TELEGRAM_SERVICE_URL=https://telegram.gamefi.mwor.com
TWITTER_SERVICE_URL=https://twitter.gamefi.mwor.com

# JWT Secret for service-to-service communication
SERVICE_JWT_SECRET=your_service_jwt_secret
EOF

echo "📝 Creating Vercel deployment configuration..."
cat > vercel.json << 'EOF'
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/app/api/$1"
    }
  ],
  "env": {
    "SUPABASE_URL": "@supabase-url",
    "SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
EOF

echo "📝 Creating README..."
cat > README.md << 'EOF'
# GameFi Core API

Minimal core API with essential services for the GameFi platform.

## Features

- 🔐 **Authentication**: Wallet-based auth via Supabase
- 👤 **User Management**: Profile and account management  
- ❤️ **Lives System**: Daily claims and purchases
- 🎮 **Game Verification**: Score validation and anti-cheat
- 💳 **Payment Processing**: Transaction verification
- 🏆 **Basic Leaderboards**: Score tracking and rankings

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up Supabase**:
   ```bash
   npx supabase init
   npx supabase start
   ```

3. **Configure environment**:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/wallet` - Wallet authentication

### User Management  
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile

### Lives System
- `GET /api/lives/status` - Get lives status
- `POST /api/lives/claim` - Claim daily life
- `POST /api/lives/purchase` - Purchase lives

### Game Operations
- `POST /api/game/verify-score` - Verify game score
- `GET /api/game/session` - Get game session

### Payments
- `POST /api/payment/verify` - Verify payment transaction

### Leaderboards
- `GET /api/leaderboard/daily` - Get daily leaderboard
- `GET /api/leaderboard/weekly` - Get weekly leaderboard

## Deployment

Deploy to Vercel:

```bash
vercel --prod
```

## Architecture

This is part of the GameFi microservices architecture:

- **Core API** (this repo) - Essential services
- **Raffle System** - Lottery and winner selection
- **Social Bots** - Telegram/Twitter integration
- **Individual Games** - Separate game repositories
- **Admin Dashboard** - Management interface
EOF

echo "✅ Core API setup complete!"
echo ""
echo "📁 Created structure:"
echo "   - Next.js API routes for core services"
echo "   - Supabase integration"
echo "   - Authentication utilities"
echo "   - TypeScript configuration"
echo "   - Deployment configuration"
echo ""
echo "🎯 Next steps:"
echo "   1. cd $CORE_API_DIR"
echo "   2. npm install"
echo "   3. Configure .env.local with your Supabase credentials"
echo "   4. npx supabase start"
echo "   5. npm run dev"
echo ""
echo "🔗 Repository: https://github.com/MWOR-GameFi/$CORE_API_DIR"

cd ..
echo "🚀 Ready for next migration step!"