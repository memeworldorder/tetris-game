-- Social Bots Database Schema
-- Tables for Telegram and Twitter bot services

-- Telegram messages log
CREATE TABLE IF NOT EXISTS telegram_messages (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(50) NOT NULL,
    chat_id VARCHAR(50) NOT NULL,
    message_text TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'sent',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Telegram announcements log
CREATE TABLE IF NOT EXISTS telegram_announcements (
    id SERIAL PRIMARY KEY,
    announcement_type VARCHAR(50) NOT NULL,
    message_data JSONB NOT NULL,
    message_id VARCHAR(50),
    chat_id VARCHAR(50),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'sent',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Twitter tweets log
CREATE TABLE IF NOT EXISTS twitter_tweets (
    id SERIAL PRIMARY KEY,
    tweet_id VARCHAR(50) NOT NULL,
    tweet_text TEXT NOT NULL,
    media_ids JSONB,
    posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'posted',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Twitter announcements log
CREATE TABLE IF NOT EXISTS twitter_announcements (
    id SERIAL PRIMARY KEY,
    announcement_type VARCHAR(50) NOT NULL,
    tweet_data JSONB NOT NULL,
    tweet_id VARCHAR(50),
    posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'posted',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled tweets
CREATE TABLE IF NOT EXISTS scheduled_tweets (
    id SERIAL PRIMARY KEY,
    tweet_text TEXT NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    tweet_type VARCHAR(50) DEFAULT 'custom',
    tweet_data JSONB,
    status VARCHAR(20) DEFAULT 'scheduled',
    tweet_id VARCHAR(50),
    posted_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social media templates
CREATE TABLE IF NOT EXISTS social_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) UNIQUE NOT NULL,
    platform VARCHAR(20) NOT NULL, -- 'telegram', 'twitter', 'both'
    template_type VARCHAR(50) NOT NULL, -- 'winner', 'leaderboard', 'raffle', etc.
    template_content TEXT NOT NULL,
    variables JSONB, -- List of required variables
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social media campaigns
CREATE TABLE IF NOT EXISTS social_campaigns (
    id SERIAL PRIMARY KEY,
    campaign_name VARCHAR(200) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    platforms JSONB NOT NULL, -- ['telegram', 'twitter']
    template_config JSONB NOT NULL,
    scheduling_config JSONB,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social media analytics
CREATE TABLE IF NOT EXISTS social_analytics (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    content_id VARCHAR(50),
    event_type VARCHAR(50) NOT NULL, -- 'sent', 'delivered', 'error', 'engagement'
    event_data JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bot configurations
CREATE TABLE IF NOT EXISTS bot_configs (
    id SERIAL PRIMARY KEY,
    bot_type VARCHAR(20) NOT NULL, -- 'telegram', 'twitter'
    config_key VARCHAR(100) NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bot_type, config_key)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_telegram_messages_chat_time ON telegram_messages(chat_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_announcements_type_time ON telegram_announcements(announcement_type, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_twitter_tweets_time ON twitter_tweets(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_twitter_announcements_type_time ON twitter_announcements(announcement_type, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduled_tweets_status_time ON scheduled_tweets(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_social_templates_platform_type ON social_templates(platform, template_type);
CREATE INDEX IF NOT EXISTS idx_social_campaigns_status_dates ON social_campaigns(status, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_social_analytics_platform_time ON social_analytics(platform, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_configs_type_active ON bot_configs(bot_type, active);

-- Insert default templates for Telegram
INSERT INTO social_templates (template_name, platform, template_type, template_content, variables) VALUES
    ('telegram_daily_winner', 'telegram', 'winner', 
     '🎉 <b>Daily Winner Announcement!</b>\n\n🏆 <b>Winner:</b> {walletAddress}\n🎮 <b>Game:</b> {gameName}\n📊 <b>Score:</b> {score:,}\n💰 <b>Prize:</b> {prize} SOL\n\nCongratulations! 🎊\n\n<i>Want to be the next winner? Play now at our GameFi platform!</i>',
     '["walletAddress", "gameName", "score", "prize"]'),
    
    ('telegram_weekly_leaderboard', 'telegram', 'leaderboard',
     '📅 <b>Weekly Leaderboard Update</b>\n\n🥇 <b>1st Place:</b> {first.wallet} - {first.score:,} points\n🥈 <b>2nd Place:</b> {second.wallet} - {second.score:,} points\n🥉 <b>3rd Place:</b> {third.wallet} - {third.score:,} points\n\n🎮 <b>Game:</b> {gameName}\n📊 <b>Total Players:</b> {totalPlayers:,}\n💰 <b>Total Prizes:</b> {totalPrizes} SOL\n\nKeep playing to climb the leaderboard! 🚀',
     '["gameName", "first", "second", "third", "totalPlayers", "totalPrizes"]'),
     
    ('telegram_raffle_winner', 'telegram', 'raffle',
     '🎲 <b>Raffle Winner!</b>\n\n🎉 <b>Winner:</b> {walletAddress}\n🎫 <b>Tickets:</b> {ticketCount}\n💰 <b>Prize:</b> {prize} {prizeType}\n🎯 <b>Winning Ticket:</b> #{winningTicket}\n\n🎊 Congratulations on your win!\n\n<i>Daily raffles happen every 24 hours. Keep playing to earn more tickets!</i>',
     '["walletAddress", "ticketCount", "prize", "prizeType", "winningTicket"]')

ON CONFLICT (template_name) DO NOTHING;

-- Insert default templates for Twitter
INSERT INTO social_templates (template_name, platform, template_type, template_content, variables) VALUES
    ('twitter_daily_winner', 'twitter', 'winner',
     '🎉 DAILY WINNER! 🎉\n\n🏆 {walletAddress}\n🎮 {gameName}\n📊 {score:,} points\n💰 {prize} $SOL\n\nCongratulations! 🎊\n\n#GameFi #P2E #Solana #Gaming',
     '["walletAddress", "gameName", "score", "prize"]'),
     
    ('twitter_weekly_leaderboard', 'twitter', 'leaderboard',
     '📅 WEEKLY LEADERBOARD 📅\n\n🥇 {first.wallet} - {first.score:,}\n🥈 {second.wallet} - {second.score:,}\n🥉 {third.wallet} - {third.score:,}\n\n🎮 {gameName}\n👥 {totalPlayers:,} players\n💰 {totalPrizes} $SOL prizes\n\n#Leaderboard #GameFi #P2E',
     '["gameName", "first", "second", "third", "totalPlayers", "totalPrizes"]'),
     
    ('twitter_raffle_winner', 'twitter', 'raffle',
     '🎲 RAFFLE WINNER! 🎲\n\n🎉 {walletAddress}\n🎫 {ticketCount} tickets\n💰 {prize} {prizeType}\n🎯 Ticket #{winningTicket}\n\nLucky winner! 🍀\n\n#Raffle #GameFi #Solana',
     '["walletAddress", "ticketCount", "prize", "prizeType", "winningTicket"]')

ON CONFLICT (template_name) DO NOTHING;

-- Insert default bot configurations
INSERT INTO bot_configs (bot_type, config_key, config_value, description) VALUES
    ('telegram', 'rate_limit', '{"messages_per_minute": 20, "announcements_per_hour": 10}', 'Rate limiting configuration for Telegram bot'),
    ('telegram', 'message_format', '{"parse_mode": "HTML", "disable_preview": false, "disable_notification": false}', 'Default message formatting options'),
    ('telegram', 'auto_announce', '{"winners": true, "leaderboards": true, "raffles": true, "new_games": true}', 'Automatic announcement settings'),
    
    ('twitter', 'rate_limit', '{"tweets_per_hour": 30, "announcements_per_day": 50}', 'Rate limiting configuration for Twitter bot'),
    ('twitter', 'tweet_format', '{"max_length": 280, "hashtags_enabled": true, "media_enabled": true}', 'Default tweet formatting options'),
    ('twitter', 'auto_announce', '{"winners": true, "leaderboards": true, "raffles": true, "milestones": true}', 'Automatic announcement settings')

ON CONFLICT (bot_type, config_key) DO NOTHING; 