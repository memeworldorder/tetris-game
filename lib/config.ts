// Game API Microservice Configuration
// Centralized configuration management for environment variables

export const config = {
  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
  },

  // Solana Configuration
  solana: {
    rpc: process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
    mworMint: process.env.MWOR_MINT || '',
    mworgovMint: process.env.MWORGOV_MINT || '',
    priceOracleFeed: process.env.PRICE_ORACLE_FEED || '',
    vrfQueue: process.env.VRF_QUEUE || '',
    tempAddrSeed: process.env.TEMP_ADDR_DERIVE_SEED || 'lifebank',
  },

  // Webhook Configuration
  webhooks: {
    heliusSecret: process.env.HELIUS_WEBHOOK_SECRET || '',
  },

  // Game Rules & Rate Limiting
  game: {
    freeLifeLimitPerIp: parseInt(process.env.FREE_LIFE_LIMIT_PER_IP || '1'),
    paidLifeCap: parseInt(process.env.PAID_LIFE_CAP || '10'),
    bonusDivisor: parseInt(process.env.BONUS_DIVISOR || '50000'),
    bonusCap: parseInt(process.env.BONUS_CAP || '40'),
  },

  // Pricing Configuration
  pricing: {
    cheapUsd: parseFloat(process.env.PAID_LIFE_USD_CHEAP || '0.03'),
    midUsd: parseFloat(process.env.PAID_LIFE_USD_MID || '0.09'),
    highUsd: parseFloat(process.env.PAID_LIFE_USD_HIGH || '0.27'),
  },

  // Security & CRON
  security: {
    cronSecret: process.env.CRON_SECRET || 'dev-secret',
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  // Legacy Database (if keeping Neon alongside Supabase)
  legacy: {
    databaseUrl: process.env.DATABASE_URL || '',
  },
}

// Validation function to check required environment variables
export function validateConfig(): { valid: boolean; missingVars: string[] } {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'MWOR_MINT',
  ]

  const missingVars = requiredVars.filter(varName => !process.env[varName])

  return {
    valid: missingVars.length === 0,
    missingVars,
  }
}

// Helper to get IP address from request
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return '127.0.0.1' // fallback
}

// Rate limiting utilities
export interface RateLimitEntry {
  count: number
  lastReset: number
}

export function isRateLimited(
  entry: RateLimitEntry | undefined,
  limit: number,
  windowMs: number = 24 * 60 * 60 * 1000 // 24 hours
): boolean {
  if (!entry) return false
  
  const now = Date.now()
  
  // Reset if window has passed
  if (now - entry.lastReset > windowMs) {
    entry.count = 0
    entry.lastReset = now
    return false
  }
  
  return entry.count >= limit
}

export default config 