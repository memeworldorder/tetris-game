#!/bin/bash

echo "🔧 FIXING DATABASE ISSUE RIGHT NOW"
echo "=================================="
echo ""

# Extract Supabase credentials
SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local | cut -d'=' -f2)
SERVICE_KEY=$(grep "SUPABASE_SERVICE_ROLE_KEY" .env.local | cut -d'=' -f2)

echo "🗄️  Creating database tables via API..."

# Create user_lives table
echo "Creating user_lives table..."
curl -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "CREATE TABLE IF NOT EXISTS public.user_lives (id SERIAL PRIMARY KEY, wallet_address TEXT UNIQUE NOT NULL, free_today INTEGER DEFAULT 5, bonus_today INTEGER DEFAULT 0, paid_bank INTEGER DEFAULT 0, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());"
  }'

# Create game_sessions table
echo "Creating game_sessions table..."
curl -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "CREATE TABLE IF NOT EXISTS public.game_sessions (id SERIAL PRIMARY KEY, wallet_address TEXT NOT NULL, score INTEGER DEFAULT 0, game_type TEXT DEFAULT '\''tetris'\'', status TEXT DEFAULT '\''active'\'', started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), ended_at TIMESTAMP WITH TIME ZONE, game_data JSONB, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());"
  }'

# Create user_stats table
echo "Creating user_stats table..."
curl -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "CREATE TABLE IF NOT EXISTS public.user_stats (id SERIAL PRIMARY KEY, wallet_address TEXT UNIQUE NOT NULL, total_games INTEGER DEFAULT 0, total_score INTEGER DEFAULT 0, best_score INTEGER DEFAULT 0, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());"
  }'

# Create transactions table
echo "Creating transactions table..."
curl -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "CREATE TABLE IF NOT EXISTS public.transactions (id SERIAL PRIMARY KEY, wallet_address TEXT NOT NULL, type TEXT NOT NULL, amount_sol DECIMAL(10,9) DEFAULT 0, lives_purchased INTEGER DEFAULT 0, tx_signature TEXT, status TEXT DEFAULT '\''pending'\'', created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());"
  }'

# Set up RLS policies
echo "Setting up security policies..."
curl -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "ALTER TABLE public.user_lives ENABLE ROW LEVEL SECURITY; CREATE POLICY IF NOT EXISTS \"Allow all\" ON public.user_lives FOR ALL USING (true); ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY; CREATE POLICY IF NOT EXISTS \"Allow all\" ON public.game_sessions FOR ALL USING (true); ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY; CREATE POLICY IF NOT EXISTS \"Allow all\" ON public.user_stats FOR ALL USING (true); ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY; CREATE POLICY IF NOT EXISTS \"Allow all\" ON public.transactions FOR ALL USING (true);"
  }'

# Insert test data
echo "Inserting test data..."
curl -X POST "$SUPABASE_URL/rest/v1/user_lives" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{
    "wallet_address": "FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai",
    "free_today": 5,
    "bonus_today": 0,
    "paid_bank": 0
  }'

curl -X POST "$SUPABASE_URL/rest/v1/user_stats" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{
    "wallet_address": "FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai",
    "total_games": 0,
    "total_score": 0,
    "best_score": 0
  }'

echo ""
echo "✅ Database setup complete!"
echo ""
echo "🧪 Testing the fix..."
./test-working.sh 