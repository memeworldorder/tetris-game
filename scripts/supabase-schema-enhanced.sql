-- Enhanced Supabase Database Schema for MWOR Game & Raffle System
-- Includes all security features, raffle system, and audit trails

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS raffle_qualified_wallets CASCADE;
DROP TABLE IF EXISTS daily_raffles CASCADE;
DROP TABLE IF EXISTS game_sessions CASCADE;
DROP TABLE IF EXISTS move_logs CASCADE;
DROP TABLE IF EXISTS score_proofs CASCADE;
DROP TABLE IF EXISTS vrf_seeds CASCADE;
DROP TABLE IF EXISTS plays CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS lives CASCADE;

-- =============================================================================
-- CORE GAME TABLES (Enhanced)
-- =============================================================================

-- Lives table: tracks lives remaining for TODAY with enhanced tracking
CREATE TABLE lives (
  wallet          TEXT PRIMARY KEY,
  free_today      INTEGER DEFAULT 0,
  bonus_today     INTEGER DEFAULT 0,
  paid_bank       INTEGER DEFAULT 0,
  last_reset      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  device_fingerprint TEXT,
  ip_address      TEXT,
  total_games_played INTEGER DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table: blockchain payments that bought lives (enhanced)
CREATE TABLE payments (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  wallet          TEXT NOT NULL,
  tx_sig          TEXT UNIQUE NOT NULL,
  mwor_amount     BIGINT NOT NULL,
  lives_bought    INTEGER NOT NULL,
  payment_tier    TEXT CHECK (payment_tier IN ('cheap', 'mid', 'high')),
  temp_address    TEXT,
  helius_processed_at TIMESTAMP WITH TIME ZONE,
  burn_amount     BIGINT, -- 50% of payment burned
  prize_pool_amount BIGINT, -- 50% to prize pool
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced plays table with security features
CREATE TABLE plays (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  wallet          TEXT NOT NULL,
  score           INTEGER NOT NULL,
  seed_hash       TEXT NOT NULL,
  move_hash       TEXT NOT NULL, -- Hash of move sequence
  move_count      INTEGER NOT NULL,
  game_duration_ms INTEGER,
  sig             BYTEA NOT NULL, -- Ed25519 signature from server
  session_id      TEXT NOT NULL,
  bot_confidence  REAL DEFAULT 0, -- Bot detection score 0-1
  is_qualified    BOOLEAN DEFAULT FALSE, -- Top 25% qualification
  merkle_leaf_index INTEGER, -- Position in daily Merkle tree
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- SECURITY & AUDIT TABLES
-- =============================================================================

-- VRF seeds for randomness management
CREATE TABLE vrf_seeds (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  seed_hash       TEXT NOT NULL,
  proof           BYTEA,
  public_key      BYTEA,
  rotation_date   DATE NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Score proofs for verification
CREATE TABLE score_proofs (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  play_id         BIGINT REFERENCES plays(id),
  wallet          TEXT NOT NULL,
  score           INTEGER NOT NULL,
  seed_hash       TEXT NOT NULL,
  move_count      INTEGER NOT NULL,
  signature       BYTEA NOT NULL,
  server_public_key BYTEA NOT NULL,
  verified        BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game sessions for commit-reveal scheme
CREATE TABLE game_sessions (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id      TEXT UNIQUE NOT NULL,
  wallet          TEXT NOT NULL,
  seed_hash       TEXT NOT NULL, -- Committed seed hash
  revealed_seed   TEXT, -- Revealed after game
  is_revealed     BOOLEAN DEFAULT FALSE,
  started_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at        TIMESTAMP WITH TIME ZONE,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned'))
);

-- Move logs for full audit trail (7-day retention)
CREATE TABLE move_logs (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id      TEXT NOT NULL,
  move_sequence   JSONB NOT NULL, -- Full move sequence
  compressed_data BYTEA, -- Compressed move data
  archived_at     TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- RAFFLE SYSTEM TABLES
-- =============================================================================

-- Daily raffle results
CREATE TABLE daily_raffles (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date            DATE UNIQUE NOT NULL,
  winner_wallet   TEXT NOT NULL,
  winner_score    INTEGER NOT NULL,
  winner_rank     INTEGER NOT NULL,
  winner_tickets  INTEGER NOT NULL,
  total_tickets   INTEGER NOT NULL,
  total_qualified INTEGER NOT NULL,
  merkle_root     TEXT NOT NULL, -- On-chain Merkle root
  vrf_seed        TEXT NOT NULL,
  vrf_proof       TEXT,
  prize_amount    BIGINT, -- Total prize from pool
  on_chain_tx     TEXT, -- Transaction hash for on-chain update
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily qualified wallets for raffle
CREATE TABLE raffle_qualified_wallets (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date            DATE NOT NULL,
  wallet_address  TEXT NOT NULL,
  score           INTEGER NOT NULL,
  rank            INTEGER NOT NULL,
  tickets         INTEGER NOT NULL,
  tier            TEXT NOT NULL CHECK (tier IN ('rank1', 'ranks2to5', 'ranks6to10', 'remaining')),
  merkle_leaf_hash TEXT NOT NULL,
  merkle_proof    TEXT[], -- Array of proof hashes
  UNIQUE(date, wallet_address)
);

-- Raffle configuration (DAO controlled)
CREATE TABLE raffle_config (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  config_name     TEXT UNIQUE NOT NULL,
  slice_percent   INTEGER DEFAULT 25, -- Top % that qualify
  rank1_tickets   INTEGER DEFAULT 25,
  ranks2to5_tickets INTEGER DEFAULT 15,
  ranks6to10_tickets INTEGER DEFAULT 10,
  remaining_tickets INTEGER DEFAULT 1,
  max_tickets_per_wallet INTEGER DEFAULT 25,
  effective_date  DATE NOT NULL,
  created_by      TEXT, -- DAO proposal or admin
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- ABUSE PREVENTION TABLES
-- =============================================================================

-- Rate limiting tracking
CREATE TABLE rate_limits (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identifier      TEXT NOT NULL, -- IP:fingerprint:wallet combo
  endpoint        TEXT NOT NULL,
  count           INTEGER DEFAULT 1,
  window_start    TIMESTAMP WITH TIME ZONE NOT NULL,
  last_request    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_blocked      BOOLEAN DEFAULT FALSE,
  UNIQUE(identifier, endpoint, window_start)
);

-- Suspicious activity log
CREATE TABLE suspicious_activity (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  wallet          TEXT,
  activity_type   TEXT NOT NULL, -- 'bot_detected', 'rate_limit_exceeded', 'invalid_moves', etc.
  severity        TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details         JSONB,
  ip_address      TEXT,
  user_agent      TEXT,
  automated_action TEXT, -- What system did (blocked, flagged, etc.)
  resolved        BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- DAILY AGGREGATION TABLES
-- =============================================================================

-- Daily stats for monitoring
CREATE TABLE daily_stats (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date            DATE UNIQUE NOT NULL,
  total_players   INTEGER DEFAULT 0,
  total_games     INTEGER DEFAULT 0,
  total_score     BIGINT DEFAULT 0,
  average_score   INTEGER DEFAULT 0,
  free_lives_claimed INTEGER DEFAULT 0,
  paid_lives_bought INTEGER DEFAULT 0,
  total_mwor_spent BIGINT DEFAULT 0,
  total_mwor_burned BIGINT DEFAULT 0,
  bot_detections  INTEGER DEFAULT 0,
  rate_limit_hits INTEGER DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Lives table indexes
CREATE INDEX idx_lives_wallet ON lives(wallet);
CREATE INDEX idx_lives_last_reset ON lives(last_reset);
CREATE INDEX idx_lives_device_fingerprint ON lives(device_fingerprint);

-- Payments table indexes
CREATE INDEX idx_payments_wallet ON payments(wallet);
CREATE INDEX idx_payments_tx_sig ON payments(tx_sig);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_temp_address ON payments(temp_address);

-- Plays table indexes
CREATE INDEX idx_plays_wallet ON plays(wallet);
CREATE INDEX idx_plays_score ON plays(score);
CREATE INDEX idx_plays_created_at ON plays(created_at);
CREATE INDEX idx_plays_qualified ON plays(is_qualified);
CREATE INDEX idx_plays_session_id ON plays(session_id);
CREATE INDEX idx_plays_daily_score ON plays(wallet, created_at, score);

-- Game sessions indexes
CREATE INDEX idx_sessions_wallet ON game_sessions(wallet);
CREATE INDEX idx_sessions_session_id ON game_sessions(session_id);
CREATE INDEX idx_sessions_status ON game_sessions(status);

-- Raffle tables indexes
CREATE INDEX idx_daily_raffles_date ON daily_raffles(date);
CREATE INDEX idx_qualified_wallets_date ON raffle_qualified_wallets(date);
CREATE INDEX idx_qualified_wallets_wallet ON raffle_qualified_wallets(wallet_address);
CREATE INDEX idx_qualified_wallets_rank ON raffle_qualified_wallets(date, rank);

-- Rate limiting indexes
CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX idx_rate_limits_window ON rate_limits(window_start);

-- Activity monitoring indexes
CREATE INDEX idx_suspicious_activity_wallet ON suspicious_activity(wallet);
CREATE INDEX idx_suspicious_activity_type ON suspicious_activity(activity_type);
CREATE INDEX idx_suspicious_activity_created ON suspicious_activity(created_at);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE lives ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE vrf_seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE move_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE raffle_qualified_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE raffle_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspicious_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (restrict based on your auth setup)
CREATE POLICY "Allow all operations on lives" ON lives FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on payments" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on plays" ON plays FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on vrf_seeds" ON vrf_seeds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on score_proofs" ON score_proofs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on game_sessions" ON game_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on move_logs" ON move_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on daily_raffles" ON daily_raffles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on raffle_qualified_wallets" ON raffle_qualified_wallets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on raffle_config" ON raffle_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on rate_limits" ON rate_limits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on suspicious_activity" ON suspicious_activity FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on daily_stats" ON daily_stats FOR ALL USING (true) WITH CHECK (true);

-- =============================================================================
-- TRIGGERS & FUNCTIONS
-- =============================================================================

-- Function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_lives_updated_at 
    BEFORE UPDATE ON lives 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically mark qualified plays
CREATE OR REPLACE FUNCTION mark_qualified_plays()
RETURNS TRIGGER AS $$
DECLARE
    daily_threshold INTEGER;
    qualifying_score INTEGER;
BEGIN
    -- Calculate top 25% threshold for the day
    SELECT PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY score) 
    INTO qualifying_score
    FROM plays 
    WHERE DATE(created_at) = DATE(NEW.created_at);
    
    -- Mark as qualified if score is in top 25%
    IF NEW.score >= COALESCE(qualifying_score, 0) THEN
        NEW.is_qualified = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-mark qualified plays
CREATE TRIGGER mark_qualified_plays_trigger
    BEFORE INSERT ON plays
    FOR EACH ROW
    EXECUTE FUNCTION mark_qualified_plays();

-- Function to clean up old move logs (7-day retention)
CREATE OR REPLACE FUNCTION cleanup_old_move_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM move_logs 
    WHERE created_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- =============================================================================
-- INITIAL DATA
-- =============================================================================

-- Insert default raffle configuration
INSERT INTO raffle_config (
    config_name,
    slice_percent,
    rank1_tickets,
    ranks2to5_tickets,
    ranks6to10_tickets,
    remaining_tickets,
    max_tickets_per_wallet,
    effective_date,
    created_by
) VALUES (
    'default_v1',
    25,  -- Top 25% qualify
    25,  -- 1st place gets 25 tickets
    15,  -- 2-5 place get 15 tickets each
    10,  -- 6-10 place get 10 tickets each
    1,   -- 11-25% get 1 ticket each
    25,  -- Max 25 tickets per wallet
    CURRENT_DATE,
    'system_init'
);

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- View for current daily leaderboard
CREATE VIEW daily_leaderboard AS
SELECT 
    wallet,
    MAX(score) as best_score,
    RANK() OVER (ORDER BY MAX(score) DESC) as rank,
    COUNT(*) as games_played,
    CASE 
        WHEN RANK() OVER (ORDER BY MAX(score) DESC) = 1 THEN 'rank1'
        WHEN RANK() OVER (ORDER BY MAX(score) DESC) BETWEEN 2 AND 5 THEN 'ranks2to5'
        WHEN RANK() OVER (ORDER BY MAX(score) DESC) BETWEEN 6 AND 10 THEN 'ranks6to10'
        ELSE 'remaining'
    END as tier
FROM plays 
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY wallet
ORDER BY best_score DESC;

-- View for raffle-qualified wallets today
CREATE VIEW todays_qualified_wallets AS
SELECT 
    dl.*,
    CASE 
        WHEN tier = 'rank1' THEN 25
        WHEN tier = 'ranks2to5' THEN 15
        WHEN tier = 'ranks6to10' THEN 10
        ELSE 1
    END as tickets
FROM daily_leaderboard dl
WHERE rank <= (
    SELECT CEIL(COUNT(DISTINCT wallet) * 0.25) 
    FROM plays 
    WHERE DATE(created_at) = CURRENT_DATE
);

-- View for daily statistics
CREATE VIEW daily_summary AS
SELECT 
    CURRENT_DATE as date,
    COUNT(DISTINCT wallet) as unique_players,
    COUNT(*) as total_games,
    AVG(score)::INTEGER as average_score,
    MAX(score) as top_score,
    SUM(CASE WHEN bot_confidence > 0.5 THEN 1 ELSE 0 END) as suspected_bots
FROM plays 
WHERE DATE(created_at) = CURRENT_DATE;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Enhanced MWOR Game & Raffle database schema created successfully!';
    RAISE NOTICE 'Tables created: %, %, %, %, %, %, %, %, %, %, %, %', 
        'lives', 'payments', 'plays', 'vrf_seeds', 'score_proofs', 'game_sessions',
        'move_logs', 'daily_raffles', 'raffle_qualified_wallets', 'raffle_config',
        'rate_limits', 'suspicious_activity';
    RAISE NOTICE 'Security features: RLS enabled, audit trails, anti-bot detection';
    RAISE NOTICE 'Raffle system: Top 25%% qualification, tiered tickets, VRF selection';
    RAISE NOTICE 'Ready for MWOR Game & Raffle microservice deployment!';
END $$; 