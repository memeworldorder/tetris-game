# Supabase Migration Guide

## Generated Files

### 1. Supabase Functions (/supabase-migration/functions/index.ts)
Contains all the Supabase client functions that replace your database queries.

### 2. API Routes (/supabase-migration/routes/)
Updated API route handlers that use the Supabase functions.

## Migration Steps

1. **Database Setup**
   - Import your existing PostgreSQL schema to Supabase
   - Create any required RPC functions
   - Set up Row Level Security policies

2. **Environment Variables**
   Add to your .env.local:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. **Gradual Migration**
   - Copy generated functions to your lib/ directory
   - Replace API routes one by one
   - Test each endpoint thoroughly

## Endpoint Mapping

- **/api/user/lives** → Table: `user_lives`
- **/api/user/profile** → Table: `users`
- **/api/user/stats** → Table: `user_game_stats`
- **/api/game/start** → RPC Function: `handle_game_start`
- **/api/game/end** → RPC Function: `handle_game_end`
- **/api/leaderboard/daily** → View: `daily_leaderboard`
- **/api/leaderboard/weekly** → View: `weekly_leaderboard`
- **/api/payments/process** → RPC Function: `process_payment`
- **/api/community/achievements** → Table: `user_achievements`
- **/api/community/referrals** → Table: `referrals`

## Required Database Functions

Create these RPC functions in Supabase:

```sql
-- Example: handle_game_start
CREATE OR REPLACE FUNCTION handle_game_start(
  wallet_address TEXT,
  game_id UUID
) RETURNS JSON AS $$
BEGIN
  -- Your game start logic here
  RETURN json_build_object('session_id', gen_random_uuid());
END;
$$ LANGUAGE plpgsql;

-- Example: handle_game_end
CREATE OR REPLACE FUNCTION handle_game_end(
  session_id UUID,
  score INTEGER,
  moves JSONB
) RETURNS JSON AS $$
BEGIN
  -- Your game end logic here
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
```

## Benefits
- ✅ No complete rewrite needed
- ✅ Gradual migration possible
- ✅ Keep existing business logic
- ✅ Add Supabase features incrementally

# Run this in your Supabase SQL editor:
psql -f scripts/supabase-complete-migration.sql
