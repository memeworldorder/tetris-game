-- GameFi Platform Database Seed Data
-- Populates initial data for development and testing

-- Insert some test users for development
INSERT INTO users (wallet_address, username, display_name, bio, verified) VALUES
('2RdA2Dh39dBjdt5uS8kCr93vEgDyuWro8XKnqiKAr1Ts', 'gamefi_dev', 'GameFi Developer', 'Development account for testing GameFi platform', true),
('8FpqiZsqVRxJ3bY2KvN9G1mH4dT5uC3wP7eA6fL2qX8K', 'player_one', 'Player One', 'First test player account', false),
('4NmR8tQ7vS3kL6uF9pD2eH5jC1wA8xY9mK3gT6bN7vZ2', 'tetris_master', 'Tetris Master', 'Expert Tetris player', false),
('9HpL4dW8nQ2vF6uC3eA7tR5mK9sG1xY6bN8jP2qL4wE3', 'crypto_gamer', 'Crypto Gamer', 'Blockchain gaming enthusiast', false);

-- Insert some test game sessions
INSERT INTO game_sessions (user_id, game_type, status, score, start_time, end_time) VALUES
((SELECT id FROM users WHERE username = 'gamefi_dev'), 'tetris', 'completed', 15000, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 45 minutes'),
((SELECT id FROM users WHERE username = 'player_one'), 'tetris', 'completed', 8500, NOW() - INTERVAL '1 hour 30 minutes', NOW() - INTERVAL '1 hour 15 minutes'),
((SELECT id FROM users WHERE username = 'tetris_master'), 'tetris', 'completed', 25000, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours 30 minutes'),
((SELECT id FROM users WHERE username = 'crypto_gamer'), 'tetris', 'active', 5000, NOW() - INTERVAL '15 minutes', NULL);

-- Insert leaderboard data
INSERT INTO leaderboards (user_id, game_type, period, score, rank, period_start) VALUES
((SELECT id FROM users WHERE username = 'tetris_master'), 'tetris', 'daily', 25000, 1, CURRENT_DATE),
((SELECT id FROM users WHERE username = 'gamefi_dev'), 'tetris', 'daily', 15000, 2, CURRENT_DATE),
((SELECT id FROM users WHERE username = 'player_one'), 'tetris', 'daily', 8500, 3, CURRENT_DATE),
((SELECT id FROM users WHERE username = 'crypto_gamer'), 'tetris', 'daily', 5000, 4, CURRENT_DATE);

-- Insert some analytics events
INSERT INTO analytics_events (event_type, user_id, event_data, ip_address, user_agent) VALUES
('user_login', (SELECT id FROM users WHERE username = 'gamefi_dev'), '{"method": "wallet", "success": true}', '127.0.0.1', 'Mozilla/5.0 (Test Browser)'),
('game_started', (SELECT id FROM users WHERE username = 'gamefi_dev'), '{"game_type": "tetris", "level": 1}', '127.0.0.1', 'Mozilla/5.0 (Test Browser)'),
('game_completed', (SELECT id FROM users WHERE username = 'gamefi_dev'), '{"game_type": "tetris", "score": 15000, "duration": 900}', '127.0.0.1', 'Mozilla/5.0 (Test Browser)'),
('user_login', (SELECT id FROM users WHERE username = 'tetris_master'), '{"method": "wallet", "success": true}', '192.168.1.100', 'Mozilla/5.0 (Desktop)'),
('game_started', (SELECT id FROM users WHERE username = 'tetris_master'), '{"game_type": "tetris", "level": 1}', '192.168.1.100', 'Mozilla/5.0 (Desktop)'),
('game_completed', (SELECT id FROM users WHERE username = 'tetris_master'), '{"game_type": "tetris", "score": 25000, "duration": 1800}', '192.168.1.100', 'Mozilla/5.0 (Desktop)');

-- Create some additional tables for extended functionality
CREATE TABLE IF NOT EXISTS user_lives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    total_lives INTEGER DEFAULT 3,
    used_lives INTEGER DEFAULT 0,
    last_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(100) NOT NULL,
    achievement_data JSONB DEFAULT '{}',
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_type VARCHAR(50) NOT NULL, -- 'twitter', 'telegram', 'discord'
    content TEXT NOT NULL,
    platforms JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'scheduled', 'posted', 'failed'
    post_data JSONB DEFAULT '{}',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    posted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial lives for test users
INSERT INTO user_lives (user_id, total_lives, used_lives) VALUES
((SELECT id FROM users WHERE username = 'gamefi_dev'), 5, 1),
((SELECT id FROM users WHERE username = 'player_one'), 3, 2),
((SELECT id FROM users WHERE username = 'tetris_master'), 10, 0),
((SELECT id FROM users WHERE username = 'crypto_gamer'), 3, 1);

-- Insert some achievements
INSERT INTO user_achievements (user_id, achievement_type, achievement_data) VALUES
((SELECT id FROM users WHERE username = 'tetris_master'), 'high_score', '{"score": 25000, "game": "tetris"}'),
((SELECT id FROM users WHERE username = 'tetris_master'), 'daily_champion', '{"date": "' || CURRENT_DATE || '", "game": "tetris"}'),
((SELECT id FROM users WHERE username = 'gamefi_dev'), 'first_game', '{"game": "tetris", "score": 15000}'),
((SELECT id FROM users WHERE username = 'player_one'), 'welcome', '{"joined_date": "' || CURRENT_DATE || '"}');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_lives_user_id ON user_lives(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON user_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled_at ON social_posts(scheduled_at);

-- Insert a welcome message
INSERT INTO social_posts (post_type, content, platforms, status) VALUES
('system', 'Welcome to GameFi Platform! Database initialized successfully.', '{"twitter": true, "telegram": true}', 'draft');

-- Update user stats
UPDATE users SET last_active = NOW() WHERE username IN ('gamefi_dev', 'tetris_master', 'player_one', 'crypto_gamer');

-- Log the database initialization
INSERT INTO analytics_events (event_type, event_data, ip_address) VALUES
('database_initialized', '{"timestamp": "' || NOW() || '", "version": "1.0.0", "users_created": 4}', '127.0.0.1');

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎮 ================================';
    RAISE NOTICE '🎮 GameFi Database Seed Complete!';
    RAISE NOTICE '🎮 ================================';
    RAISE NOTICE '🎮 Users created: 4';
    RAISE NOTICE '🎮 Game sessions: 4';
    RAISE NOTICE '🎮 Leaderboard entries: 4';
    RAISE NOTICE '🎮 Analytics events: 7';
    RAISE NOTICE '🎮 ================================';
    RAISE NOTICE '🎮 Ready for microservices!';
    RAISE NOTICE '🎮 ================================';
    RAISE NOTICE '';
END $$; 