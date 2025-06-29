# 🚀 Supabase GameFi Setup (WORKING SOLUTION!)

## Why This Works Better:
- ✅ **No Microservices Complexity** - Single database, auto REST API
- ✅ **No Docker Issues** - Cloud-hosted PostgreSQL  
- ✅ **No Port Conflicts** - Everything runs through Supabase
- ✅ **Real-time Updates** - Built-in subscriptions
- ✅ **One Deploy** - Single Next.js app

## Quick Setup:

### 1. Create Supabase Project (2 minutes)
```bash
# Go to https://supabase.com
# Click "New Project"  
# Copy your URL and anon key
```

### 2. Set Environment Variables
```bash
# Create .env.local file:
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Create Tables (SQL in Supabase)
```sql
-- User lives table
CREATE TABLE user_lives (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  free_today INTEGER DEFAULT 3,
  bonus_today INTEGER DEFAULT 0,
  paid_bank INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game sessions table  
CREATE TABLE game_sessions (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  score INTEGER NOT NULL,
  game_type TEXT DEFAULT 'tetris',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  moves_count INTEGER DEFAULT 0
);

-- Enable Row Level Security (optional)
ALTER TABLE user_lives ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for demo)
CREATE POLICY "Allow all operations" ON user_lives FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON game_sessions FOR ALL USING (true);
```

### 4. Test (No microservices needed!)
```bash
pnpm dev
# Go to http://localhost:3001
# Connect wallet and play!
```

## What Changed:
- ❌ **Removed**: 12 microservices, Docker, API Gateway, complex routing
- ✅ **Added**: Simple Supabase client, direct database calls  
- ✅ **Result**: Everything actually works!

## API Endpoints Now Working:
- `GET /api/user/lives?wallet=xxx` ✅
- `POST /api/user/use-life` ✅  
- Auto leaderboards ✅
- Real-time updates ✅

## For Demo/Testing:
The app will work with mock data even without Supabase setup.
Just start it and connect your wallet! 