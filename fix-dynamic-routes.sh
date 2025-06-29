#!/bin/bash

echo "🔧 FIXING DYNAMIC ROUTES FOR DEPLOYMENT"
echo "========================================"

# List of critical routes to fix
routes=(
  "app/api/buyLife/route.ts"
  "app/api/leaderboard/daily/route.ts"
  "app/api/admin/analytics/route.ts"
  "app/api/admin/leaderboards/route.ts"
)

for route in "${routes[@]}"; do
  if [ -f "$route" ]; then
    echo "🔧 Fixing $route..."
    # Add dynamic export after the imports
    sed -i '/^import.*$/a\\n// Force dynamic rendering for this route\nexport const dynamic = '"'"'force-dynamic'"'"'' "$route"
    # Replace new URL(request.url) with request.nextUrl.searchParams
    sed -i 's/const { searchParams } = new URL(request.url)/const searchParams = request.nextUrl.searchParams/g' "$route"
    sed -i 's/new URL(request.url)/request.nextUrl/g' "$route"
  fi
done

echo "✅ Critical routes fixed for deployment!"
echo ""
echo "🚀 Now try deploying again:"
echo "   vercel --prod" 