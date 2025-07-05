import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3020', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  serviceName: process.env.SERVICE_NAME || 'telegram-game-bot',
  
  // Database configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://gamefi_user:gamefi_password@localhost:5432/gamefi_platform',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'gamefi_user',
    password: process.env.DB_PASSWORD || 'gamefi_password',
    database: process.env.DB_NAME || 'gamefi_platform',
    ssl: process.env.DB_SSL === 'true',
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10)
  },
  
  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10)
  },
  
  // RabbitMQ configuration
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://gamefi:gamefi_queue@localhost:5672/gamefi_vhost',
    host: process.env.RABBITMQ_HOST || 'localhost',
    port: parseInt(process.env.RABBITMQ_PORT || '5672', 10),
    username: process.env.RABBITMQ_USERNAME || 'gamefi',
    password: process.env.RABBITMQ_PASSWORD || 'gamefi_queue',
    vhost: process.env.RABBITMQ_VHOST || 'gamefi_vhost'
  },
  
  // Telegram Bot configuration
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    channelId: process.env.TELEGRAM_CHANNEL_ID || '',
    adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID || '',
    maxRetries: parseInt(process.env.TELEGRAM_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.TELEGRAM_RETRY_DELAY || '1000', 10)
  },
  
  // Game configuration
  games: {
    pickNumber: {
      defaultTimeLimit: parseInt(process.env.PICK_NUMBER_TIME_LIMIT || '300', 10), // 5 minutes
      minPlayers: parseInt(process.env.PICK_NUMBER_MIN_PLAYERS || '2', 10),
      maxPlayers: parseInt(process.env.PICK_NUMBER_MAX_PLAYERS || '100', 10),
      numberMultiplier: parseFloat(process.env.PICK_NUMBER_MULTIPLIER || '5.0'), // 5x players
      maxNumbers: parseInt(process.env.PICK_NUMBER_MAX_NUMBERS || '1000', 10),
      joinTimeLimit: parseInt(process.env.PICK_NUMBER_JOIN_TIME || '60', 10), // 1 minute to join
      announceInterval: parseInt(process.env.PICK_NUMBER_ANNOUNCE_INTERVAL || '30', 10) // 30 seconds
    },
    quiz: {
      defaultQuestionCount: parseInt(process.env.QUIZ_DEFAULT_QUESTIONS || '20', 10),
      defaultTimePerQuestion: parseInt(process.env.QUIZ_TIME_PER_QUESTION || '15', 10), // 15 seconds
      minPlayers: parseInt(process.env.QUIZ_MIN_PLAYERS || '2', 10),
      maxPlayers: parseInt(process.env.QUIZ_MAX_PLAYERS || '50', 10),
      joinTimeLimit: parseInt(process.env.QUIZ_JOIN_TIME || '60', 10), // 1 minute to join
      announceInterval: parseInt(process.env.QUIZ_ANNOUNCE_INTERVAL || '30', 10), // 30 seconds
      defaultDifficulty: process.env.QUIZ_DEFAULT_DIFFICULTY || 'medium',
      prizePoolAmount: parseFloat(process.env.QUIZ_PRIZE_POOL || '100'),
      prizePoolCurrency: process.env.QUIZ_PRIZE_CURRENCY || 'MWOR'
    }
  },
  
  // Webhook configuration
  webhooks: {
    enabled: process.env.WEBHOOKS_ENABLED === 'true',
    secret: process.env.WEBHOOK_SECRET || 'default-webhook-secret',
    endpoints: {
      gameStart: process.env.WEBHOOK_GAME_START || '',
      gameEnd: process.env.WEBHOOK_GAME_END || '',
      playerJoin: process.env.WEBHOOK_PLAYER_JOIN || '',
      numberSelected: process.env.WEBHOOK_NUMBER_SELECTED || '',
      winnerSelected: process.env.WEBHOOK_WINNER_SELECTED || ''
    }
  },
  
  // API configuration
  api: {
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['*'],
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10) // 100 requests per window
    }
  },
  
  // Security
  security: {
    adminSecret: process.env.ADMIN_SECRET || 'default-admin-secret',
    jwtSecret: process.env.JWT_SECRET || 'default-jwt-secret',
    sessionSecret: process.env.SESSION_SECRET || 'default-session-secret'
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.NODE_ENV === 'development'
  },
  
  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000', 10),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7')
  },
  
  // Solana configuration
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    tokenAddress: process.env.MWOR_TOKEN_ADDRESS || 'EoRe4xECTe9imaYtwfdmrGoinD2S1N5yMeu1LrjQpump',
    tokenSymbol: 'MWOR',
    minTokenBalance: parseFloat(process.env.MIN_TOKEN_BALANCE || '1'), // Minimum tokens to verify
    verificationCacheDuration: parseInt(process.env.VERIFICATION_CACHE_DURATION || '3600', 10) // 1 hour
  }
};

export default config;