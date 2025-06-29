-- ClickHouse Analytics Database Initialization
-- For high-performance analytics and event tracking

-- Create analytics database
CREATE DATABASE IF NOT EXISTS analytics;
USE analytics;

-- Analytics events table for high-volume event tracking
CREATE TABLE IF NOT EXISTS analytics.events (
    id UUID DEFAULT generateUUIDv4(),
    event_type LowCardinality(String),
    user_id Nullable(String),
    session_id Nullable(String),
    game_type LowCardinality(String),
    event_data String,
    ip_address IPv4,
    user_agent String,
    country LowCardinality(String) DEFAULT '',
    city LowCardinality(String) DEFAULT '',
    device_type LowCardinality(String) DEFAULT '',
    browser LowCardinality(String) DEFAULT '',
    timestamp DateTime DEFAULT now(),
    date Date DEFAULT toDate(timestamp)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, event_type, timestamp)
TTL date + INTERVAL 1 YEAR;

-- Game sessions analytics table
CREATE TABLE IF NOT EXISTS analytics.game_sessions (
    session_id String,
    user_id String,
    game_type LowCardinality(String),
    start_time DateTime,
    end_time Nullable(DateTime),
    duration_seconds UInt32,
    score UInt32,
    level_reached UInt16,
    moves_count UInt32,
    pieces_placed UInt32,
    lines_cleared UInt32,
    status LowCardinality(String),
    timestamp DateTime DEFAULT now(),
    date Date DEFAULT toDate(timestamp)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, game_type, start_time)
TTL date + INTERVAL 2 YEARS;

-- User behavior analytics
CREATE TABLE IF NOT EXISTS analytics.user_behavior (
    user_id String,
    action_type LowCardinality(String),
    page_path String,
    referrer String,
    session_duration UInt32,
    actions_count UInt16,
    timestamp DateTime DEFAULT now(),
    date Date DEFAULT toDate(timestamp)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, user_id, timestamp)
TTL date + INTERVAL 1 YEAR;

-- Payment analytics
CREATE TABLE IF NOT EXISTS analytics.payments (
    payment_id String,
    user_id String,
    transaction_hash String,
    amount_sol Decimal(18, 9),
    amount_usd Decimal(10, 2),
    payment_type LowCardinality(String),
    status LowCardinality(String),
    blockchain_confirmed Bool DEFAULT false,
    timestamp DateTime DEFAULT now(),
    date Date DEFAULT toDate(timestamp)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, status, timestamp)
TTL date + INTERVAL 5 YEARS;

-- Social media analytics
CREATE TABLE IF NOT EXISTS analytics.social_engagement (
    post_id String,
    platform LowCardinality(String),
    post_type LowCardinality(String),
    content_summary String,
    impressions UInt32,
    likes UInt32,
    shares UInt32,
    comments UInt32,
    click_through_rate Float32,
    timestamp DateTime DEFAULT now(),
    date Date DEFAULT toDate(timestamp)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, platform, timestamp)
TTL date + INTERVAL 1 YEAR;

-- Real-time dashboard materialized views
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.daily_stats AS
SELECT
    date,
    game_type,
    count() as sessions_count,
    countIf(status = 'completed') as completed_sessions,
    avg(score) as avg_score,
    max(score) as max_score,
    sum(duration_seconds) as total_play_time,
    uniq(user_id) as unique_players
FROM analytics.game_sessions
GROUP BY date, game_type;

-- Hourly user activity view
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.hourly_activity AS
SELECT
    toStartOfHour(timestamp) as hour,
    event_type,
    count() as event_count,
    uniq(user_id) as unique_users,
    uniq(session_id) as unique_sessions
FROM analytics.events
GROUP BY hour, event_type;

-- Top performers view
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.top_performers AS
SELECT
    user_id,
    game_type,
    max(score) as best_score,
    count() as total_games,
    avg(score) as avg_score,
    sum(duration_seconds) as total_time_played,
    date
