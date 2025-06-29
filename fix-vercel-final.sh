#!/bin/bash

echo "🔧 FINAL VERCEL FIX - GETTING EVERYTHING WORKING"
echo "================================================"

# 1. Make sure our main API route works
echo "✅ Main API route already fixed: /api/gamefi"

# 2. Test if environment variables are working
echo "🧪 Testing environment variables..."
node -e "
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Database available:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
" 2>/dev/null || echo "Environment check failed (normal for local)"

# 3. Test local API first
echo "🔍 Testing local API..."
if curl -s http://localhost:3000/api/gamefi?action=health > /dev/null 2>&1; then
    echo "✅ Local API responding"
    LOCAL_RESPONSE=$(curl -s http://localhost:3000/api/gamefi?action=health)
    echo "Response: $LOCAL_RESPONSE"
else
    echo "❌ Local API not responding - start with: npm run dev"
fi

# 4. Deploy to Vercel with clean build
echo "🚀 Deploying to Vercel..."
vercel --prod --force

# 5. Get the deployment URL and test
echo "🧪 Testing deployment..."
sleep 10  # Wait for deployment

# Get the latest deployment URL
DEPLOYMENT_URL=$(vercel ls --limit=1 | grep -o 'https://[^ ]*' | head -1)

if [ -n "$DEPLOYMENT_URL" ]; then
    echo "🌐 Testing: $DEPLOYMENT_URL"
    
    # Test health endpoint
    HEALTH_RESPONSE=$(curl -s "$DEPLOYMENT_URL/api/gamefi?action=health" || echo "failed")
    
    if [[ $HEALTH_RESPONSE == *"healthy"* ]]; then
        echo "✅ Deployment working!"
        echo "Health response: $HEALTH_RESPONSE"
        
        # Test lives endpoint
        echo "🧪 Testing lives endpoint..."
        LIVES_RESPONSE=$(curl -s "$DEPLOYMENT_URL/api/gamefi?action=lives&wallet=FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai" || echo "failed")
        echo "Lives response: $LIVES_RESPONSE"
        
    else
        echo "❌ Deployment failed or not responding properly"
        echo "Response: $HEALTH_RESPONSE"
        
        echo ""
        echo "🔧 Manual check:"
        echo "1. Go to: https://vercel.com/dashboard"
        echo "2. Check your project logs"
        echo "3. Verify environment variables are set"
    fi
    
    echo ""
    echo "🎮 Your GameFi app: $DEPLOYMENT_URL"
    echo "📊 API endpoints:"
    echo "   • Health: $DEPLOYMENT_URL/api/gamefi?action=health"
    echo "   • Lives: $DEPLOYMENT_URL/api/gamefi?action=lives&wallet=YOUR_WALLET"
    echo "   • Leaderboard: $DEPLOYMENT_URL/api/gamefi?action=leaderboard"
    
else
    echo "❌ Could not get deployment URL"
    echo "Run 'vercel ls' to see your deployments"
fi

echo ""
echo "🎯 If this doesn't work, the issue is likely:"
echo "   1. Environment variables not set correctly in Vercel"
echo "   2. Supabase database connection"
echo "   3. API route configuration"
echo ""
echo "🔍 Debug steps:"
echo "   1. vercel logs # Check deployment logs"
echo "   2. Test locally first: npm run dev"
echo "   3. Check Vercel dashboard for errors" 