#!/bin/bash

echo "🔍 CHECKING SUPABASE DATABASE CONNECTION"
echo "========================================"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local not found!"
    exit 1
fi

# Extract Supabase URL
SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local | cut -d'=' -f2)
SUPABASE_KEY=$(grep "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local | cut -d'=' -f2)

echo "🔗 Supabase URL: $SUPABASE_URL"
echo "🔑 API Key: ${SUPABASE_KEY:0:20}..."
echo ""

# Test basic Supabase connection
echo "1️⃣ Testing Supabase API connection..."
API_TEST=$(curl -s -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $SUPABASE_KEY" "$SUPABASE_URL/rest/v1/")

if [[ $API_TEST == *"title"* ]] || [[ $API_TEST == *"OpenAPI"* ]]; then
    echo "✅ Supabase API is accessible!"
else
    echo "❌ Supabase API connection failed!"
    echo "Response: $API_TEST"
    echo ""
    echo "🔧 Possible issues:"
    echo "   • Wrong Supabase URL"
    echo "   • Invalid API key"
    echo "   • Project is paused"
    echo "   • Network issues"
    exit 1
fi

echo ""
echo "2️⃣ Checking if tables exist..."

# Check for user_lives table
TABLE_CHECK=$(curl -s -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $SUPABASE_KEY" "$SUPABASE_URL/rest/v1/user_lives?limit=1")

if [[ $TABLE_CHECK == *"[{"* ]] || [[ $TABLE_CHECK == "[]" ]]; then
    echo "✅ user_lives table exists!"
    
    # Count rows
    ROW_COUNT=$(curl -s -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $SUPABASE_KEY" -H "Prefer: count=exact" "$SUPABASE_URL/rest/v1/user_lives?select=id")
    echo "   Rows in user_lives: $(echo $ROW_COUNT | grep -o '"count":[0-9]*' | cut -d':' -f2)"
    
elif [[ $TABLE_CHECK == *"does not exist"* ]] || [[ $TABLE_CHECK == *"relation"* ]]; then
    echo "❌ user_lives table does NOT exist!"
    echo "Response: $TABLE_CHECK"
    echo ""
    echo "🗄️  DATABASE SETUP REQUIRED:"
    echo "   1. Go to: $SUPABASE_URL"
    echo "   2. Click 'SQL Editor'"
    echo "   3. Copy contents of create-supabase-tables.sql"
    echo "   4. Paste and Run"
    exit 1
else
    echo "⚠️  Unexpected response from user_lives:"
    echo "Response: $TABLE_CHECK"
fi

echo ""
echo "3️⃣ Testing other tables..."

for table in "game_sessions" "user_stats" "transactions"; do
    TABLE_TEST=$(curl -s -H "apikey: $SUPABASE_KEY" -H "Authorization: Bearer $SUPABASE_KEY" "$SUPABASE_URL/rest/v1/$table?limit=1")
    
    if [[ $TABLE_TEST == *"[{"* ]] || [[ $TABLE_TEST == "[]" ]]; then
        echo "✅ $table table exists!"
    else
        echo "❌ $table table missing!"
    fi
done

echo ""
echo "🎉 DATABASE STATUS:"
echo "=================="
echo ""

# Final test with our API
echo "4️⃣ Testing our GameFi API..."
sleep 1

if curl -s "http://localhost:3000/api/gamefi?action=health" > /dev/null 2>&1; then
    API_RESPONSE=$(curl -s "http://localhost:3000/api/gamefi?action=health")
    
    if [[ $API_RESPONSE == *"\"success\":true"* ]]; then
        echo "✅ GameFi API is working!"
        echo ""
        echo "🎮 READY TO GO!"
        echo "   • Database: Connected ✅"
        echo "   • Tables: Set up ✅"  
        echo "   • API: Working ✅"
        echo ""
        echo "🌐 Open: http://localhost:3000"
    else
        echo "❌ GameFi API has errors:"
        echo "$API_RESPONSE"
    fi
else
    echo "❌ GameFi API not responding (is the app running?)"
    echo ""
    echo "🚀 Start the app with: npm run dev"
fi

echo "" 