-- Admin Dashboard Database Schema
-- Tables for service configuration and management

-- Service configurations table
CREATE TABLE IF NOT EXISTS service_configs (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100) UNIQUE NOT NULL,
    config_data JSONB NOT NULL,
    description TEXT,
    version INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service actions log (restarts, reloads, etc.)
CREATE TABLE IF NOT EXISTS service_actions (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL, -- restart, reload, pause, etc.
    status VARCHAR(20) NOT NULL, -- success, failed, in_progress
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game configurations table
CREATE TABLE IF NOT EXISTS game_configs (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    game_type VARCHAR(50) NOT NULL, -- tetris, memory, puzzle, etc.
    lives_config JSONB NOT NULL,
    scoring_rules JSONB NOT NULL,
    payment_config JSONB NOT NULL,
    ui_config JSONB,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game actions log (launch, pause, update, etc.)
CREATE TABLE IF NOT EXISTS game_actions (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL, -- launch, pause, update, etc.
    status VARCHAR(20) NOT NULL, -- success, failed, in_progress
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Global platform configuration
CREATE TABLE IF NOT EXISTS platform_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin user sessions and actions
CREATE TABLE IF NOT EXISTS admin_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    admin_address VARCHAR(44) NOT NULL, -- Solana wallet address
    ip_address INET,
    user_agent TEXT,
    actions_count INTEGER DEFAULT 0,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Admin audit log
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id SERIAL PRIMARY KEY,
    admin_address VARCHAR(44) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50), -- service, game, config, etc.
    resource_id VARCHAR(100),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service health monitoring
CREATE TABLE IF NOT EXISTS service_health (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL, -- healthy, unhealthy, degraded
    response_time_ms INTEGER,
    error_message TEXT,
    memory_usage JSONB,
    cpu_usage DECIMAL(5,2),
    disk_usage JSONB,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_configs_name ON service_configs(service_name);
CREATE INDEX IF NOT EXISTS idx_service_actions_service_time ON service_actions(service_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_configs_id ON game_configs(game_id);
CREATE INDEX IF NOT EXISTS idx_game_configs_active ON game_configs(active);
CREATE INDEX IF NOT EXISTS idx_game_actions_game_time ON game_actions(game_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_config_key ON platform_config(config_key);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_id ON admin_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_time ON admin_audit_log(admin_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_health_service_time ON service_health(service_name, checked_at DESC);

-- Insert default platform configuration
INSERT INTO platform_config (config_key, config_value, description) VALUES
    ('maintenance_mode', '{"enabled": false, "message": "", "start_time": null}', 'Global maintenance mode settings'),
    ('rate_limits', '{"api_calls_per_minute": 1000, "game_sessions_per_hour": 50}', 'Global rate limiting configuration'),
    ('feature_flags', '{"new_player_bonus": true, "social_features": true, "payment_processing": true}', 'Feature toggle flags'),
    ('blockchain', '{"network": "devnet", "confirmation_blocks": 1, "max_retry_attempts": 3}', 'Blockchain configuration'),
    ('notifications', '{"slack_webhook": "", "discord_webhook": "", "email_alerts": false}', 'Alert and notification settings')
ON CONFLICT (config_key) DO NOTHING;

-- Insert default service configurations
INSERT INTO service_configs (service_name, config_data, description) VALUES
    ('api-gateway', '{"rate_limit": 1000, "timeout": 30000, "cors_origins": ["*"], "jwt_secret": "dev-secret"}', 'API Gateway configuration'),
    ('user-service', '{"session_timeout": 86400, "max_sessions_per_user": 5, "require_email_verification": false}', 'User service configuration'),
    ('game-engine', '{"max_concurrent_games": 1000, "validation_timeout": 10000, "score_validation": true}', 'Game engine configuration'),
    ('rewards-service', '{"daily_claim_reset_hour": 0, "bonus_calculation_interval": 3600, "max_bonus_per_day": 10}', 'Rewards service configuration'),
    ('payment-service', '{"confirmation_blocks": 1, "temp_address_expiry": 1800, "webhook_timeout": 30000}', 'Payment service configuration'),
    ('analytics-service', '{"batch_size": 1000, "flush_interval": 60000, "retention_days": 90}', 'Analytics service configuration'),
    ('social-hub', '{"max_message_length": 500, "rate_limit_per_user": 60, "moderation_enabled": true}', 'Social hub configuration')
ON CONFLICT (service_name) DO NOTHING;

-- Insert default game configurations
INSERT INTO game_configs (
    game_id, name, description, game_type, lives_config, scoring_rules, payment_config, ui_config
) VALUES
    (
        'tetris-classic',
        'Classic Tetris',
        'Traditional Tetris gameplay with modern GameFi features',
        'tetris',
        '{"free_lives_per_day": 5, "paid_life_cap": 10, "bonus_divisor": 1000, "bonus_cap": 5}',
        '{"validation_required": true, "max_moves": 10000, "score_per_move": 10}',
        '{"enabled": true, "prices_usd": {"cheap": 0.03, "mid": 0.09, "high": 0.27}, "lives_per_tier": {"cheap": 1, "mid": 3, "high": 10}}',
        '{"theme": "classic", "show_leaderboard": true, "show_achievements": true, "sound_effects": true}'
    ),
    (
        'memory-game',
        'Memory Card Game',
        'Match pairs of cards to earn rewards',
        'memory',
        '{"free_lives_per_day": 3, "paid_life_cap": 8, "bonus_divisor": 500, "bonus_cap": 3}',
        '{"validation_required": true, "max_moves": 100, "score_per_match": 50}',
        '{"enabled": true, "prices_usd": {"cheap": 0.02, "mid": 0.06, "high": 0.18}, "lives_per_tier": {"cheap": 1, "mid": 2, "high": 5}}',
        '{"theme": "modern", "show_leaderboard": true, "show_achievements": true, "animations": true}'
    )
ON CONFLICT (game_id) DO NOTHING; 