import { Router, Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { db } from '../config/database'
import { getMworBalance, generateDeviceFingerprint } from '../utils/solana-utils'
import { publishEvent } from '../config/rabbitmq'

const router = Router()

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map<string, { count: number, lastReset: number }>()

router.post('/claim-daily', asyncHandler(async (req: Request, res: Response) => {
  const { wallet, deviceId, ip, gameId = 'tetris' } = req.body

  if (!wallet || !deviceId || !ip) {
    return res.status(400).json({ 
      error: 'Missing required fields: wallet, deviceId, ip' 
    })
  }

  // Get game configuration
  const gameConfig = await db.query(
    'SELECT * FROM game_configs WHERE game_id = $1 AND active = true',
    [gameId]
  )

  if (!gameConfig.rows.length) {
    return res.status(404).json({ 
      error: `Game '${gameId}' not found or inactive` 
    })
  }

  const config = gameConfig.rows[0]
  const livesConfig = config.lives_config || {}

  // Generate device fingerprint for rate limiting
  const userAgent = req.headers['user-agent'] || ''
  const deviceFingerprint = generateDeviceFingerprint(ip, userAgent)
  const rateLimitKey = `${ip}:${deviceFingerprint}:${wallet}`

  // Check rate limits
  const freeLifeLimit = livesConfig.free_lives_per_day || 5
  const now = Date.now()
  const oneDayMs = 24 * 60 * 60 * 1000
  
  const rateLimitEntry = rateLimitStore.get(rateLimitKey)
  if (rateLimitEntry) {
    // Reset counter if it's been more than 24 hours
    if (now - rateLimitEntry.lastReset > oneDayMs) {
      rateLimitEntry.count = 0
      rateLimitEntry.lastReset = now
    }
    
    if (rateLimitEntry.count >= freeLifeLimit) {
      return res.status(429).json({ 
        error: 'Daily free life limit exceeded for this IP/device' 
      })
    }
  }

  // Check if user needs daily reset
  const utcMidnight = new Date()
  utcMidnight.setUTCHours(0, 0, 0, 0)

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    // Get current lives record
    const existingLives = await client.query(
      'SELECT * FROM lives WHERE wallet = $1',
      [wallet]
    )

    let livesRecord = existingLives.rows[0]
    let needsReset = false

    if (!livesRecord) {
      // Create new record
      const newRecord = await client.query(
        `INSERT INTO lives (wallet, free_today, bonus_today, paid_bank, last_reset)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [wallet, 0, 0, 0, utcMidnight.toISOString()]
      )
      livesRecord = newRecord.rows[0]
    } else {
      // Check if reset is needed
      const lastReset = new Date(livesRecord.last_reset)
      if (lastReset < utcMidnight) {
        needsReset = true
      }
    }

    // Get MWOR balance for bonus calculation
    let mworBalance = 0
    try {
      mworBalance = await getMworBalance(wallet)
    } catch (error) {
      console.error('Error getting MWOR balance:', error)
      // Continue without bonus lives if balance check fails
    }

    // Calculate bonus lives
    const bonusLives = Math.min(
      Math.floor(mworBalance / (livesConfig.bonus_divisor || 1000)),
      livesConfig.bonus_cap || 5
    )

    // Update lives record
    let updatedRecord
    if (needsReset) {
      updatedRecord = await client.query(
        `UPDATE lives 
         SET free_today = 1, bonus_today = $1, last_reset = $2
         WHERE wallet = $3
         RETURNING *`,
        [bonusLives, utcMidnight.toISOString(), wallet]
      )
    } else {
      // Check if user hasn't claimed today's free life
      if (livesRecord.free_today === 0) {
        updatedRecord = await client.query(
          `UPDATE lives 
           SET free_today = 1, bonus_today = $1
           WHERE wallet = $2
           RETURNING *`,
          [bonusLives, wallet]
        )
      } else {
        // Just update bonus based on current balance
        updatedRecord = await client.query(
          `UPDATE lives 
           SET bonus_today = $1
           WHERE wallet = $2
           RETURNING *`,
          [bonusLives, wallet]
        )
      }
    }

    await client.query('COMMIT')

    const finalRecord = updatedRecord.rows[0]

    // Update rate limit counter
    if (rateLimitStore.has(rateLimitKey)) {
      rateLimitStore.get(rateLimitKey)!.count++
    } else {
      rateLimitStore.set(rateLimitKey, { count: 1, lastReset: now })
    }

    // Publish event for analytics
    await publishEvent('rewards.daily_claimed', {
      wallet,
      gameId,
      free_lives: finalRecord.free_today,
      bonus_lives: finalRecord.bonus_today,
      paid_lives: finalRecord.paid_bank,
      total_lives: finalRecord.free_today + finalRecord.bonus_today + finalRecord.paid_bank,
      mwor_balance: mworBalance,
      was_reset: needsReset
    })

    res.json({
      free: finalRecord.free_today,
      bonus: finalRecord.bonus_today,
      paid_bank: finalRecord.paid_bank,
      total: finalRecord.free_today + finalRecord.bonus_today + finalRecord.paid_bank
    })

  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}))

export { router as claimDailyRouter } 