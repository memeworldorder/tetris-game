#!/bin/bash

echo "🔥 FIXING EVERYTHING AND GETTING IT WORKING"
echo "============================================"
echo ""

# Step 1: Clean everything
echo "🧹 Cleaning up corrupted files..."
rm -rf node_modules package-lock.json .next .npm 2>/dev/null
npm cache clean --force 2>/dev/null || true

# Step 2: Fix package.json if needed
echo "📝 Checking package.json..."
if [ ! -f "package.json" ]; then
    echo "❌ No package.json found!"
    exit 1
fi

# Step 3: Create environment file
echo "⚙️  Creating .env.local..."
cat > .env.local << 'EOF'
# Supabase (Working Configuration)
NEXT_PUBLIC_SUPABASE_URL=https://qtwmykpyhcvfavjgncty.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTU2MDcsImV4cCI6MjA2NjYzMTYwN30.lhpqOaxVxadQamtHT_vx3-JyoKyThV3uMGMLvOMHRyU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA1NTYwNywiZXhwIjoyMDY2NjMxNjA3fQ.fwu/6tRriMFnAYMa2UH6HoKu2uMdCU8P8wScHcX3Us0kFbOl0pfQ0vjPUM34XRyRu82LZ0dVCmAiXUJjlVpC2A

# Solana Mainnet
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Game Settings
NEXT_PUBLIC_GAME_NAME=TetrisWar
NEXT_PUBLIC_DAILY_LIVES=5
NEXT_PUBLIC_LIFE_COST_SOL=0.001

JWT_SECRET=gamefi-tetris-production-secret-key-2024
EOF

# Step 4: Try multiple npm install methods
echo "📦 Installing dependencies (trying multiple methods)..."

# Method 1: Standard install
if npm install --no-audit --no-fund; then
    echo "✅ Standard install worked!"
elif npm install --legacy-peer-deps --no-audit; then
    echo "✅ Legacy peer deps worked!"
elif npm install --force --no-audit; then
    echo "✅ Force install worked!"
elif npm install --legacy-peer-deps --force --no-audit; then
    echo "✅ Both flags worked!"
else
    echo "❌ npm install failed. Trying yarn..."
    if command -v yarn &> /dev/null; then
        yarn install
    else
        echo "Installing yarn..."
        npm install -g yarn
        yarn install
    fi
fi

# Step 5: Run the database setup
echo ""
echo "🗄️  DATABASE SETUP REQUIRED:"
echo "1. Go to: https://qtwmykpyhcvfavjgncty.supabase.co"
echo "2. Open SQL Editor"
echo "3. Copy and paste the contents of: create-supabase-tables.sql"
echo "4. Click 'Run'"
echo ""
echo "⏳ Press Enter when you've run the SQL script..."
read -p ""

# Step 6: Start the app
echo "🚀 Starting the GameFi Tetris app..."
echo ""
echo "🌐 Opening: http://localhost:3000"
echo "🎮 Your GameFi platform should now work!"
echo ""
echo "🔍 Features to test:"
echo "   • Wallet connection"
echo "   • API health: http://localhost:3000/api/gamefi?action=health"
echo "   • Lives system"
echo "   • Game playing"
echo ""

# Start the development server
npm run dev 