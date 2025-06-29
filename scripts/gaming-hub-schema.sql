-- Gaming Hub Service Database Schema
-- Tables for game selection, lobby, matchmaking, and user dashboard

-- Game catalog table
CREATE TABLE IF NOT EXISTS game_catalog (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- 'puzzle', 'action', 'strategy', etc.
    thumbnail_url TEXT,
    banner_url TEXT,
    trailer_url TEXT,
    min_players INTEGER DEFAULT 1,
    max_players INTEGER DEFAULT 1,
    avg_duration_minutes INTEGER,
    difficulty_level VARCHAR(20) DEFAULT 'easy', -- 'easy', 'medium', 'hard', 'expert'
    tags JSONB DEFAULT '[]',
    supported_platforms JSONB DEFAULT '["web"]',
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'maintenance', 'deprecated'
    featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game lobbies table
CREATE TABLE IF NOT EXISTS game_lobbies (
    id SERIAL PRIMARY KEY,
    lobby_id VARCHAR(100) UNIQUE NOT NULL,
    game_id VARCHAR(100) NOT NULL,
    host_wallet VARCHAR(44) NOT NULL,
    lobby_name VARCHAR(200),
    max_players INTEGER DEFAULT 4,
    current_players INTEGER DEFAULT 1,
    is_private BOOLEAN DEFAULT false,
    password_hash VARCHAR(255),
    game_mode VARCHAR(50) DEFAULT 'standard',
    difficulty VARCHAR(20) DEFAULT 'medium',
    entry_fee_sol DECIMAL(10, 6) DEFAULT 0,
    prize_pool_sol DECIMAL(10, 6) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'starting', 'active', 'finished'
    lobby_config JSONB DEFAULT '{}',
    scheduled_start TIMESTAMP WITH TIME ZONE,
    actual_start TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lobby participants table
CREATE TABLE IF NOT EXISTS lobby_participants (
    id SERIAL PRIMARY KEY,
    lobby_id VARCHAR(100) NOT NULL,
    wallet_address VARCHAR(44) NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'joined', -- 'joined', 'ready', 'playing', 'finished', 'left'
    final_score INTEGER,
    final_rank INTEGER,
    earnings_sol DECIMAL(10, 6) DEFAULT 0,
    UNIQUE(lobby_id, wallet_address)
);

-- Matchmaking queue table
CREATE TABLE IF NOT EXISTS matchmaking_queue (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(44) NOT NULL,
    game_id VARCHAR(100) NOT NULL,
    preferred_game_mode VARCHAR(50),
    skill_level INTEGER DEFAULT 1000, -- ELO-style rating
    max_wait_time_seconds INTEGER DEFAULT 300,
    entry_fee_sol DECIMAL(10, 6) DEFAULT 0,
    queue_preferences JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'matched', 'cancelled', 'expired'
    matched_lobby_id VARCHAR(100),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    matched_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '10 minutes'
);

-- User game statistics table
CREATE TABLE IF NOT EXISTS user_game_stats (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(44) NOT NULL,
    game_id VARCHAR(100) NOT NULL,
    total_games_played INTEGER DEFAULT 0,
    total_games_won INTEGER DEFAULT 0,
    total_games_lost INTEGER DEFAULT 0,
    best_score INTEGER DEFAULT 0,
    total_score BIGINT DEFAULT 0,
    average_score INTEGER DEFAULT 0,
    total_playtime_seconds BIGINT DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    skill_rating INTEGER DEFAULT 1000,
    rank_tier VARCHAR(20) DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum', 'diamond'
    total_earnings_sol DECIMAL(18, 9) DEFAULT 0,
    total_spent_sol DECIMAL(18, 9) DEFAULT 0,
    achievements JSONB DEFAULT '[]',
    last_played TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(wallet_address, game_id)
);

-- Daily challenges table
CREATE TABLE IF NOT EXISTS daily_challenges (
    id SERIAL PRIMARY KEY,
    challenge_id VARCHAR(100) UNIQUE NOT NULL,
    game_id VARCHAR(100) NOT NULL,
    challenge_name VARCHAR(200) NOT NULL,
    description TEXT,
    challenge_type VARCHAR(50) NOT NULL, -- 'score', 'time', 'special'
    target_value INTEGER NOT NULL,
    reward_type VARCHAR(50) NOT NULL, -- 'lives', 'sol', 'nft', 'points'
    reward_amount DECIMAL(10, 6),
    difficulty VARCHAR(20) DEFAULT 'medium',
    active_date DATE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    challenge_config JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily challenge progress table
CREATE TABLE IF NOT EXISTS daily_challenge_progress (
    id SERIAL PRIMARY KEY,
    challenge_id VARCHAR(100) NOT NULL,
    wallet_address VARCHAR(44) NOT NULL,
    current_progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    reward_claimed BOOLEAN DEFAULT false,
    reward_claimed_at TIMESTAMP WITH TIME ZONE,
    best_attempt INTEGER,
    attempts_count INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(challenge_id, wallet_address)
);

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
    id SERIAL PRIMARY KEY,
    tournament_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    game_id VARCHAR(100) NOT NULL,
    tournament_type VARCHAR(50) NOT NULL, -- 'elimination', 'round_robin', 'swiss', 'time_trial'
    entry_fee_sol DECIMAL(10, 6) DEFAULT 0,
    prize_pool_sol DECIMAL(18, 9) DEFAULT 0,
    max_participants INTEGER NOT NULL,
    current_participants INTEGER DEFAULT 0,
    registration_start TIMESTAMP WITH TIME ZONE NOT NULL,
    registration_end TIMESTAMP WITH TIME ZONE NOT NULL,
    tournament_start TIMESTAMP WITH TIME ZONE NOT NULL,
    tournament_end TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'upcoming', -- 'upcoming', 'registration', 'active', 'completed', 'cancelled'
    tournament_config JSONB DEFAULT '{}',
    bracket_data JSONB DEFAULT '{}',
    created_by VARCHAR(44),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament participants table
CREATE TABLE IF NOT EXISTS tournament_participants (
    id SERIAL PRIMARY KEY,
    tournament_id VARCHAR(100) NOT NULL,
    wallet_address VARCHAR(44) NOT NULL,
    display_name VARCHAR(100),
    skill_rating INTEGER DEFAULT 1000,
    seed_number INTEGER,
    current_round INTEGER DEFAULT 1,
    elimination_round INTEGER,
    final_rank INTEGER,
    prize_earned_sol DECIMAL(10, 6) DEFAULT 0,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'registered', -- 'registered', 'active', 'eliminated', 'winner'
    UNIQUE(tournament_id, wallet_address)
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(44) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    preferred_language VARCHAR(10) DEFAULT 'en',
    notification_settings JSONB DEFAULT '{"email": true, "browser": true, "game_invites": true}',
    privacy_settings JSONB DEFAULT '{"show_stats": true, "show_earnings": false, "discoverable": true}',
    game_preferences JSONB DEFAULT '{}',
    ui_theme VARCHAR(20) DEFAULT 'dark',
    sound_enabled BOOLEAN DEFAULT true,
    music_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gaming sessions table (extended from shared)
CREATE TABLE IF NOT EXISTS gaming_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    wallet_address VARCHAR(44) NOT NULL,
    game_id VARCHAR(100) NOT NULL,
    lobby_id VARCHAR(100),
    tournament_id VARCHAR(100),
    session_type VARCHAR(20) DEFAULT 'solo', -- 'solo', 'multiplayer', 'tournament', 'challenge'
    difficulty VARCHAR(20),
    game_mode VARCHAR(50),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    final_score INTEGER DEFAULT 0,
    achievements_earned JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active' -- 'active', 'completed', 'abandoned', 'disconnected'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_catalog_status ON game_catalog(status);
CREATE INDEX IF NOT EXISTS idx_game_catalog_featured ON game_catalog(featured, sort_order);
CREATE INDEX IF NOT EXISTS idx_game_catalog_category ON game_catalog(category);

CREATE INDEX IF NOT EXISTS idx_game_lobbies_game_status ON game_lobbies(game_id, status);
CREATE INDEX IF NOT EXISTS idx_game_lobbies_host ON game_lobbies(host_wallet);
CREATE INDEX IF NOT EXISTS idx_game_lobbies_scheduled ON game_lobbies(scheduled_start);

CREATE INDEX IF NOT EXISTS idx_lobby_participants_lobby ON lobby_participants(lobby_id);
CREATE INDEX IF NOT EXISTS idx_lobby_participants_wallet ON lobby_participants(wallet_address);

CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_game_status ON matchmaking_queue(game_id, status);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_expires ON matchmaking_queue(expires_at);

CREATE INDEX IF NOT EXISTS idx_user_game_stats_wallet ON user_game_stats(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_game_stats_game ON user_game_stats(game_id);
CREATE INDEX IF NOT EXISTS idx_user_game_stats_rating ON user_game_stats(skill_rating DESC);

CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON daily_challenges(active_date, status);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_game ON daily_challenges(game_id);

CREATE INDEX IF NOT EXISTS idx_challenge_progress_challenge ON daily_challenge_progress(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_wallet ON daily_challenge_progress(wallet_address);

CREATE INDEX IF NOT EXISTS idx_tournaments_status_start ON tournaments(status, tournament_start);
CREATE INDEX IF NOT EXISTS idx_tournaments_game ON tournaments(game_id);

CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_wallet ON tournament_participants(wallet_address);

CREATE INDEX IF NOT EXISTS idx_user_preferences_wallet ON user_preferences(wallet_address);

CREATE INDEX IF NOT EXISTS idx_gaming_sessions_wallet ON gaming_sessions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_gaming_sessions_game ON gaming_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_gaming_sessions_status ON gaming_sessions(status);

-- Insert default game catalog entries
INSERT INTO game_catalog (game_id, name, description, category, difficulty_level, featured, sort_order) VALUES
    ('tetris-classic', 'Classic Tetris', 'Traditional Tetris gameplay with modern GameFi features', 'puzzle', 'medium', true, 1),
    ('memory-game', 'Memory Card Game', 'Match pairs of cards to earn rewards', 'puzzle', 'easy', true, 2),
    ('asteroid-blaster', 'Asteroid Blaster', 'Classic space shooter with crypto rewards', 'action', 'hard', false, 3)
ON CONFLICT (game_id) DO NOTHING;

-- Insert default daily challenges
INSERT INTO daily_challenges (challenge_id, game_id, challenge_name, description, challenge_type, target_value, reward_type, reward_amount, active_date, expires_at) VALUES
    ('daily_tetris_001', 'tetris-classic', 'Daily High Score', 'Score 50,000+ points in Tetris', 'score', 50000, 'lives', 2, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day'),
    ('daily_memory_001', 'memory-game', 'Perfect Memory', 'Complete memory game without mistakes', 'special', 1, 'sol', 0.01, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day')
ON CONFLICT (challenge_id) DO NOTHING; 