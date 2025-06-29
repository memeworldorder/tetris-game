#!/bin/bash

# 🧪 Supabase Connection Test Script
# Tests the connection to your Supabase instance with actual credentials

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Your actual Supabase credentials
SUPABASE_PROJECT_ID="qtwmykpyhcvfavjgncty"
SUPABASE_URL="https://qtwmykpyhcvfavjgncty.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTU2MDcsImV4cCI6MjA2NjYzMTYwN30.lhpqOaxVxadQamtHT_vx3-JyoKyThV3uMGMLvOMHRyU"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA1NTYwNywiZXhwIjoyMDY2NjMxNjA3fQ.L8sIHwA9HFHS8tLn1KNg8Ei8V-C0c8EsjK3i3frQtQo"

echo -e "${BLUE}🧪 SUPABASE CONNECTION TEST${NC}"
echo -e "${BLUE}===========================${NC}"
echo ""
echo -e "${YELLOW}Testing connection to: ${SUPABASE_URL}${NC}"
echo ""

# Test 1: Basic API health check
echo -e "${BLUE}Test 1: Basic API Health Check${NC}"
if curl -s -f "${SUPABASE_URL}/rest/v1/" -H "apikey: ${SUPABASE_ANON_KEY}" > /dev/null; then
    echo -e "${GREEN}✅ Supabase REST API is accessible${NC}"
else
    echo -e "${RED}❌ Supabase REST API connection failed${NC}"
    exit 1
fi

# Test 2: Authentication endpoint
echo -e "${BLUE}Test 2: Authentication Endpoint${NC}"
if curl -s -f "${SUPABASE_URL}/auth/v1/settings" -H "apikey: ${SUPABASE_ANON_KEY}" > /dev/null; then
    echo -e "${GREEN}✅ Supabase Auth API is accessible${NC}"
else
    echo -e "${RED}❌ Supabase Auth API connection failed${NC}"
fi

# Test 3: Check existing tables (with anon key - might be limited by RLS)
echo -e "${BLUE}Test 3: Database Schema Check${NC}"
TABLES_RESPONSE=$(curl -s "${SUPABASE_URL}/rest/v1/" -H "apikey: ${SUPABASE_ANON_KEY}")
if echo "$TABLES_RESPONSE" | grep -q "paths"; then
    echo -e "${GREEN}✅ Database schema is accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Database schema access limited (normal with RLS)${NC}"
fi

# Test 4: Service role key test
echo -e "${BLUE}Test 4: Service Role Access${NC}"
SERVICE_RESPONSE=$(curl -s "${SUPABASE_URL}/rest/v1/" -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}")
if echo "$SERVICE_RESPONSE" | grep -q "paths"; then
    echo -e "${GREEN}✅ Service role key is working${NC}"
else
    echo -e "${YELLOW}⚠️  Service role response unclear${NC}"
fi

# Test 5: Try to access a common table (users, if it exists)
echo -e "${BLUE}Test 5: Table Access Test${NC}"
USER_TABLE_RESPONSE=$(curl -s -w "%{http_code}" "${SUPABASE_URL}/rest/v1/users?limit=1" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")

HTTP_CODE="${USER_TABLE_RESPONSE: -3}"
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Users table is accessible${NC}"
elif [ "$HTTP_CODE" = "404" ]; then
    echo -e "${YELLOW}⚠️  Users table not found (may need to be created)${NC}"
elif [ "$HTTP_CODE" = "401" ]; then
    echo -e "${RED}❌ Authentication failed${NC}"
else
    echo -e "${YELLOW}⚠️  HTTP $HTTP_CODE - Check table permissions${NC}"
fi

echo ""
echo -e "${BLUE}📊 Connection Summary${NC}"
echo -e "${BLUE}===================${NC}"
echo -e "• Project ID: ${YELLOW}${SUPABASE_PROJECT_ID}${NC}"
echo -e "• URL: ${YELLOW}${SUPABASE_URL}${NC}"
echo -e "• Anon Key: ${YELLOW}${SUPABASE_ANON_KEY:0:20}...${NC}"
echo -e "• Service Key: ${YELLOW}${SUPABASE_SERVICE_ROLE_KEY:0:20}...${NC}"
echo ""

# Test 6: Check if microservices tables exist
echo -e "${BLUE}Test 6: Microservices Schema Check${NC}"
SCHEMA_TABLES=(
    "users"
    "user_lives" 
    "game_sessions"
    "leaderboards"
    "transactions"
    "user_stats"
)

for table in "${SCHEMA_TABLES[@]}"; do
    TABLE_RESPONSE=$(curl -s -w "%{http_code}" "${SUPABASE_URL}/rest/v1/${table}?limit=1" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")
    
    TABLE_HTTP_CODE="${TABLE_RESPONSE: -3}"
    if [ "$TABLE_HTTP_CODE" = "200" ]; then
        echo -e "  ✅ ${table}"
    elif [ "$TABLE_HTTP_CODE" = "404" ]; then
        echo -e "  ❌ ${table} (not found)"
    else
        echo -e "  ⚠️  ${table} (HTTP $TABLE_HTTP_CODE)"
    fi
done

echo ""
echo -e "${GREEN}🎉 Supabase connection test completed!${NC}"
echo ""
echo -e "${BLUE}💡 Next Steps:${NC}"
echo "1. If all tests passed: Run './deploy-production.sh'"
echo "2. If tables are missing: Run microservices schema setup"
echo "3. If auth failed: Check your service role key"
echo ""
echo -e "${YELLOW}Ready to deploy? Run: ${GREEN}./deploy-production.sh${NC}" 