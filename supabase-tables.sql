-- GameFi Platform Database Schema for Supabase
-- Copy and paste this into your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Lives Table
CREATE TABLE user_lives (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  free_today INTEGER DEFAULT 3,
  bonus_today INTEGER DEFAULT 0,
  paid_bank INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game Sessions Table
CREATE TABLE game_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  game_type TEXT DEFAULT 'tetris',
  score INTEGER NOT NULL DEFAULT 0,
  lines_cleared INTEGER DEFAULT 0,
  level_reached INTEGER DEFAULT 1,
  duration_seconds INTEGER DEFAULT 0,
  moves_made INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leaderboard Table
CREATE TABLE leaderboards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  game_type TEXT DEFAULT 'tetris',
  score INTEGER NOT NULL,
  rank INTEGER,
  period TEXT DEFAULT 'daily', -- daily, weekly, monthly, all-time
  period_start DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Profiles Table
CREATE TABLE user_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  avatar_url TEXT,
  total_games_played INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  achievements JSONB DEFAULT '[]',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions/Rewards Table
CREATE TABLE transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  transaction_type TEXT NOT NULL, -- 'life_purchase', 'reward', 'bonus'
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'SOL',
  game_session_id UUID REFERENCES game_sessions(id),
  status TEXT DEFAULT 'pending', -- pending, completed, failed
  blockchain_tx_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_user_lives_wallet ON user_lives(wallet_address);
CREATE INDEX idx_game_sessions_wallet ON game_sessions(wallet_address);
CREATE INDEX idx_game_sessions_score ON game_sessions(score DESC);
CREATE INDEX idx_leaderboards_period ON leaderboards(period, period_start);
CREATE INDEX idx_leaderboards_score ON leaderboards(score DESC);
CREATE INDEX idx_user_profiles_wallet ON user_profiles(wallet_address);
CREATE INDEX idx_transactions_wallet ON transactions(wallet_address);

-- Create Row Level Security (RLS) policies
ALTER TABLE user_lives ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (you can restrict later)
CREATE POLICY "Allow all operations on user_lives" ON user_lives FOR ALL USING (true);
CREATE POLICY "Allow all operations on game_sessions" ON game_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on leaderboards" ON leaderboards FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_profiles" ON user_profiles FOR ALL USING (true);
CREATE POLICY "Allow all operations on transactions" ON transactions FOR ALL USING (true);

-- Insert sample data for testing
INSERT INTO user_lives (wallet_address, free_today, bonus_today, paid_bank) VALUES 
('FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai', 3, 2, 5);

INSERT INTO user_profiles (wallet_address, username, total_games_played, best_score) VALUES 
('FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai', 'TetrisPlayer1', 15, 12500); 