FROM analytics.game_sessions
WHERE status = 'completed'
GROUP BY user_id, game_type, date;

-- Insert some sample analytics data
INSERT INTO analytics.events (event_type, user_id, game_type, event_data, ip_address, user_agent, country, city, device_type, browser) VALUES
('user_login', '2RdA2Dh39dBjdt5uS8kCr93vEgDyuWro8XKnqiKAr1Ts', '', '{"method": "wallet"}', '127.0.0.1', 'Mozilla/5.0', 'US', 'San Francisco', 'desktop', 'chrome'),
('game_started', '2RdA2Dh39dBjdt5uS8kCr93vEgDyuWro8XKnqiKAr1Ts', 'tetris', '{"level": 1}', '127.0.0.1', 'Mozilla/5.0', 'US', 'San Francisco', 'desktop', 'chrome'),
('game_completed', '2RdA2Dh39dBjdt5uS8kCr93vEgDyuWro8XKnqiKAr1Ts', 'tetris', '{"score": 15000}', '127.0.0.1', 'Mozilla/5.0', 'US', 'San Francisco', 'desktop', 'chrome'),
('user_login', '4NmR8tQ7vS3kL6uF9pD2eH5jC1wA8xY9mK3gT6bN7vZ2', '', '{"method": "wallet"}', '192.168.1.100', 'Mozilla/5.0', 'US', 'New York', 'desktop', 'firefox'),
('game_started', '4NmR8tQ7vS3kL6uF9pD2eH5jC1wA8xY9mK3gT6bN7vZ2', 'tetris', '{"level": 1}', '192.168.1.100', 'Mozilla/5.0', 'US', 'New York', 'desktop', 'firefox'),
('game_completed', '4NmR8tQ7vS3kL6uF9pD2eH5jC1wA8xY9mK3gT6bN7vZ2', 'tetris', '{"score": 25000}', '192.168.1.100', 'Mozilla/5.0', 'US', 'New York', 'desktop', 'firefox');

INSERT INTO analytics.game_sessions (session_id, user_id, game_type, start_time, end_time, duration_seconds, score, level_reached, moves_count, pieces_placed, lines_cleared, status) VALUES
('sess_001', '2RdA2Dh39dBjdt5uS8kCr93vEgDyuWro8XKnqiKAr1Ts', 'tetris', now() - INTERVAL 2 HOUR, now() - INTERVAL 1 HOUR, 3600, 15000, 8, 450, 180, 25, 'completed'),
('sess_002', '4NmR8tQ7vS3kL6uF9pD2eH5jC1wA8xY9mK3gT6bN7vZ2', 'tetris', now() - INTERVAL 3 HOUR, now() - INTERVAL 1 HOUR, 7200, 25000, 12, 680, 280, 45, 'completed'),
('sess_003', '8FpqiZsqVRxJ3bY2KvN9G1mH4dT5uC3wP7eA6fL2qX8K', 'tetris', now() - INTERVAL 1 HOUR, now() - INTERVAL 30 MINUTE, 1800, 8500, 5, 250, 95, 15, 'completed'),
('sess_004', '9HpL4dW8nQ2vF6uC3eA7tR5mK9sG1xY6bN8jP2qL4wE3', 'tetris', now() - INTERVAL 15 MINUTE, NULL, 0, 5000, 3, 120, 48, 8, 'active');

-- Create useful analytics functions
CREATE OR REPLACE FUNCTION analytics.calculate_kpis()
RETURNS String AS $$
SELECT concat(
    'Daily Active Users: ', toString(uniq(user_id)), '\n',
    'Total Sessions: ', toString(count()), '\n',
    'Avg Session Duration: ', toString(round(avg(duration_seconds)/60, 2)), ' minutes\n',
    'Total Revenue Events: ', toString(countIf(event_type = 'payment_completed'))
)
FROM analytics.events
WHERE date = today()
$$;

-- Success message for ClickHouse
SELECT '🎮 ClickHouse Analytics Database Initialized Successfully! 🎮' as message; 