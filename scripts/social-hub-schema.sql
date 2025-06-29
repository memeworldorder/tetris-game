-- Social Hub Service Database Schema
-- Tables for cross-platform social coordination and campaign management

-- Social campaigns table
CREATE TABLE IF NOT EXISTS social_campaigns (
    id SERIAL PRIMARY KEY,
    campaign_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(50) NOT NULL, -- 'announcement', 'promotion', 'event', 'milestone'
    platforms JSONB NOT NULL, -- ['telegram', 'twitter', 'discord']
    target_audience JSONB DEFAULT '{}', -- targeting criteria
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'scheduled', 'active', 'completed', 'cancelled'
    priority INTEGER DEFAULT 0, -- 0=low, 1=medium, 2=high, 3=urgent
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(44), -- wallet address of creator
    approved_by VARCHAR(44), -- wallet address of approver
    budget_sol DECIMAL(10, 6) DEFAULT 0,
    spent_sol DECIMAL(10, 6) DEFAULT 0,
    campaign_config JSONB DEFAULT '{}',
    analytics_config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign templates table
CREATE TABLE IF NOT EXISTS campaign_templates (
    id SERIAL PRIMARY KEY,
    template_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    template_type VARCHAR(50) NOT NULL, -- 'winner_announcement', 'game_launch', 'maintenance', etc.
    platforms JSONB NOT NULL,
    content_templates JSONB NOT NULL, -- platform-specific content templates
    default_config JSONB DEFAULT '{}',
    variables JSONB DEFAULT '[]', -- required variables list
    active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_by VARCHAR(44),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cross-platform posts table
CREATE TABLE IF NOT EXISTS cross_platform_posts (
    id SERIAL PRIMARY KEY,
    post_id VARCHAR(100) UNIQUE NOT NULL,
    campaign_id VARCHAR(100),
    template_id VARCHAR(100),
    post_type VARCHAR(50) NOT NULL, -- 'announcement', 'update', 'promotion', 'engagement'
    title VARCHAR(300),
    content TEXT NOT NULL,
    media_urls JSONB DEFAULT '[]',
    target_platforms JSONB NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    posted_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'scheduled', 'posting', 'posted', 'failed'
    post_config JSONB DEFAULT '{}',
    created_by VARCHAR(44),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform-specific post results table
CREATE TABLE IF NOT EXISTS platform_post_results (
    id SERIAL PRIMARY KEY,
    post_id VARCHAR(100) NOT NULL,
    platform VARCHAR(20) NOT NULL, -- 'telegram', 'twitter', 'discord'
    platform_post_id VARCHAR(100), -- ID returned by platform
    status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'pending'
    response_data JSONB,
    error_message TEXT,
    engagement_data JSONB DEFAULT '{}', -- likes, shares, comments, etc.
    posted_at TIMESTAMP WITH TIME ZONE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled actions table
CREATE TABLE IF NOT EXISTS scheduled_actions (
    id SERIAL PRIMARY KEY,
    action_id VARCHAR(100) UNIQUE NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'post', 'repost', 'delete', 'update'
    target_entity VARCHAR(50) NOT NULL, -- 'campaign', 'post', 'template'
    target_id VARCHAR(100) NOT NULL,
    platforms JSONB NOT NULL,
    action_data JSONB NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'executing', 'completed', 'failed', 'cancelled'
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Engagement analytics table
CREATE TABLE IF NOT EXISTS engagement_analytics (
    id SERIAL PRIMARY KEY,
    post_id VARCHAR(100) NOT NULL,
    platform VARCHAR(20) NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- 'views', 'likes', 'shares', 'comments', 'clicks'
    metric_value INTEGER NOT NULL,
    additional_data JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date DATE DEFAULT CURRENT_DATE
);

-- Audience segments table
CREATE TABLE IF NOT EXISTS audience_segments (
    id SERIAL PRIMARY KEY,
    segment_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    platforms JSONB NOT NULL,
    criteria JSONB NOT NULL, -- targeting criteria
    estimated_reach INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_by VARCHAR(44),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content moderation table
CREATE TABLE IF NOT EXISTS content_moderation (
    id SERIAL PRIMARY KEY,
    post_id VARCHAR(100) NOT NULL,
    platform VARCHAR(20) NOT NULL,
    moderation_type VARCHAR(50) NOT NULL, -- 'automated', 'manual', 'community'
    status VARCHAR(20) NOT NULL, -- 'approved', 'rejected', 'flagged', 'pending'
    reasons JSONB DEFAULT '[]',
    moderator_id VARCHAR(44), -- wallet address of moderator
    automated_score DECIMAL(3, 2), -- 0.00 to 1.00 confidence score
    community_reports INTEGER DEFAULT 0,
    action_taken VARCHAR(100), -- 'none', 'removed', 'edited', 'warning'
    moderated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Social platform configurations table
CREATE TABLE IF NOT EXISTS platform_configs (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(20) UNIQUE NOT NULL,
    config_data JSONB NOT NULL,
    rate_limits JSONB DEFAULT '{}',
    api_status VARCHAR(20) DEFAULT 'active', -- 'active', 'degraded', 'offline'
    last_health_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    health_status JSONB DEFAULT '{}',
    credentials_encrypted TEXT, -- encrypted API keys/tokens
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cross-platform mentions and interactions table
CREATE TABLE IF NOT EXISTS cross_platform_interactions (
    id SERIAL PRIMARY KEY,
    interaction_id VARCHAR(100) UNIQUE NOT NULL,
    platform VARCHAR(20) NOT NULL,
    interaction_type VARCHAR(50) NOT NULL, -- 'mention', 'reply', 'dm', 'tag'
    source_user_id VARCHAR(100), -- platform-specific user ID
    source_username VARCHAR(100),
    target_post_id VARCHAR(100),
    content TEXT,
    sentiment VARCHAR(20), -- 'positive', 'neutral', 'negative'
    requires_response BOOLEAN DEFAULT false,
    responded BOOLEAN DEFAULT false,
    response_post_id VARCHAR(100),
    priority INTEGER DEFAULT 0,
    interaction_data JSONB DEFAULT '{}',
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE
);

-- Content approval workflow table
CREATE TABLE IF NOT EXISTS content_approval_workflow (
    id SERIAL PRIMARY KEY,
    post_id VARCHAR(100) NOT NULL,
    current_stage VARCHAR(50) NOT NULL, -- 'draft', 'review', 'legal', 'final_approval'
    assignee_wallet VARCHAR(44),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'changes_requested'
    comments TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_social_campaigns_status ON social_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_social_campaigns_dates ON social_campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_social_campaigns_creator ON social_campaigns(created_by);

CREATE INDEX IF NOT EXISTS idx_campaign_templates_type ON campaign_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_campaign_templates_active ON campaign_templates(active);

CREATE INDEX IF NOT EXISTS idx_cross_platform_posts_campaign ON cross_platform_posts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cross_platform_posts_status ON cross_platform_posts(status);
CREATE INDEX IF NOT EXISTS idx_cross_platform_posts_scheduled ON cross_platform_posts(scheduled_for);

CREATE INDEX IF NOT EXISTS idx_platform_post_results_post ON platform_post_results(post_id);
CREATE INDEX IF NOT EXISTS idx_platform_post_results_platform ON platform_post_results(platform);
CREATE INDEX IF NOT EXISTS idx_platform_post_results_status ON platform_post_results(status);

CREATE INDEX IF NOT EXISTS idx_scheduled_actions_scheduled ON scheduled_actions(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_actions_status ON scheduled_actions(status);

CREATE INDEX IF NOT EXISTS idx_engagement_analytics_post ON engagement_analytics(post_id);
CREATE INDEX IF NOT EXISTS idx_engagement_analytics_date ON engagement_analytics(date);
CREATE INDEX IF NOT EXISTS idx_engagement_analytics_platform ON engagement_analytics(platform);

CREATE INDEX IF NOT EXISTS idx_audience_segments_active ON audience_segments(active);

CREATE INDEX IF NOT EXISTS idx_content_moderation_post ON content_moderation(post_id);
CREATE INDEX IF NOT EXISTS idx_content_moderation_status ON content_moderation(status);

CREATE INDEX IF NOT EXISTS idx_platform_configs_platform ON platform_configs(platform);
CREATE INDEX IF NOT EXISTS idx_platform_configs_active ON platform_configs(active);

CREATE INDEX IF NOT EXISTS idx_cross_platform_interactions_platform ON cross_platform_interactions(platform);
CREATE INDEX IF NOT EXISTS idx_cross_platform_interactions_requires_response ON cross_platform_interactions(requires_response);

CREATE INDEX IF NOT EXISTS idx_content_approval_workflow_post ON content_approval_workflow(post_id);
CREATE INDEX IF NOT EXISTS idx_content_approval_workflow_assignee ON content_approval_workflow(assignee_wallet);

-- Insert default campaign templates
INSERT INTO campaign_templates (template_id, name, description, template_type, platforms, content_templates, variables) VALUES
    ('winner_announcement', 'Daily Winner Announcement', 'Template for announcing daily game winners', 'winner_announcement', 
     '["telegram", "twitter"]',
     '{"telegram": "🎉 Daily Winner! 🎉\\n\\n🏆 Winner: {walletAddress}\\n🎮 Game: {gameName}\\n📊 Score: {score:,}\\n💰 Prize: {prize} SOL\\n\\nCongratulations! 🎊", "twitter": "🎉 DAILY WINNER! 🎉\\n\\n🏆 {walletAddress}\\n🎮 {gameName}\\n📊 {score:,} points\\n💰 {prize} $SOL\\n\\n#GameFi #P2E #Solana"}',
     '["walletAddress", "gameName", "score", "prize"]'),
     
    ('game_launch', 'New Game Launch', 'Template for announcing new game launches', 'game_launch',
     '["telegram", "twitter"]', 
     '{"telegram": "🎮 NEW GAME LAUNCHED! 🎮\\n\\n🚀 Game: {gameName}\\n📝 Description: {description}\\n💰 Prize Pool: {prizePool} SOL\\n🎯 Lives: {freeLives} free per day\\n\\nPlay now!", "twitter": "🎮 NEW GAME LAUNCHED! 🎮\\n\\n🚀 {gameName}\\n📝 {description}\\n💰 {prizePool} $SOL pool\\n🎯 {freeLives} free lives/day\\n\\n#NewGame #GameFi #P2E"}',
     '["gameName", "description", "prizePool", "freeLives"]'),
     
    ('maintenance_notice', 'Maintenance Notice', 'Template for maintenance announcements', 'maintenance',
     '["telegram", "twitter"]',
     '{"telegram": "🔧 MAINTENANCE NOTICE 🔧\\n\\n⏰ Start Time: {startTime}\\n⏳ Duration: {duration}\\n📋 Reason: {reason}\\n\\nWe\\"ll be back soon with improvements!", "twitter": "🔧 MAINTENANCE NOTICE 🔧\\n\\n⏰ {startTime}\\n⏳ {duration}\\n📋 {reason}\\n\\nBack soon with improvements!\\n\\n#Maintenance #Update"}',
     '["startTime", "duration", "reason"]')

ON CONFLICT (template_id) DO NOTHING;

-- Insert default platform configurations
INSERT INTO platform_configs (platform, config_data, rate_limits) VALUES
    ('telegram', '{"parse_mode": "HTML", "disable_preview": false}', '{"messages_per_minute": 20, "announcements_per_hour": 10}'),
    ('twitter', '{"max_length": 280, "hashtags_enabled": true}', '{"tweets_per_hour": 30, "announcements_per_day": 50}'),
    ('discord', '{"embed_enabled": true, "mention_roles": true}', '{"messages_per_minute": 10, "embeds_per_hour": 100}')
ON CONFLICT (platform) DO NOTHING;

-- Insert default audience segments
INSERT INTO audience_segments (segment_id, name, description, platforms, criteria) VALUES
    ('all_users', 'All Users', 'All platform users across all channels', '["telegram", "twitter", "discord"]', '{"include_all": true}'),
    ('high_scorers', 'High Score Players', 'Players with scores in top 10%', '["telegram", "twitter"]', '{"score_percentile": 90}'),
    ('daily_players', 'Daily Active Players', 'Users who play daily', '["telegram"]', '{"play_frequency": "daily"}}')
ON CONFLICT (segment_id) DO NOTHING; 