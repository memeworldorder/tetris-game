# 🚨 EMERGENCY PRODUCTION DEPLOYMENT - GO LIVE TODAY

## STEP 1: Supabase Setup (15 minutes)

1. **Create Supabase Project NOW**
   - Go to https://supabase.com/dashboard
   - Click "New Project"
   - Name: "tetris-gamefi-prod"
   - Password: Generate strong one
   - Region: Choose closest to your users
   - Click "Create Project" (takes 2 minutes)

2. **Get Your Credentials**
   While project is creating, it will show:
   - Project URL: `https://xxxxx.supabase.co`
   - Anon Key: `eyJhbGc...`
   - Service Role Key: Click "Settings" → "API" to find it

3. **Run Database Migration**
   - Go to SQL Editor in Supabase Dashboard
   - Copy ALL content from `scripts/supabase-complete-migration.sql`
   - Paste and click "Run"
   - You should see "Success" messages

## STEP 2: Update Your Code (5 minutes)

1. **Create .env.local**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://mczejwodeibtoddlvtrd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jemVqd29kZWlidG9kZGx2dHJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNTU2NjAsImV4cCI6MjA2NjczMTY2MH0.GXONcgi-sDlZQiXgDucWDjNVcnvfwKfFNFRiC7mb6_8
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

2. **Install Supabase Client**
```bash
npm install @supabase/supabase-js
```

3. **The Magic File is Already Created**
   - `app/api/[[...proxy]]/route.ts` handles ALL your endpoints
   - No more microservices needed!

## STEP 3: Deploy to Vercel (10 minutes)

1. **Push to GitHub**
```bash
git add .
git commit -m "Emergency production deployment"
git push origin main
```

2. **Deploy to Vercel**
```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy
vercel --prod
```

3. **Add Environment Variables in Vercel**
   - Go to your Vercel dashboard
   - Project Settings → Environment Variables
   - Add all 3 variables from .env.local

4. **Set Up Cron Jobs**
Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/resetMidnight",
    "schedule": "0 0 * * *"
  }]
}
```

## DONE! Your APIs are now live at:

- `https://your-app.vercel.app/api/user/lives?wallet=xxx`
- `https://your-app.vercel.app/api/game/start`
- `https://your-app.vercel.app/api/game/end`
- `https://your-app.vercel.app/api/leaderboard/daily`
- etc...

## Testing Production (2 minutes)

```bash
# Test user lives endpoint
curl https://your-app.vercel.app/api/user/lives?wallet=test123

# Test leaderboard
curl https://your-app.vercel.app/api/leaderboard/daily
```

## If Something Breaks:

1. **Check Vercel Logs**: Dashboard → Functions → Logs
2. **Check Supabase Logs**: Dashboard → Logs → API
3. **Quick Fix**: The catch-all route in `app/api/[[...proxy]]/route.ts`

## What You Get:

✅ All your microservice endpoints working
✅ Auto-scaling (Vercel + Supabase handle it)
✅ Real-time capability ready
✅ No Docker, no Kubernetes, no complexity
✅ $45/month total cost vs $$$ for 12 services

## Next Steps (After Launch):

1. Monitor for 24 hours
2. Add real-time features gradually
3. Optimize slow queries
4. Add more Supabase features as needed

**REMEMBER: Done is better than perfect. Ship it now, optimize later!** 