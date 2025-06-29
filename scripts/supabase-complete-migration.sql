-- Supabase Complete Migration Schema
-- This creates all necessary database objects for migrating from microservices to Supabase

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CORE TABLES (From your existing microservices)
-- =====================================================

-- Users table (from user-service)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT UNIQUE NOT NULL,
    username TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- User lives (from game-engine)
CREATE TABLE IF NOT EXISTS user_lives (
    wallet_address TEXT PRIMARY KEY REFERENCES users(wallet_address),
    lives INTEGER DEFAULT 5,
    last_life_used TIMESTAMPTZ,
    last_refill TIMESTAMPTZ DEFAULT NOW(),
    purchased_lives INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game sessions (from game-engine)
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT REFERENCES users(wallet_address),
    game_id TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    score INTEGER DEFAULT 0,
    moves JSONB DEFAULT '[]'::jsonb,
    vrf_seed TEXT,
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb
);

-- User game stats (from analytics-service)
CREATE TABLE IF NOT EXISTS user_game_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT REFERENCES users(wallet_address),
    game_id TEXT NOT NULL,
    total_score BIGINT DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    best_score INTEGER DEFAULT 0,
    total_time_played INTEGER DEFAULT 0,
    last_played TIMESTAMPTZ,
    achievements JSONB DEFAULT '[]'::jsonb,
    UNIQUE(wallet_address, game_id)
);

-- Leaderboards (from rewards-service)
CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT REFERENCES users(wallet_address),
    game_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    period TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
    period_start DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Payments (from payment-service)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT REFERENCES users(wallet_address),
    amount DECIMAL(10, 4) NOT NULL,
    currency TEXT DEFAULT 'SOL',
    signature TEXT UNIQUE,
    status TEXT DEFAULT 'pending',
    type TEXT NOT NULL, -- 'life_purchase', 'entry_fee', etc
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- VIEWS FOR EASY QUERYING
-- =====================================================

-- Daily leaderboard view
CREATE OR REPLACE VIEW daily_leaderboard AS
SELECT 
    l.wallet_address,
    u.username,
    u.avatar_url,
    l.score,
    l.game_id,
    RANK() OVER (PARTITION BY l.game_id ORDER BY l.score DESC) as rank
FROM leaderboard_entries l
JOIN users u ON l.wallet_address = u.wallet_address
WHERE l.period = 'daily' 
    AND l.period_start = CURRENT_DATE;

-- Weekly leaderboard view
CREATE OR REPLACE VIEW weekly_leaderboard AS
SELECT 
    l.wallet_address,
    u.username,
    u.avatar_url,
    SUM(l.score) as total_score,
    l.game_id,
    COUNT(*) as games_played,
    RANK() OVER (PARTITION BY l.game_id ORDER BY SUM(l.score) DESC) as rank
FROM leaderboard_entries l
JOIN users u ON l.wallet_address = u.wallet_address
WHERE l.period = 'weekly' 
    AND l.period_start >= date_trunc('week', CURRENT_DATE)
GROUP BY l.wallet_address, u.username, u.avatar_url, l.game_id;

-- User profile view
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
    u.*,
    ul.lives,
    ul.last_life_used,
    ul.purchased_lives,
    COALESCE(
        (SELECT json_agg(json_build_object(
            'game_id', ugs.game_id,
            'total_score', ugs.total_score,
            'games_played', ugs.games_played,
            'best_score', ugs.best_score
        ))
        FROM user_game_stats ugs 
        WHERE ugs.wallet_address = u.wallet_address), 
        '[]'::json
    ) as game_stats
FROM users u
LEFT JOIN user_lives ul ON u.wallet_address = ul.wallet_address;

-- =====================================================
-- RPC FUNCTIONS (Replace microservice logic)
-- =====================================================

-- Handle game start (replaces game-engine endpoint)
CREATE OR REPLACE FUNCTION handle_game_start(
    p_wallet_address TEXT,
    p_game_id TEXT
) RETURNS JSON AS $$
DECLARE
    v_session_id UUID;
    v_lives INTEGER;
    v_user_exists BOOLEAN;
BEGIN
    -- Check if user exists, create if not
    INSERT INTO users (wallet_address) 
    VALUES (p_wallet_address)
    ON CONFLICT (wallet_address) DO UPDATE
    SET last_login = NOW();
    
    -- Check lives
    SELECT lives INTO v_lives
    FROM user_lives
    WHERE wallet_address = p_wallet_address;
    
    IF v_lives IS NULL THEN
        -- Initialize lives for new user
        INSERT INTO user_lives (wallet_address, lives)
        VALUES (p_wallet_address, 5);
        v_lives := 5;
    ELSIF v_lives <= 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No lives remaining'
        );
    END IF;
    
    -- Create game session
    INSERT INTO game_sessions (wallet_address, game_id, status)
    VALUES (p_wallet_address, p_game_id, 'active')
    RETURNING id INTO v_session_id;
    
    -- Deduct a life
    UPDATE user_lives 
    SET lives = lives - 1,
        last_life_used = NOW()
    WHERE wallet_address = p_wallet_address;
    
    RETURN json_build_object(
        'success', true,
        'session_id', v_session_id,
        'lives_remaining', v_lives - 1
    );
END;
$$ LANGUAGE plpgsql;

-- Handle game end (replaces game-engine endpoint)
CREATE OR REPLACE FUNCTION handle_game_end(
    p_session_id UUID,
    p_score INTEGER,
    p_moves JSONB DEFAULT '[]'::jsonb
) RETURNS JSON AS $$
DECLARE
    v_wallet_address TEXT;
    v_game_id TEXT;
    v_best_score INTEGER;
    v_leaderboard_rank INTEGER;
