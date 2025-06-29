-- Migration Script: Multi-Game Support and Admin Dashboard
-- Run this after the existing create-tables.sql

-- ============================================================================
-- GAME CONFIGURATION TABLES
-- ============================================================================

-- Game configurations for multi-game support
CREATE TABLE IF NOT EXISTS game_configs (
    game_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    lives_config JSONB DEFAULT '{
        "max_lives": 5,
        "free_lives_per_day": 1,
        "bonus_divisor": 50000,
        "bonus_cap": 40,
        "paid_life_cap": 10,
        "regeneration_hours": 8
    }',
    scoring_rules JSONB DEFAULT '{
        "validation_required": true,
        "server_side_simulation": true,
        "anti_cheat_enabled": true
    }',
    leaderboard_config JSONB DEFAULT '{
        "daily_enabled": true,
        "weekly_enabled": false,
        "monthly_enabled": false,
        "qualification_percent": 25,
        "ticket_tiers": {
            "rank1": 25,
            "ranks2to5": 15,
            "ranks6to10": 10,
            "remaining": 1
        }
    }',
    raffle_config JSONB DEFAULT '{
        "enabled": true,
        "daily_winners": 10,
        "max_tickets_per_wallet": 25
    }',
    payment_config JSONB DEFAULT '{
        "enabled": true,
        "prices_usd": {
            "cheap": 0.03,
            "mid": 0.09,
            "high": 0.27
        },
        "lives_per_tier": {
            "cheap": 1,
            "mid": 3,
            "high": 10
        }
    }',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default Tetris game configuration
INSERT INTO game_configs (game_id, name, description) 
VALUES ('tetris', 'Tetris Game', 'Classic Tetris with P2E mechanics')
ON CONFLICT (game_id) DO NOTHING;

-- ============================================================================
-- ENHANCED USER AND GAME TABLES
-- ============================================================================

-- Add game_id to existing tables (with default for backward compatibility)
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS game_id VARCHAR(50) DEFAULT 'tetris',
ADD COLUMN IF NOT EXISTS game_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS validation_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS seed_hash VARCHAR(64);

-- Add foreign key constraint
ALTER TABLE game_sessions 
ADD CONSTRAINT fk_sessions_game 
FOREIGN KEY (game_id) REFERENCES game_configs(game_id)
ON DELETE CASCADE;

-- Enhanced plays table for anti-cheat and leaderboards
CREATE TABLE IF NOT EXISTS plays (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(50) NOT NULL,
    wallet_address VARCHAR(44) NOT NULL,
    score INTEGER NOT NULL,
    game_data JSONB DEFAULT '{}',
    moves_hash VARCHAR(64),
    seed_hash VARCHAR(64) NOT NULL,
    merkle_proof TEXT[],
    validated BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES game_configs(game_id) ON DELETE CASCADE,
    FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE
);

-- Enhanced leaderboards table
CREATE TABLE IF NOT EXISTS leaderboards (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(50) NOT NULL,
    period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    wallet_address VARCHAR(44) NOT NULL,
    score INTEGER NOT NULL,
    rank INTEGER NOT NULL,
    tickets_earned INTEGER DEFAULT 0,
    merkle_proof TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES game_configs(game_id) ON DELETE CASCADE,
    FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE,
    UNIQUE(game_id, period_type, period_start, wallet_address)
);

-- ============================================================================
-- ADMIN DASHBOARD TABLES
-- ============================================================================

-- Admin users with role-based access
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'analytics_viewer', -- 'super_admin', 'game_admin', 'analytics_viewer'
    permissions JSONB DEFAULT '[]',
    active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics events for detailed tracking
CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(50),
    wallet_address VARCHAR(44),
    event_type VARCHAR(50) NOT NULL, -- 'game_start', 'game_end', 'payment', 'life_purchase', etc.
    event_data JSONB DEFAULT '{}',
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES game_configs(game_id) ON DELETE SET NULL
);

-- Aggregated daily analytics for fast queries
CREATE TABLE IF NOT EXISTS analytics_daily (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    game_id VARCHAR(50),
    total_users INTEGER DEFAULT 0,
    total_games_played INTEGER DEFAULT 0,
    total_revenue_usd DECIMAL(12, 4) DEFAULT 0,
    avg_session_duration_seconds INTEGER DEFAULT 0,
    top_score INTEGER DEFAULT 0,
    lives_purchased INTEGER DEFAULT 0,
    raffle_tickets_distributed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES game_configs(game_id) ON DELETE CASCADE,
    UNIQUE(date, game_id)
);

-- System alerts and monitoring
CREATE TABLE IF NOT EXISTS system_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL, -- 'error', 'warning', 'info'
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT false,
    resolved_by INTEGER,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resolved_by) REFERENCES admin_users(id) ON DELETE SET NULL
);

-- ============================================================================
-- ENHANCED RAFFLE TABLES
-- ============================================================================

-- Qualified wallets per period
CREATE TABLE IF NOT EXISTS qualified_wallets (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    wallet_address VARCHAR(44) NOT NULL,
    rank INTEGER NOT NULL,
    score INTEGER NOT NULL,
    tickets INTEGER NOT NULL,
    merkle_proof TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES game_configs(game_id) ON DELETE CASCADE,
    FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE,
    UNIQUE(game_id, date, wallet_address)
);

-- Raffle results
CREATE TABLE IF NOT EXISTS raffle_results (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(50),
    date DATE NOT NULL,
    winners TEXT[] NOT NULL,
    vrf_seed VARCHAR(128) NOT NULL,
    vrf_signature VARCHAR(256),
    merkle_root VARCHAR(64) NOT NULL,
    total_tickets INTEGER NOT NULL,
    total_participants INTEGER NOT NULL,
    verified BOOLEAN DEFAULT false,
    announced BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES game_configs(game_id) ON DELETE CASCADE
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Game and analytics indexes
CREATE INDEX IF NOT EXISTS idx_plays_game_wallet ON plays(game_id, wallet_address);
CREATE INDEX IF NOT EXISTS idx_plays_score ON plays(game_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_plays_created_at ON plays(created_at);

CREATE INDEX IF NOT EXISTS idx_leaderboards_game_period ON leaderboards(game_id, period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_leaderboards_rank ON leaderboards(game_id, period_type, rank);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_game ON analytics_events(game_id);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON analytics_daily(date);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_game ON analytics_daily(game_id);

CREATE INDEX IF NOT EXISTS idx_qualified_wallets_date ON qualified_wallets(game_id, date);
CREATE INDEX IF NOT EXISTS idx_raffle_results_date ON raffle_results(game_id, date);

CREATE INDEX IF NOT EXISTS idx_system_alerts_created ON system_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved ON system_alerts(resolved);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers
CREATE TRIGGER update_game_configs_updated_at 
    BEFORE UPDATE ON game_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at 
    BEFORE UPDATE ON admin_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL ADMIN USER (Change password after first login!)
-- ============================================================================

-- Create default admin user (password: 'admin123' - CHANGE THIS!)
INSERT INTO admin_users (username, email, password_hash, role, permissions)
VALUES (
    'admin',
    'admin@gamefi.local',
    '$2b$10$rOzJsGOWK7VQW2Y6S7iOBOtKjTqbP8tZqB7BKQX9NXjb7nrCvN6Km', -- admin123
    'super_admin',
    '["all"]'::jsonb
) ON CONFLICT (username) DO NOTHING;

COMMIT; 