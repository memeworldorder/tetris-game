#!/bin/bash

echo "⚡ QUICK DEPLOY TO VERCEL"
echo "========================"
echo ""

# Install Vercel CLI if needed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Login to Vercel (will open browser)
echo "🔐 Login to Vercel (browser will open)..."
vercel login

# Deploy with environment variables from .env.local
echo "🚀 Deploying GameFi Tetris..."
vercel --prod

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================"
echo ""
echo "Your GameFi Tetris platform is now live!"
echo ""
echo "🔧 Don't forget to set environment variables in Vercel dashboard:"
echo "   1. Go to your project settings"
echo "   2. Add Environment Variables tab"
echo "   3. Copy from your .env.local file"
echo ""
echo "📋 Required Environment Variables:"
echo "   • NEXT_PUBLIC_SUPABASE_URL"
echo "   • NEXT_PUBLIC_SUPABASE_ANON_KEY"  
echo "   • SUPABASE_SERVICE_ROLE_KEY"
echo "   • NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta"
echo "   • NEXT_PUBLIC_SOLANA_RPC_URL"
echo "   • NEXT_PUBLIC_GAME_NAME=TetrisWar"
echo "   • NEXT_PUBLIC_DAILY_LIVES=5"
echo "   • NEXT_PUBLIC_LIFE_COST_SOL=0.001"
echo "   • JWT_SECRET"
echo ""
echo "🧪 Test your live APIs:"
echo "   curl 'https://your-url.vercel.app/api/gamefi?action=health'"
echo "" 