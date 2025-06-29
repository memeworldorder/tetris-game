# 🎯 SIMPLE DEPLOYMENT - GET IT WORKING NOW

Forget the complexity! Let's get your GameFi Tetris working online in 5 minutes.

## 🚀 Option 1: Fix Vercel (Easiest)

You already have Vercel set up with environment variables. Let's just make it work:

```bash
chmod +x fix-vercel-final.sh
./fix-vercel-final.sh
```

This will:
- ✅ Test your local API first
- ✅ Deploy to Vercel with force flag
- ✅ Test the deployment automatically
- ✅ Give you working URLs

## 🚀 Option 2: Render.com (Also Easy)

If Vercel still gives issues, deploy to Render.com:

### Step 1: Create render.yaml
```yaml
services:
  - type: web
    name: tetris-gamefi
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NEXT_PUBLIC_SUPABASE_URL
        value: https://qtwmykpyhcvfavjgncty.supabase.co
      - key: NEXT_PUBLIC_SUPABASE_ANON_KEY
        value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNTU2MDcsImV4cCI6MjA2NjYzMTYwN30.lhpqOaxVxadQamtHT_vx3-JyoKyThV3uMGMLvOMHRyU
      - key: SUPABASE_SERVICE_ROLE_KEY
        value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0d215a3B5aGN2ZmF2amduY3R5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA1NTYwNywiZXhwIjoyMDY2NjMxNjA3fQ.fwu/6tRriMFnAYMa2UH6HoKu2uMdCU8P8wScHcX3Us0kFbOl0pfQ0vjPUM34XRyRu82LZ0dVCmAiXUJjlVpC2A
      - key: NEXT_PUBLIC_SOLANA_NETWORK
        value: mainnet-beta
      - key: NEXT_PUBLIC_SOLANA_RPC_URL
        value: https://api.mainnet-beta.solana.com
      - key: JWT_SECRET
        value: gs3wge52zYRYyCbnYrEC1wD96Q9SB5KQVCN8bHF9gh7hVo6vwKgI2Mxm7/OiczdpExnpd5tTAETIKW6KAfGRjvw==
```

### Step 2: Deploy
1. Go to [render.com](https://render.com)
2. Connect your GitHub repo
3. It will auto-deploy using render.yaml

## 🎮 What You Get (Either Way)

### Working Features:
- ✅ **Wallet Connection** - Phantom, Solflare, etc.
- ✅ **Tetris Game** - Full game with scoring
- ✅ **Lives System** - 5 free daily lives + buy with SOL
- ✅ **Leaderboards** - Real-time competition
- ✅ **User Profiles** - Stats and achievements
- ✅ **Mobile Ready** - Works on phones

### API Endpoints:
- `GET /api/gamefi?action=health` - Health check
- `GET /api/gamefi?action=lives&wallet=ADDRESS` - Get user lives
- `GET /api/gamefi?action=leaderboard` - Get top players
- `POST /api/gamefi` - Use life, buy lives, end game

### Database:
- ✅ **Supabase** (already configured)
- ✅ **4 tables** (user_lives, game_sessions, user_stats, transactions)
- ✅ **Test data** already inserted

## 💰 Costs

| Platform | Monthly Cost |
|----------|--------------|
| Vercel | $0 (hobby) |
| Render | $7/month |
| Supabase | $0 (free tier) |

**Total: $0-7/month** for full GameFi platform!

## 🆘 If Still Not Working

The issue is likely one of these:

1. **Environment Variables**: Check Vercel dashboard
2. **Supabase Connection**: Test with: `curl https://qtwmykpyhcvfavjgncty.supabase.co/rest/v1/`
3. **API Routes**: Check Next.js logs

## 🚀 Microservices Later

Once this simple version works, you can:
1. **Extract services** one by one
2. **Deploy to Railway/Render** 
3. **Scale horizontally**

But first - get the core working! 

---

**🎯 Try this now:**
```bash
./fix-vercel-final.sh
``` 