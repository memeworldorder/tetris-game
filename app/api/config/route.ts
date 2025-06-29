import { NextRequest, NextResponse } from 'next/server'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getTelegramBot } from '@/lib/telegram-bot'
import { checkDatabaseHealth } from '@/lib/supabase'

interface ConfigData {
  telegram: {
    botToken: string
    chatId: string
    enabled: boolean
  }
  database: {
    supabaseUrl: string
    supabaseServiceKey: string
    databaseUrl: string
  }
  solana: {
    rpc: string
    mworMint: string
    mworgovMint: string
    priceOracleFeed: string
    vrfQueue: string
  }
  game: {
    freeLifeLimitPerIp: number
    paidLifeCap: number
    bonusDivisor: number
    bonusCap: number
  }
  pricing: {
    cheapUsd: number
    midUsd: number
    highUsd: number
  }
  security: {
    cronSecret: string
    heliusWebhookSecret: string
  }
}

// GET /api/config - Get current configuration
export async function GET(request: NextRequest) {
  try {
    const config: ConfigData = {
      telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN || '',
        chatId: process.env.TELEGRAM_CHAT_ID || '',
        enabled: process.env.TELEGRAM_ANNOUNCEMENTS_ENABLED === 'true'
      },
      database: {
        supabaseUrl: process.env.SUPABASE_URL || '',
        supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',
        databaseUrl: process.env.DATABASE_URL || ''
      },
      solana: {
        rpc: process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
        mworMint: process.env.MWOR_MINT || '',
        mworgovMint: process.env.MWORGOV_MINT || '',
        priceOracleFeed: process.env.PRICE_ORACLE_FEED || '',
        vrfQueue: process.env.VRF_QUEUE || ''
      },
      game: {
        freeLifeLimitPerIp: parseInt(process.env.FREE_LIFE_LIMIT_PER_IP || '1'),
        paidLifeCap: parseInt(process.env.PAID_LIFE_CAP || '10'),
        bonusDivisor: parseInt(process.env.BONUS_DIVISOR || '50000'),
        bonusCap: parseInt(process.env.BONUS_CAP || '40')
      },
      pricing: {
        cheapUsd: parseFloat(process.env.PAID_LIFE_USD_CHEAP || '0.03'),
        midUsd: parseFloat(process.env.PAID_LIFE_USD_MID || '0.09'),
        highUsd: parseFloat(process.env.PAID_LIFE_USD_HIGH || '0.27')
      },
      security: {
        cronSecret: process.env.CRON_SECRET || '',
        heliusWebhookSecret: process.env.HELIUS_WEBHOOK_SECRET || ''
      }
    }

    // Test telegram connection if configured
    let telegramStatus: { connected: boolean; error: string | null } = { connected: false, error: null }
    if (config.telegram.botToken && config.telegram.chatId) {
      const telegramBot = getTelegramBot()
      try {
        telegramStatus.connected = await telegramBot.testConnection()
      } catch (error) {
        telegramStatus.error = error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // Test database connection
    let databaseStatus: { healthy: boolean; error: string | null; [key: string]: any } = { healthy: false, error: null }
    try {
      const health = await checkDatabaseHealth()
      databaseStatus = { ...health, error: health.error || null }
    } catch (error) {
      databaseStatus.error = error instanceof Error ? error.message : 'Unknown error'
    }

    return NextResponse.json({
      success: true,
      config,
      status: {
        telegram: telegramStatus,
        database: databaseStatus
      }
    })
  } catch (error) {
    console.error('Failed to get configuration:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST /api/config - Update configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { config, action = 'update' }: { config: Partial<ConfigData>, action?: string } = body

    if (action === 'test-telegram') {
      // Test telegram configuration without saving
      const telegramBot = getTelegramBot()
      const connected = await telegramBot.testConnection()
      
      if (connected) {
        // Send test message
        await telegramBot.sendCustomAnnouncement({
          type: 'raffle_starting',
          title: '🧪 Configuration Test',
          message: 'This is a test message from your MWOR Tetris bot configuration panel. If you see this, your Telegram bot is properly configured!'
        })
      }

      return NextResponse.json({
        success: connected,
        message: connected ? 'Telegram bot test successful!' : 'Telegram bot test failed'
      })
    }

    if (action === 'test-database') {
      // Test database connection
      const health = await checkDatabaseHealth()
      return NextResponse.json({
        success: health.healthy,
        message: health.healthy ? 'Database connection successful!' : `Database connection failed: ${health.error}`,
        details: health
      })
    }

    // Update environment variables
    const envPath = join(process.cwd(), '.env')
    let envContent = ''

    // Read existing .env if it exists
    if (existsSync(envPath)) {
      envContent = readFileSync(envPath, 'utf8')
    }

    // Parse existing env vars
    const envVars: Record<string, string> = {}
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim()
      }
    })

    // Update with new values
    if (config.telegram) {
      if (config.telegram.botToken !== undefined) envVars.TELEGRAM_BOT_TOKEN = config.telegram.botToken
      if (config.telegram.chatId !== undefined) envVars.TELEGRAM_CHAT_ID = config.telegram.chatId
      if (config.telegram.enabled !== undefined) envVars.TELEGRAM_ANNOUNCEMENTS_ENABLED = config.telegram.enabled.toString()
    }

    if (config.database) {
      if (config.database.supabaseUrl !== undefined) envVars.SUPABASE_URL = config.database.supabaseUrl
      if (config.database.supabaseServiceKey !== undefined) envVars.SUPABASE_SERVICE_KEY = config.database.supabaseServiceKey
      if (config.database.databaseUrl !== undefined) envVars.DATABASE_URL = config.database.databaseUrl
    }

    if (config.solana) {
      if (config.solana.rpc !== undefined) envVars.SOLANA_RPC = config.solana.rpc
      if (config.solana.mworMint !== undefined) envVars.MWOR_MINT = config.solana.mworMint
      if (config.solana.mworgovMint !== undefined) envVars.MWORGOV_MINT = config.solana.mworgovMint
      if (config.solana.priceOracleFeed !== undefined) envVars.PRICE_ORACLE_FEED = config.solana.priceOracleFeed
      if (config.solana.vrfQueue !== undefined) envVars.VRF_QUEUE = config.solana.vrfQueue
    }

    if (config.game) {
      if (config.game.freeLifeLimitPerIp !== undefined) envVars.FREE_LIFE_LIMIT_PER_IP = config.game.freeLifeLimitPerIp.toString()
      if (config.game.paidLifeCap !== undefined) envVars.PAID_LIFE_CAP = config.game.paidLifeCap.toString()
      if (config.game.bonusDivisor !== undefined) envVars.BONUS_DIVISOR = config.game.bonusDivisor.toString()
      if (config.game.bonusCap !== undefined) envVars.BONUS_CAP = config.game.bonusCap.toString()
    }

    if (config.pricing) {
      if (config.pricing.cheapUsd !== undefined) envVars.PAID_LIFE_USD_CHEAP = config.pricing.cheapUsd.toString()
      if (config.pricing.midUsd !== undefined) envVars.PAID_LIFE_USD_MID = config.pricing.midUsd.toString()
      if (config.pricing.highUsd !== undefined) envVars.PAID_LIFE_USD_HIGH = config.pricing.highUsd.toString()
    }

    if (config.security) {
      if (config.security.cronSecret !== undefined) envVars.CRON_SECRET = config.security.cronSecret
      if (config.security.heliusWebhookSecret !== undefined) envVars.HELIUS_WEBHOOK_SECRET = config.security.heliusWebhookSecret
    }

    // Write updated .env file
    const newEnvContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    writeFileSync(envPath, newEnvContent)

    // Update process.env for immediate effect (note: some changes may require restart)
    Object.entries(envVars).forEach(([key, value]) => {
      process.env[key] = value
    })

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully! Some changes may require a server restart to take full effect.',
      updatedVars: Object.keys(envVars).length
    })
  } catch (error) {
    console.error('Failed to update configuration:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 