BEGIN
    -- Update game session
    UPDATE game_sessions 
    SET ended_at = NOW(),
        score = p_score,
        moves = p_moves,
        status = 'completed'
    WHERE id = p_session_id
    RETURNING wallet_address, game_id INTO v_wallet_address, v_game_id;
    
    IF v_wallet_address IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid session'
        );
    END IF;
    
    -- Update user stats
    INSERT INTO user_game_stats (wallet_address, game_id, total_score, games_played, best_score, last_played)
    VALUES (v_wallet_address, v_game_id, p_score, 1, p_score, NOW())
    ON CONFLICT (wallet_address, game_id) DO UPDATE
    SET total_score = user_game_stats.total_score + p_score,
        games_played = user_game_stats.games_played + 1,
        best_score = GREATEST(user_game_stats.best_score, p_score),
        last_played = NOW();
    
    -- Add to leaderboard
    INSERT INTO leaderboard_entries (wallet_address, game_id, score, period, period_start)
    VALUES 
        (v_wallet_address, v_game_id, p_score, 'daily', CURRENT_DATE),
        (v_wallet_address, v_game_id, p_score, 'weekly', date_trunc('week', CURRENT_DATE)),
        (v_wallet_address, v_game_id, p_score, 'monthly', date_trunc('month', CURRENT_DATE));
    
    -- Get current rank
    SELECT rank INTO v_leaderboard_rank
    FROM daily_leaderboard
    WHERE wallet_address = v_wallet_address 
        AND game_id = v_game_id;
    
    RETURN json_build_object(
        'success', true,
        'score', p_score,
        'daily_rank', v_leaderboard_rank,
        'is_new_best', p_score >= COALESCE(v_best_score, 0)
    );
END;
$$ LANGUAGE plpgsql;

-- Process payment (replaces payment-service endpoint)
CREATE OR REPLACE FUNCTION process_payment(
    p_wallet_address TEXT,
    p_amount DECIMAL,
    p_signature TEXT,
    p_type TEXT DEFAULT 'life_purchase'
) RETURNS JSON AS $$
DECLARE
    v_payment_id UUID;
    v_lives_to_add INTEGER;
BEGIN
    -- Check if signature already exists
    IF EXISTS (SELECT 1 FROM payments WHERE signature = p_signature) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Payment already processed'
        );
    END IF;
    
    -- Insert payment record
    INSERT INTO payments (wallet_address, amount, signature, type, status)
    VALUES (p_wallet_address, p_amount, p_signature, p_type, 'pending')
    RETURNING id INTO v_payment_id;
    
    -- TODO: Add actual payment verification logic here
    -- For now, we'll assume payment is valid
    
    -- Mark as confirmed
    UPDATE payments 
    SET status = 'confirmed',
        confirmed_at = NOW()
    WHERE id = v_payment_id;
    
    -- Process based on payment type
    IF p_type = 'life_purchase' THEN
        -- Calculate lives based on amount (e.g., 0.1 SOL = 10 lives)
        v_lives_to_add := FLOOR(p_amount * 100);
        
        UPDATE user_lives
        SET lives = lives + v_lives_to_add,
            purchased_lives = purchased_lives + v_lives_to_add
        WHERE wallet_address = p_wallet_address;
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'lives_added', v_lives_to_add
    );
END;
$$ LANGUAGE plpgsql;

-- Daily reset function (replaces scheduler service)
CREATE OR REPLACE FUNCTION daily_reset() RETURNS JSON AS $$
DECLARE
    v_users_reset INTEGER;
BEGIN
    -- Reset daily lives for all users
    UPDATE user_lives
    SET lives = LEAST(lives + 5, 10), -- Add 5 lives, max 10
        last_refill = NOW()
    WHERE last_refill < CURRENT_DATE;
    
    GET DIAGNOSTICS v_users_reset = ROW_COUNT;
    
    -- Clean up old sessions
    UPDATE game_sessions
    SET status = 'expired'
    WHERE status = 'active' 
        AND started_at < NOW() - INTERVAL '24 hours';
    
    RETURN json_build_object(
        'success', true,
        'users_reset', v_users_reset,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_lives ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can only see and update their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (wallet_address = current_setting('app.current_user', true));

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (wallet_address = current_setting('app.current_user', true));

CREATE POLICY "Users can view own lives" ON user_lives
    FOR SELECT USING (wallet_address = current_setting('app.current_user', true));

CREATE POLICY "Users can view own sessions" ON game_sessions
    FOR SELECT USING (wallet_address = current_setting('app.current_user', true));

-- Leaderboards are public
CREATE POLICY "Leaderboards are public" ON leaderboard_entries
    FOR SELECT USING (true);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_sessions_wallet ON game_sessions(wallet_address);
CREATE INDEX idx_sessions_status ON game_sessions(status);
CREATE INDEX idx_leaderboard_period ON leaderboard_entries(period, period_start);
CREATE INDEX idx_leaderboard_score ON leaderboard_entries(score DESC);
CREATE INDEX idx_payments_wallet ON payments(wallet_address);
CREATE INDEX idx_payments_signature ON payments(signature);

-- =====================================================
-- REALTIME SUBSCRIPTIONS
-- =====================================================

-- Enable realtime for leaderboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE leaderboard_entries;

-- Enable realtime for user lives updates
ALTER PUBLICATION supabase_realtime ADD TABLE user_lives; 