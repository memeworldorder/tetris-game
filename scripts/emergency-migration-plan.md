# 🚨 Emergency Migration Plan: Microservices → Supabase + Vercel

## Current Situation
- 12 microservices "almost" working
- Can't keep hosting locally
- Need production deployment NOW

## Migration Strategy: Consolidate Everything

### Phase 1: Core Gaming Functions (Week 1)
Move these to Supabase Edge Functions:

1. **Game Engine APIs** → Edge Functions
```typescript
// supabase/functions/game-start/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { wallet_address, game_id } = await req.json()
  
  // Your existing game logic here
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  // Use database functions
  const { data, error } = await supabase.rpc('handle_game_start', {
    wallet_address,
    game_id
  })
  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

2. **User Service** → Supabase Auth + Database
3. **Payment Service** → Edge Function + Webhook

### Phase 2: Move Everything Else to Next.js API Routes

```typescript
// app/api/[[...route]]/route.ts
// Catch-all API route that handles ALL your endpoints

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Map all your microservice endpoints
const routes = {
  'user/lives': async (req: Request) => {
    // Your user service logic
  },
  'game/start': async (req: Request) => {
    // Call Supabase Edge Function
    const response = await fetch(
      `${process.env.SUPABASE_URL}/functions/v1/game-start`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: req.body,
      }
    )
    return response.json()
  },
  'leaderboard/daily': async (req: Request) => {
    const { data } = await supabase
      .from('daily_leaderboard')
      .select('*')
      .limit(100)
    return data
  },
  // ... map all other endpoints
}

export async function GET(req: NextRequest) {
  const path = req.nextUrl.pathname.replace('/api/', '')
  const handler = routes[path]
  
  if (!handler) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  
  const data = await handler(req)
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  // Same pattern for POST
}
```

### Phase 3: Background Jobs → Vercel Cron

```typescript
// app/api/cron/daily-reset/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Verify this is from Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Run daily reset
  const { data, error } = await supabase.rpc('daily_reset')
  
  return NextResponse.json({ success: true, data })
}
```

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/daily-reset",
    "schedule": "0 0 * * *"
  }]
}
```

## Quick Migration Script

```bash
#!/bin/bash
# migrate-to-supabase.sh

# 1. Create Supabase project
echo "1. Go to https://supabase.com and create a new project"
echo "2. Get your project URL and keys"

# 2. Run database migration
echo "3. Run this SQL in Supabase SQL editor:"
cat scripts/supabase-complete-migration.sql

# 3. Deploy Edge Functions
echo "4. Deploy Edge Functions:"
supabase functions deploy game-start
supabase functions deploy game-end
supabase functions deploy process-payment

# 4. Update environment variables
echo "5. Add to .env.local:"
echo "NEXT_PUBLIC_SUPABASE_URL=your_url"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key"
echo "SUPABASE_SERVICE_ROLE_KEY=your_service_key"

# 5. Deploy to Vercel
echo "6. Deploy to Vercel:"
vercel --prod
```

## Service Mapping

| Microservice | Migration Target | Priority |
|-------------|-----------------|----------|
| Game Engine | Supabase Edge Functions | HIGH |
| User Service | Supabase Auth + DB | HIGH |
| Payment Service | Edge Function | HIGH |
| Rewards Service | Next.js API + DB | MEDIUM |
| Analytics | Supabase DB + Views | MEDIUM |
| Telegram Bot | Vercel Serverless | LOW |
| Twitter Bot | Vercel Serverless | LOW |
| Admin Dashboard | Next.js Pages | LOW |
| Scheduler | Vercel Cron | MEDIUM |
| API Gateway | Not needed | - |

## Immediate Benefits

1. **ONE deployment command**: `vercel --prod`
2. **ONE database URL**: Supabase handles everything
3. **Auto-scaling**: Both Vercel and Supabase scale automatically
4. **Built-in monitoring**: Vercel Analytics + Supabase Dashboard
5. **No more Docker/K8s**: Just Git push

## Cost Estimate

- Vercel Pro: $20/month
- Supabase Pro: $25/month
- **Total: $45/month** vs managing 12 services yourself

## Emergency Migration Timeline

**Day 1-2**: 
- Set up Supabase project
- Run database migration
- Test basic queries

**Day 3-4**:
- Move Game Engine to Edge Functions
- Move User Service to Supabase Auth

**Day 5-6**:
- Consolidate all APIs into Next.js
- Set up Vercel deployment

**Day 7**:
- Testing & go live

## The "Just Make It Work" Approach

If you need it working TODAY:

1. Keep your existing Next.js frontend
2. Create ONE Next.js API route that proxies to Supabase
3. Move your database to Supabase
4. Deploy to Vercel
5. Iterate from there

Remember: **Perfect is the enemy of deployed**. Get it working first, optimize later. 