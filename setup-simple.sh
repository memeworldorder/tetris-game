#!/bin/bash

echo "🚀 Setting up your GameFi Tetris platform..."
echo "================================================"

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "📝 Creating environment configuration..."
    cat > .env.local << 'EOF'
# Supabase (Already configured!)
NEXT_PUBLIC_SUPABASE_URL=https://qtwmykpyhcvfavjgncty.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTU2MDcsImV4cCI6MjA2NjYzMTYwN30.lhpqOaxVxadQamtHT_vx3-JyoKyThV3uMGMLvOMHRyU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA1NTYwNywiZXhwIjoyMDY2NjMxNjA3fQ.fwu/6tRriMFnAYMa2UH6HoKu2uMdCU8P8wScHcX3Us0kFbOl0pfQ0vjPUM34XRyRu82LZ0dVCmAiXUJjlVpC2A

# Solana Mainnet
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Game Config
NEXT_PUBLIC_GAME_NAME=TetrisWar
NEXT_PUBLIC_DAILY_LIVES=5
NEXT_PUBLIC_LIFE_COST_SOL=0.001

# Social Bots (Optional - add your tokens here)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHANNEL_ID=
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_SECRET=

JWT_SECRET=gamefi-tetris-production-secret-key-2024
EOF
    echo "✅ Environment file created!"
else
    echo "⏭️  Environment file already exists, skipping..."
fi

# Function to try different installation methods
install_dependencies() {
    echo "📦 Installing dependencies..."
    
    # Method 1: Clear npm cache and try standard install
    echo "🧹 Clearing npm cache..."
    npm cache clean --force
    
    echo "🔄 Trying standard npm install..."
    if npm install; then
        echo "✅ Dependencies installed successfully!"
        return 0
    fi
    
    # Method 2: Remove node_modules and package-lock.json, then retry
    echo "⚠️  Standard install failed. Cleaning up and retrying..."
    rm -rf node_modules package-lock.json
    
    if npm install; then
        echo "✅ Dependencies installed successfully after cleanup!"
        return 0
    fi
    
    # Method 3: Try with legacy peer deps
    echo "⚠️  Trying with --legacy-peer-deps..."
    if npm install --legacy-peer-deps; then
        echo "✅ Dependencies installed with legacy peer deps!"
        return 0
    fi
    
    # Method 4: Try with force flag
    echo "⚠️  Trying with --force flag..."
    if npm install --force; then
        echo "✅ Dependencies installed with --force!"
        return 0
    fi
    
    # Method 5: Try yarn if available
    if command -v yarn &> /dev/null; then
        echo "⚠️  Trying with Yarn..."
        if yarn install; then
            echo "✅ Dependencies installed with Yarn!"
            return 0
        fi
    fi
    
    # Method 6: Try pnpm if available
    if command -v pnpm &> /dev/null; then
        echo "⚠️  Trying with pnpm..."
        if pnpm install; then
            echo "✅ Dependencies installed with pnpm!"
            return 0
        fi
    fi
    
    echo "❌ All installation methods failed."
    return 1
}

# Run the installation with multiple fallbacks
if install_dependencies; then
    echo ""
    echo "🎉 Setup Complete!"
    echo "================================================"
    echo ""
    echo "🚀 To start your GameFi platform:"
    echo "   npm run dev"
    echo ""
    echo "🌐 Then open: http://localhost:3000"
    echo ""
    echo "🎮 Features ready to use:"
    echo "   ✅ Wallet connection"
    echo "   ✅ Tetris game"
    echo "   ✅ Lives system"
    echo "   ✅ Leaderboards"
    echo "   ✅ SOL payments"
    echo "   ✅ Achievement system"
    echo ""
    echo "💡 To add social bots later, edit .env.local and add your bot tokens"
    echo ""
    echo "📖 Need help? Check JUST_MAKE_IT_WORK.md"
    echo ""
else
    echo ""
    echo "❌ Setup Failed!"
    echo "================"
    echo ""
    echo "🔧 Manual fix options:"
    echo "1. Try: npm install --legacy-peer-deps --force"
    echo "2. Or: rm -rf node_modules package-lock.json && npm install"
    echo "3. Or: Use yarn: yarn install"
    echo "4. Or: Use pnpm: pnpm install"
    echo ""
    echo "💡 If you have Node.js issues:"
    echo "- Update Node.js to v18 or v20"
    echo "- Try: nvm use 18 (if you have nvm)"
    echo ""
    echo "🆘 Still stuck? Check:"
    echo "- Your internet connection"
    echo "- Disk space availability"
    echo "- npm version: npm --version"
    echo ""
fi 