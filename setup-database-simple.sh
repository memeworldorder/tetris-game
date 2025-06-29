#!/bin/bash

echo "🗄️  SETTING UP DATABASE - SIMPLE APPROACH"
echo "==========================================="
echo ""

# Extract credentials
SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local | cut -d'=' -f2)
SERVICE_KEY=$(grep "SUPABASE_SERVICE_ROLE_KEY" .env.local | cut -d'=' -f2)

echo "🔗 Using: $SUPABASE_URL"
echo "🔑 Service key: ${SERVICE_KEY:0:20}..."
echo ""

# Method 1: Try to create tables via our setup API
echo "1️⃣ Setting up database via API..."
SETUP_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/setup-db")
echo "Setup API response: $SETUP_RESPONSE"

if [[ $SETUP_RESPONSE == *"success"* ]]; then
    echo "✅ Database setup via API worked!"
else
    echo "⚠️  API setup failed, trying direct method..."
    
    # Method 2: Direct table creation
    echo ""
    echo "2️⃣ Creating tables directly..."
    
    # Create user_lives table directly
    echo "Creating user_lives table..."
    CREATE_RESPONSE=$(curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/create_table" \
      -H "apikey: $SERVICE_KEY" \
      -H "Authorization: Bearer $SERVICE_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "table_name": "user_lives",
        "columns": [
          {"name": "id", "type": "serial", "primary_key": true},
          {"name": "wallet_address", "type": "text", "unique": true, "not_null": true},
          {"name": "free_today", "type": "integer", "default": 5},
          {"name": "bonus_today", "type": "integer", "default": 0},
          {"name": "paid_bank", "type": "integer", "default": 0},
          {"name": "created_at", "type": "timestamptz", "default": "now()"},
          {"name": "updated_at", "type": "timestamptz", "default": "now()"}
        ]
      }' 2>/dev/null || echo "Direct creation failed")
fi

echo ""
echo "3️⃣ Testing database connection..."

# Test if we can access user_lives table
TEST_RESPONSE=$(curl -s -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" "$SUPABASE_URL/rest/v1/user_lives?limit=1")

if [[ $TEST_RESPONSE == "[]" ]] || [[ $TEST_RESPONSE == *"[{"* ]]; then
    echo "✅ user_lives table is accessible!"
    
    # Insert test user if table is empty
    if [[ $TEST_RESPONSE == "[]" ]]; then
        echo "📝 Inserting test user..."
        INSERT_RESPONSE=$(curl -s -X POST "$SUPABASE_URL/rest/v1/user_lives" \
          -H "apikey: $SERVICE_KEY" \
          -H "Authorization: Bearer $SERVICE_KEY" \
          -H "Content-Type: application/json" \
          -H "Prefer: return=minimal" \
          -d '{
            "wallet_address": "FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai",
            "free_today": 5,
            "bonus_today": 0,
            "paid_bank": 0
          }')
        echo "Test user inserted!"
    fi
    
else
    echo "❌ Table still not accessible: $TEST_RESPONSE"
    echo ""
    echo "🛠️  MANUAL FIX REQUIRED:"
    echo "1. Go to: $SUPABASE_URL"
    echo "2. Click 'SQL Editor'"
    echo "3. Run this SQL:"
    echo ""
    cat create-supabase-tables.sql
    echo ""
    echo "4. Then run: ./test-working.sh"
    exit 1
fi

echo ""
echo "🧪 Testing our GameFi APIs..."
./test-working.sh 