-- Scheduler Service Database Schema
-- Tables for background tasks, cron jobs, and scheduled operations

-- Scheduled jobs table
CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(100) UNIQUE NOT NULL,
    job_name VARCHAR(200) NOT NULL,
    job_type VARCHAR(50) NOT NULL, -- 'cron', 'one_time', 'recurring', 'delayed'
    job_category VARCHAR(50) NOT NULL, -- 'maintenance', 'analytics', 'rewards', 'social', 'cleanup'
    description TEXT,
    cron_expression VARCHAR(100), -- cron format for recurring jobs
    target_service VARCHAR(50), -- which service to call
    endpoint_url TEXT NOT NULL, -- full URL or relative path
    http_method VARCHAR(10) DEFAULT 'POST',
    request_headers JSONB DEFAULT '{}',
    request_body JSONB DEFAULT '{}',
    timeout_seconds INTEGER DEFAULT 30,
    retry_policy JSONB DEFAULT '{"max_retries": 3, "retry_delay_seconds": 60}',
    next_run_at TIMESTAMP WITH TIME ZONE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_run_status VARCHAR(20), -- 'success', 'failed', 'timeout', 'skipped'
    last_run_duration_ms INTEGER,
    run_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_by VARCHAR(44), -- wallet address
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job execution history
CREATE TABLE IF NOT EXISTS job_executions (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(100) NOT NULL,
    execution_id VARCHAR(100) UNIQUE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    status VARCHAR(20) NOT NULL, -- 'running', 'success', 'failed', 'timeout', 'cancelled'
    response_code INTEGER,
    response_body TEXT,
    error_message TEXT,
    retry_attempt INTEGER DEFAULT 0,
    execution_context JSONB DEFAULT '{}', -- variables, environment at execution time
    logs TEXT[]
);

