                  #!/bin/bash

echo "🔐 SECURE VERCEL DEPLOYMENT"
echo "==========================="
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

echo "🔐 Security Notice:"
echo "   Your API keys will be read from .env.local"
echo "   They will NOT be exposed in this script"
echo ""

# Function to securely add environment variables
add_env_var() {
    local var_name=$1
    local var_value=$(grep "^$var_name=" .env.local | cut -d'=' -f2- | tr -d '"')
    
    if [ -n "$var_value" ]; then
        echo "Setting $var_name..."
        echo "$var_value" | vercel env add "$var_name" production
    else
        echo "⚠️  $var_name not found in .env.local"
    fi
}

echo "🔧 Setting environment variables from .env.local..."

# Add each environment variable securely
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
echo "🚀 Deploying to Vercel..."
vercel --prod

echo ""
echo "🎉 SECURE DEPLOYMENT COMPLETE!"
echo "=============================="
echo ""
echo "✅ Your API keys were handled securely"
echo "✅ No keys were exposed in the deployment process"
echo "✅ All environment variables set from .env.local"
echo ""
echo "🌐 Your GameFi APIs are now online!"
echo ""
echo "🧪 Test your deployment:"
echo "   curl 'https://your-url.vercel.app/api/gamefi?action=health'"
echo ""
echo "🔒 Security best practices:"
echo "   • API keys are not in version control"
echo "   • Environment variables are encrypted in Vercel"
echo "   • Keys are only visible to you in Vercel dashboard"
echo "" 