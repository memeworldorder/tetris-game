-- 🚀 GAMEFI TETRIS DATABASE SETUP
-- Run this in Supabase SQL Editor

-- User lives table (core GameFi functionality)
CREATE TABLE IF NOT EXISTS user_lives (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  free_today INTEGER DEFAULT 5,
  bonus_today INTEGER DEFAULT 0,
  paid_bank INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  game_type TEXT DEFAULT 'tetris',
  status TEXT DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  game_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User stats table
CREATE TABLE IF NOT EXISTS user_stats (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  total_games INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table (for SOL purchases)
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  type TEXT NOT NULL, -- 'buy_lives', 'reward', etc
  amount_sol DECIMAL(10,9) DEFAULT 0,
  lives_purchased INTEGER DEFAULT 0,
  tx_signature TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_lives ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now - can restrict later)
CREATE POLICY "Allow all operations on user_lives" ON user_lives FOR ALL USING (true);
CREATE POLICY "Allow all operations on game_sessions" ON game_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_stats" ON user_stats FOR ALL USING (true);
CREATE POLICY "Allow all operations on transactions" ON transactions FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_lives_wallet ON user_lives(wallet_address);
CREATE INDEX IF NOT EXISTS idx_game_sessions_wallet ON game_sessions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_game_sessions_score ON game_sessions(score DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_wallet ON user_stats(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_stats_best_score ON user_stats(best_score DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_address);

-- Insert some test data
INSERT INTO user_lives (wallet_address, free_today, bonus_today, paid_bank) 
VALUES 
  ('FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai', 5, 0, 0),
  ('TestWallet123456789', 3, 2, 5)
ON CONFLICT (wallet_address) DO NOTHING;

INSERT INTO user_stats (wallet_address, total_games, total_score, best_score)
VALUES 
  ('FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai', 10, 45000, 8500),
  ('TestWallet123456789', 5, 23000, 6200)
ON CONFLICT (wallet_address) DO NOTHING;

-- Verify tables were created
SELECT 'user_lives' as table_name, count(*) as row_count FROM user_lives
UNION ALL
SELECT 'game_sessions' as table_name, count(*) as row_count FROM game_sessions
UNION ALL
SELECT 'user_stats' as table_name, count(*) as row_count FROM user_stats
UNION ALL
SELECT 'transactions' as table_name, count(*) as row_count FROM transactions; 