-- System maintenance tasks
CREATE TABLE IF NOT EXISTS maintenance_tasks (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(100) UNIQUE NOT NULL,
    task_name VARCHAR(200) NOT NULL,
    task_type VARCHAR(50) NOT NULL, -- 'database_cleanup', 'log_rotation', 'cache_clear', 'backup'
    frequency VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'custom'
    priority INTEGER DEFAULT 1, -- 1=low, 2=medium, 3=high, 4=critical
    estimated_duration_minutes INTEGER,
    maintenance_window_start TIME, -- preferred start time
    maintenance_window_end TIME, -- preferred end time
    allowed_days INTEGER[] DEFAULT '{1,2,3,4,5,6,7}', -- days of week (1=Monday)
    resource_requirements JSONB DEFAULT '{}', -- CPU, memory, disk requirements
    dependencies JSONB DEFAULT '[]', -- other tasks that must complete first
    rollback_procedure TEXT,
    validation_checks JSONB DEFAULT '[]',
    notification_settings JSONB DEFAULT '{}',
    last_maintenance TIMESTAMP WITH TIME ZONE,
    next_maintenance TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'scheduled',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily operations schedule
CREATE TABLE IF NOT EXISTS daily_operations (
    id SERIAL PRIMARY KEY,
    operation_id VARCHAR(100) UNIQUE NOT NULL,
    operation_name VARCHAR(200) NOT NULL,
    operation_type VARCHAR(50) NOT NULL, -- 'reset', 'aggregation', 'report', 'backup', 'cleanup'
    target_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    completion_time TIMESTAMP WITH TIME ZONE,
    dependencies JSONB DEFAULT '[]', -- other operations that must complete first
    operation_data JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'running', 'completed', 'failed', 'skipped'
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 2,
    results JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leaderboard processing schedule
CREATE TABLE IF NOT EXISTS leaderboard_processing (
    id SERIAL PRIMARY KEY,
    processing_id VARCHAR(100) UNIQUE NOT NULL,
    game_id VARCHAR(100) NOT NULL,
    period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
    period_date DATE NOT NULL,
    processing_type VARCHAR(50) NOT NULL, -- 'calculate', 'finalize', 'announce', 'archive'
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_participants INTEGER,
    winner_wallet VARCHAR(44),
    winner_score INTEGER,
    prize_distributed_sol DECIMAL(18, 9),
    status VARCHAR(20) DEFAULT 'scheduled',
    processing_data JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(game_id, period_type, period_date, processing_type)
);

-- Automated notifications queue
CREATE TABLE IF NOT EXISTS notification_queue (
    id SERIAL PRIMARY KEY,
    notification_id VARCHAR(100) UNIQUE NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- 'winner', 'leaderboard', 'maintenance', 'system'
    recipient_type VARCHAR(20) NOT NULL, -- 'all', 'winners', 'segment', 'individual'
    recipients JSONB DEFAULT '[]', -- wallet addresses or segment IDs
    platforms JSONB NOT NULL, -- ['telegram', 'twitter', 'email']
    subject VARCHAR(300),
    content TEXT NOT NULL,
    media_urls JSONB DEFAULT '[]',
    priority INTEGER DEFAULT 1, -- 1=low, 2=medium, 3=high, 4=urgent
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivery_status JSONB DEFAULT '{}', -- status per platform
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    status VARCHAR(20) DEFAULT 'queued', -- 'queued', 'sending', 'sent', 'failed', 'cancelled'
    created_by VARCHAR(50), -- service or user that created notification
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Background task workers
CREATE TABLE IF NOT EXISTS task_workers (
    id SERIAL PRIMARY KEY,
    worker_id VARCHAR(100) UNIQUE NOT NULL,
    worker_name VARCHAR(200) NOT NULL,
    service_name VARCHAR(50) NOT NULL, -- which microservice is running this worker
    worker_type VARCHAR(50) NOT NULL, -- 'scheduler', 'processor', 'cleaner', 'aggregator'
    max_concurrent_tasks INTEGER DEFAULT 1,
    current_tasks INTEGER DEFAULT 0,
    supported_job_types JSONB DEFAULT '[]',
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'idle', -- 'idle', 'busy', 'offline', 'error'
    performance_stats JSONB DEFAULT '{}',
    configuration JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System health monitoring
CREATE TABLE IF NOT EXISTS system_health_checks (
    id SERIAL PRIMARY KEY,
    check_id VARCHAR(100) UNIQUE NOT NULL,
    check_name VARCHAR(200) NOT NULL,
    check_type VARCHAR(50) NOT NULL, -- 'service', 'database', 'external_api', 'queue'
    target_endpoint TEXT NOT NULL,
    check_frequency_minutes INTEGER DEFAULT 5,
    timeout_seconds INTEGER DEFAULT 10,
    expected_response_code INTEGER DEFAULT 200,
    expected_response_pattern TEXT,
    alert_threshold_failures INTEGER DEFAULT 3,
    last_check_at TIMESTAMP WITH TIME ZONE,
    last_check_status VARCHAR(20), -- 'success', 'failed', 'timeout'
    last_response_time_ms INTEGER,
    consecutive_failures INTEGER DEFAULT 0,
    total_checks INTEGER DEFAULT 0,
    total_failures INTEGER DEFAULT 0,
    alert_sent BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Event-driven triggers
CREATE TABLE IF NOT EXISTS event_triggers (
    id SERIAL PRIMARY KEY,
    trigger_id VARCHAR(100) UNIQUE NOT NULL,
    trigger_name VARCHAR(200) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'game_completed', 'payment_received', 'user_registered'
    event_source VARCHAR(50) NOT NULL, -- which service generates the event
    condition_expression TEXT, -- SQL-like condition to evaluate
    action_type VARCHAR(50) NOT NULL, -- 'schedule_job', 'send_notification', 'call_service'
    action_config JSONB NOT NULL,
    delay_seconds INTEGER DEFAULT 0,
    max_executions_per_hour INTEGER DEFAULT 100,
    execution_count_hour INTEGER DEFAULT 0,
    last_execution TIMESTAMP WITH TIME ZONE,
    active BOOLEAN DEFAULT true,
    created_by VARCHAR(44),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_next_run ON scheduled_jobs(next_run_at, active);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_type ON scheduled_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_category ON scheduled_jobs(job_category);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_service ON scheduled_jobs(target_service);

CREATE INDEX IF NOT EXISTS idx_job_executions_job ON job_executions(job_id);
CREATE INDEX IF NOT EXISTS idx_job_executions_status ON job_executions(status);
CREATE INDEX IF NOT EXISTS idx_job_executions_started ON job_executions(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_next ON maintenance_tasks(next_maintenance);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_type ON maintenance_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_priority ON maintenance_tasks(priority DESC);

CREATE INDEX IF NOT EXISTS idx_daily_operations_date ON daily_operations(target_date);
CREATE INDEX IF NOT EXISTS idx_daily_operations_status ON daily_operations(status);
CREATE INDEX IF NOT EXISTS idx_daily_operations_time ON daily_operations(target_date, scheduled_time);

CREATE INDEX IF NOT EXISTS idx_leaderboard_processing_scheduled ON leaderboard_processing(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_leaderboard_processing_game_period ON leaderboard_processing(game_id, period_type, period_date);
CREATE INDEX IF NOT EXISTS idx_leaderboard_processing_status ON leaderboard_processing(status);

CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_priority ON notification_queue(priority DESC);

CREATE INDEX IF NOT EXISTS idx_task_workers_status ON task_workers(status);
CREATE INDEX IF NOT EXISTS idx_task_workers_heartbeat ON task_workers(last_heartbeat);

CREATE INDEX IF NOT EXISTS idx_health_checks_last_check ON system_health_checks(last_check_at);
CREATE INDEX IF NOT EXISTS idx_health_checks_active ON system_health_checks(active);
CREATE INDEX IF NOT EXISTS idx_health_checks_failures ON system_health_checks(consecutive_failures);

CREATE INDEX IF NOT EXISTS idx_event_triggers_event_type ON event_triggers(event_type);
CREATE INDEX IF NOT EXISTS idx_event_triggers_active ON event_triggers(active);

-- Insert default system jobs
INSERT INTO scheduled_jobs (job_id, job_name, job_type, job_category, description, cron_expression, target_service, endpoint_url, next_run_at) VALUES
    ('daily_reset', 'Daily Midnight Reset', 'cron', 'maintenance', 'Reset daily counters and lives', '0 0 * * *', 'rewards-service', '/api/rewards/daily-reset', CURRENT_DATE + INTERVAL '1 day'),
    ('weekly_leaderboard', 'Weekly Leaderboard Processing', 'cron', 'rewards', 'Process weekly leaderboards', '0 1 * * 1', 'rewards-service', '/api/leaderboard/process-weekly', DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week' + INTERVAL '1 hour'),
    ('monthly_leaderboard', 'Monthly Leaderboard Processing', 'cron', 'rewards', 'Process monthly leaderboards', '0 2 1 * *', 'rewards-service', '/api/leaderboard/process-monthly', DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' + INTERVAL '2 hours'),
    ('health_check_services', 'Service Health Check', 'cron', 'maintenance', 'Check health of all microservices', '*/5 * * * *', 'scheduler', '/internal/health-check', NOW() + INTERVAL '5 minutes'),
    ('cleanup_old_sessions', 'Cleanup Old Game Sessions', 'cron', 'cleanup', 'Remove old game session data', '0 3 * * *', 'game-engine', '/api/admin/cleanup-sessions', CURRENT_DATE + INTERVAL '1 day' + INTERVAL '3 hours')
ON CONFLICT (job_id) DO NOTHING;

-- Insert default daily operations
INSERT INTO daily_operations (operation_id, operation_name, operation_type, target_date, scheduled_time) VALUES
    ('daily_reset_' || TO_CHAR(CURRENT_DATE + INTERVAL '1 day', 'YYYY_MM_DD'), 'Daily Reset Operation', 'reset', CURRENT_DATE + INTERVAL '1 day', '00:00:00'),
    ('daily_analytics_' || TO_CHAR(CURRENT_DATE + INTERVAL '1 day', 'YYYY_MM_DD'), 'Daily Analytics Aggregation', 'aggregation', CURRENT_DATE + INTERVAL '1 day', '01:00:00'),
    ('daily_backup_' || TO_CHAR(CURRENT_DATE + INTERVAL '1 day', 'YYYY_MM_DD'), 'Daily Database Backup', 'backup', CURRENT_DATE + INTERVAL '1 day', '02:00:00')
ON CONFLICT (operation_id) DO NOTHING;

-- Insert default health checks
INSERT INTO system_health_checks (check_id, check_name, check_type, target_endpoint) VALUES
    ('api_gateway_health', 'API Gateway Health', 'service', 'http://api-gateway:3000/health'),
    ('user_service_health', 'User Service Health', 'service', 'http://user-service:3010/health'),
    ('game_engine_health', 'Game Engine Health', 'service', 'http://game-engine:3011/health'),
    ('rewards_service_health', 'Rewards Service Health', 'service', 'http://rewards-service:3012/health'),
    ('payment_service_health', 'Payment Service Health', 'service', 'http://payment-service:3013/health'),
    ('analytics_service_health', 'Analytics Service Health', 'service', 'http://analytics-service:3014/health'),
    ('telegram_bot_health', 'Telegram Bot Health', 'service', 'http://telegram-bot:3015/health'),
    ('twitter_bot_health', 'Twitter Bot Health', 'service', 'http://twitter-bot:3016/health'),
    ('postgres_health', 'PostgreSQL Database', 'database', 'postgresql://postgres:5432/gamefi_platform'),
    ('redis_health', 'Redis Cache', 'database', 'redis://redis:6379')
ON CONFLICT (check_id) DO NOTHING; 