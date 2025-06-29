# 🔥 SUPABASE CLI COMPLETE SETUP GUIDE

**Use the CLI to create, deploy, and manage everything!**

## 🚀 Step 1: Install Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Verify installation
supabase --version
```

## 🔗 Step 2: Initialize & Link Project

```bash
# Initialize Supabase in your project
cd tetris-game
supabase init

# Login to Supabase
supabase login

# Link to your existing project
supabase link --project-ref qtwmykpyhcvfavjgncty
```

## 🛠️ Step 3: Create Edge Functions Using CLI

### Create all functions at once:

```bash
# Create handle-game-start function
supabase functions new handle-game-start

# Create handle-game-end function  
supabase functions new handle-game-end

# Create daily-reset function
supabase functions new daily-reset

# Create verify-wallet function
supabase functions new verify-wallet
```

This creates the directory structure:
```
supabase/
├── functions/
│   ├── handle-game-start/
│   │   └── index.ts
│   ├── handle-game-end/
│   │   └── index.ts
│   ├── daily-reset/
│   │   └── index.ts
│   ├── verify-wallet/
│   │   └── index.ts
│   └── import_map.json
```

## 📝 Step 4: Add Function Code

The CLI creates empty templates. Copy our code into each function:

### handle-game-start/index.ts
```typescript
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { wallet_address, game_type = 'tetris' } = await req.json()

    if (!wallet_address) {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user lives
    let { data: userLives, error: livesError } = await supabaseClient
      .from('user_lives')
      .select('*')
      .eq('wallet_address', wallet_address)
      .single()

    // Create user if doesn't exist
    if (livesError && livesError.code === 'PGRST116') {
      const { data: newUser, error: createError } = await supabaseClient
        .from('user_lives')
        .insert({
          wallet_address,
          free_today: 3,
          bonus_today: 0,
          paid_bank: 0
        })
        .select()
        .single()

      if (createError) throw createError
      userLives = newUser
    } else if (livesError) {
      throw livesError
    }

    // Check if user has lives
    const totalLives = userLives.free_today + userLives.bonus_today + userLives.paid_bank
    if (totalLives <= 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No lives available',
          lives: userLives 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Deduct a life
    let updateData = {}
    if (userLives.free_today > 0) {
      updateData.free_today = userLives.free_today - 1
    } else if (userLives.bonus_today > 0) {
      updateData.bonus_today = userLives.bonus_today - 1
    } else if (userLives.paid_bank > 0) {
      updateData.paid_bank = userLives.paid_bank - 1
    }

    // Update user lives
    const { data: updatedLives, error: updateError } = await supabaseClient
      .from('user_lives')
      .update(updateData)
      .eq('wallet_address', wallet_address)
      .select()
      .single()

    if (updateError) throw updateError

    // Create game session
    const { data: gameSession, error: sessionError } = await supabaseClient
      .from('game_sessions')
      .insert({
        wallet_address,
        game_type,
        started_at: new Date().toISOString(),
        status: 'active'
      })
      .select()
      .single()

    if (sessionError) throw sessionError

    return new Response(
      JSON.stringify({
        success: true,
        session_id: gameSession.id,
        remaining_lives: updatedLives,
        message: 'Game started successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handle-game-start:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

## 🔐 Step 5: Set Environment Secrets

```bash
# Set secrets for your functions
supabase secrets set JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
supabase secrets set SUPABASE_URL="https://qtwmykpyhcvfavjgncty.supabase.co"
supabase secrets set SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTU2MDcsImV4cCI6MjA2NjYzMTYwN30.lhpqOaxVxadQamtHT_vx3-JyoKyThV3uMGMLvOMHRyU"

# List all secrets
supabase secrets list
```

## 🚀 Step 6: Deploy Functions

```bash
# Deploy individual functions
supabase functions deploy handle-game-start
supabase functions deploy handle-game-end
supabase functions deploy daily-reset
supabase functions deploy verify-wallet

# Or deploy all functions at once
supabase functions deploy

# Deploy with custom import map
supabase functions deploy --import-map supabase/functions/import_map.json
```

## 🧪 Step 7: Test Functions Locally

```bash
# Start local Supabase stack
supabase start

# Serve functions locally (in another terminal)
supabase functions serve

# Test a function locally
curl -X POST http://localhost:54321/functions/v1/handle-game-start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"wallet_address":"test-wallet","game_type":"tetris"}'
```

## 📊 Step 8: Database Setup via CLI

```bash
# Generate types from your database
supabase gen types typescript --local > types/supabase.ts

# Apply database migrations (if you have any)
supabase db push

# Reset database to clean state
supabase db reset

# Create a new migration
supabase migration new create_game_tables
```

## 📝 Step 9: Manage Functions

```bash
# List all deployed functions
supabase functions list

# View function logs
supabase functions logs handle-game-start
supabase functions logs handle-game-end --follow

# Delete a function
supabase functions delete old-function-name

# Download function code
supabase functions download handle-game-start
```

## 🔄 Step 10: Set Up Cron Jobs

```bash
# Connect to your database via CLI
supabase db shell

# Then run SQL to set up cron job:
```

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily reset at midnight UTC
SELECT cron.schedule(
  'daily-reset',
  '0 0 * * *',
  'SELECT net.http_post(
    url := ''https://qtwmykpyhcvfavjgncty.supabase.co/functions/v1/daily-reset'',
    headers := ''{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'',
    body := ''{}''::jsonb
  );'
);

-- List all cron jobs
SELECT * FROM cron.job;
```

## 🎯 Step 11: Production Deployment

```bash
# Deploy to production
supabase functions deploy --project-ref qtwmykpyhcvfavjgncty

# Verify deployment
curl -X POST https://qtwmykpyhcvfavjgncty.supabase.co/functions/v1/handle-game-start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"wallet_address":"FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai","game_type":"tetris"}'
```

## 🔧 CLI Configuration

Create `supabase/config.toml` for project settings:

```toml
[api]
enabled = true
port = 54321

[db]
port = 54322
major_version = 15

[functions]
verify_jwt = false

[auth]
enabled = true
```

## 📋 Quick Commands Reference

```bash
# Essential CLI commands
supabase init                    # Initialize project
supabase start                   # Start local stack
supabase stop                    # Stop local stack
supabase status                  # Check status
supabase functions new <name>    # Create function
supabase functions deploy        # Deploy all functions
supabase functions serve         # Serve locally
supabase functions logs <name>   # View logs
supabase secrets set KEY=value   # Set secret
supabase db shell               # Database shell
supabase gen types typescript   # Generate types
```

## 🚨 Troubleshooting

```bash
# Check CLI version
supabase --version

# Update CLI
npm update -g supabase

# Reset local environment
supabase stop
supabase start

# Check function status
supabase functions list

# View detailed logs
supabase functions logs handle-game-start --follow
```

---

## 🎉 That's It!

**Using the CLI, you can:**
- ✅ Create all functions with `supabase functions new`
- ✅ Deploy with `supabase functions deploy`
- ✅ Test locally with `supabase functions serve`
- ✅ Manage secrets with `supabase secrets set`
- ✅ Monitor with `supabase functions logs`
- ✅ Set up database with `supabase db shell`

**Everything through the CLI - no manual file creation needed!** 🚀 