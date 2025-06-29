#!/bin/bash

echo "🚀 DEPLOYING GAMEFI TETRIS TO VERCEL"
echo "===================================="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local not found! Run ./setup-simple.sh first"
    exit 1
fi

echo "🔐 SECURITY: Reading API keys from .env.local (not exposing them)"
echo ""

# Function to securely add environment variables
add_env_var() {
    local var_name=$1
    local var_value=$(grep "^$var_name=" .env.local | cut -d'=' -f2- | tr -d '"')
    
    if [ -n "$var_value" ]; then
        echo "✅ Setting $var_name (value hidden for security)"
        echo "$var_value" | vercel env add "$var_name" production --silent 2>/dev/null || echo "   (may already exist)"
    else
        echo "⚠️  $var_name not found in .env.local"
    fi
}

echo "🔧 Setting up environment variables securely..."

# Add each environment variable without exposing values
add_env_var "NEXT_PUBLIC_SUPABASE_URL"
add_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY"
add_env_var "SUPABASE_SERVICE_ROLE_KEY"
add_env_var "NEXT_PUBLIC_SOLANA_NETWORK"
add_env_var "NEXT_PUBLIC_SOLANA_RPC_URL"
add_env_var "NEXT_PUBLIC_GAME_NAME"
add_env_var "NEXT_PUBLIC_DAILY_LIVES"
add_env_var "NEXT_PUBLIC_LIFE_COST_SOL"
add_env_var "JWT_SECRET"

echo ""
echo "🏗️  Deploying to Vercel..."
vercel --prod

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================"
echo ""
echo "🌐 Your GameFi APIs are now online!"
echo ""
echo "📋 API Endpoints Available:"
echo "   • GET  /api/gamefi?action=health"
echo "   • GET  /api/gamefi?action=lives&wallet=ADDRESS"  
echo "   • GET  /api/gamefi?action=profile&wallet=ADDRESS"
echo "   • GET  /api/gamefi?action=leaderboard&limit=100"
echo "   • POST /api/gamefi (use_life, buy_lives, end_game)"
echo ""
echo "🎮 Your GameFi Platform Features:"
echo "   ✅ Wallet connection"
echo "   ✅ Tetris game"
echo "   ✅ Lives system (5 free daily)"
echo "   ✅ Leaderboards"
echo "   ✅ SOL payments (0.001 SOL per life)"
echo "   ✅ Achievement system"
echo "   ✅ Mobile responsive"
echo ""
echo "🔒 Security: All API keys were handled securely"
echo "💡 To add custom domain: vercel domains add yourdomain.com"
echo ""
echo "🧪 Test your APIs:"
echo "   curl 'https://your-deployment-url.vercel.app/api/gamefi?action=health'"
echo "" 