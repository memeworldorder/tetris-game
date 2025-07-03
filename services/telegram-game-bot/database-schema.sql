-- Telegram Game Bot Database Schema

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players table
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_user_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    display_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_games_played INTEGER DEFAULT 0,
    total_games_won INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_banned BOOLEAN DEFAULT false,
    ban_reason TEXT,
    banned_until TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'created',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by VARCHAR(255) NOT NULL,
    chat_id VARCHAR(255) NOT NULL,
    message_id BIGINT,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    winner_id UUID REFERENCES players(id),
    total_players INTEGER DEFAULT 0,
    max_players INTEGER DEFAULT 100,
    min_players INTEGER DEFAULT 2,
    time_limit INTEGER DEFAULT 300,
    join_deadline TIMESTAMP,
    selection_deadline TIMESTAMP
);

-- Game participants table
CREATE TABLE IF NOT EXISTS game_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    selected_number INTEGER,
    selection_time TIMESTAMP,
    is_winner BOOLEAN DEFAULT false,
    prize_amount DECIMAL(10,2),
    prize_type VARCHAR(50),
    UNIQUE(game_id, player_id)
);

-- Number selections table
CREATE TABLE IF NOT EXISTS number_selections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    selected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_available BOOLEAN DEFAULT true,
    UNIQUE(game_id, player_id),
    INDEX idx_game_number (game_id, number)
);

-- Game history/events table
CREATE TABLE IF NOT EXISTS game_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    actor_id VARCHAR(255),
    data JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    message TEXT
);

-- Webhook events table
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    game_id UUID REFERENCES games(id) ON DELETE SET NULL,
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    data JSONB NOT NULL DEFAULT '{}',
    webhook_url TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    last_attempt TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_players_telegram_id ON players(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_players_active ON players(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_players_banned ON players(is_banned) WHERE is_banned = true;

CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_type ON games(type);
CREATE INDEX IF NOT EXISTS idx_games_chat_id ON games(chat_id);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);
CREATE INDEX IF NOT EXISTS idx_games_active ON games(status, created_at) WHERE status IN ('created', 'waiting_for_players', 'players_joining', 'number_selection', 'drawing');

CREATE INDEX IF NOT EXISTS idx_game_participants_game_id ON game_participants(game_id);
CREATE INDEX IF NOT EXISTS idx_game_participants_player_id ON game_participants(player_id);
CREATE INDEX IF NOT EXISTS idx_game_participants_winner ON game_participants(is_winner) WHERE is_winner = true;

CREATE INDEX IF NOT EXISTS idx_number_selections_game_id ON number_selections(game_id);
CREATE INDEX IF NOT EXISTS idx_number_selections_player_id ON number_selections(player_id);

CREATE INDEX IF NOT EXISTS idx_game_history_game_id ON game_history(game_id);
CREATE INDEX IF NOT EXISTS idx_game_history_timestamp ON game_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_game_history_action ON game_history(action);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_game_id ON webhook_events(game_id);

-- Functions and triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_players_updated_at 
    BEFORE UPDATE ON players 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at 
    BEFORE UPDATE ON games 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update player stats
CREATE OR REPLACE FUNCTION update_player_stats_on_game_end()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total games won for winners
    IF NEW.is_winner = true AND (OLD.is_winner IS NULL OR OLD.is_winner = false) THEN
        UPDATE players 
        SET total_games_won = total_games_won + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.player_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_player_stats_on_win
    AFTER UPDATE ON game_participants
    FOR EACH ROW 
    WHEN (NEW.is_winner = true)
    EXECUTE FUNCTION update_player_stats_on_game_end();

-- Function to update player activity timestamp
CREATE OR REPLACE FUNCTION update_player_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE players 
    SET last_activity = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.player_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_player_activity_on_participation
    AFTER INSERT ON game_participants
    FOR EACH ROW EXECUTE FUNCTION update_player_activity();

CREATE TRIGGER update_player_activity_on_selection
    AFTER INSERT ON number_selections
    FOR EACH ROW EXECUTE FUNCTION update_player_activity();

-- Views for common queries
CREATE OR REPLACE VIEW active_games AS
SELECT g.*, 
       COUNT(gp.id) as current_participants
FROM games g
LEFT JOIN game_participants gp ON g.id = gp.game_id
WHERE g.status IN ('created', 'waiting_for_players', 'players_joining', 'number_selection', 'drawing')
GROUP BY g.id
ORDER BY g.created_at DESC;

CREATE OR REPLACE VIEW game_stats AS
SELECT 
    COUNT(*) as total_games,
    COUNT(*) FILTER (WHERE status IN ('created', 'waiting_for_players', 'players_joining', 'number_selection', 'drawing')) as active_games,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_games,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_games,
    COUNT(*) FILTER (WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as games_last_24h,
    COUNT(*) FILTER (WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days') as games_last_week
FROM games;

CREATE OR REPLACE VIEW player_stats AS
SELECT 
    COUNT(*) as total_players,
    COUNT(*) FILTER (WHERE is_active = true) as active_players,
    COUNT(*) FILTER (WHERE is_banned = true) as banned_players,
    COUNT(*) FILTER (WHERE last_activity > CURRENT_TIMESTAMP - INTERVAL '24 hours') as active_last_24h,
    COUNT(*) FILTER (WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days') as new_players_last_week
FROM players;

-- Sample data for testing (optional)
-- INSERT INTO players (telegram_user_id, username, display_name) VALUES 
-- (12345, 'testuser1', 'Test User 1'),
-- (67890, 'testuser2', 'Test User 2');

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO gamefi_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO gamefi_user;
-- GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO gamefi_user;