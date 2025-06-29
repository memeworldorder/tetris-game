-- Supabase Database Schema for Game API Microservice

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS plays CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS lives CASCADE;

-- Lives table: tracks lives remaining for TODAY
CREATE TABLE lives (
  wallet          TEXT PRIMARY KEY,
  free_today      INTEGER DEFAULT 0,
  bonus_today     INTEGER DEFAULT 0,
  paid_bank       INTEGER DEFAULT 0,
  last_reset      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table: blockchain payments that bought lives
CREATE TABLE payments (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  wallet          TEXT NOT NULL,
  tx_sig          TEXT UNIQUE NOT NULL,
  mwor_amount     BIGINT NOT NULL,
  lives_bought    INTEGER NOT NULL,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plays table: round log & score proof
CREATE TABLE plays (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  wallet          TEXT NOT NULL,
  score           INTEGER NOT NULL,
  seed_hash       TEXT NOT NULL,
  sig             BYTEA NOT NULL,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_lives_wallet ON lives(wallet);
CREATE INDEX idx_lives_last_reset ON lives(last_reset);

CREATE INDEX idx_payments_wallet ON payments(wallet);
CREATE INDEX idx_payments_tx_sig ON payments(tx_sig);
CREATE INDEX idx_payments_created_at ON payments(created_at);

CREATE INDEX idx_plays_wallet ON plays(wallet);
CREATE INDEX idx_plays_score ON plays(score);
CREATE INDEX idx_plays_created_at ON plays(created_at);

-- RLS (Row Level Security) - Enable but allow all for now
-- You may want to restrict access based on your auth setup
ALTER TABLE lives ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE plays ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (you should restrict this based on your auth)
CREATE POLICY "Allow all operations on lives" ON lives FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on payments" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on plays" ON plays FOR ALL USING (true) WITH CHECK (true);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_lives_updated_at 
    BEFORE UPDATE ON lives 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 