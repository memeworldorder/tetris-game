import { Router, Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { generateTempPaymentAddress, calculateLifePrices } from '../utils/solana-utils'
import { db } from '../config/database'
import { redis } from '../config/redis'
import { publishEvent } from '../config/rabbitmq'

const router = Router()

// Store temp payment addresses in Redis
const TEMP_ADDRESS_TTL = 15 * 60 // 15 minutes in seconds

interface TempAddressData {
  wallet: string
  nonce: number
  priceInfo: any
  timestamp: number
  expiresAt: number
  gameId: string
}

router.post('/buy-life', asyncHandler(async (req: Request, res: Response) => {
  const { wallet, gameId = 'tetris' } = req.body

  if (!wallet) {
    return res.status(400).json({ error: 'Wallet address required' })
  }

  // Get game configuration
  const gameConfig = await db.query(
    'SELECT * FROM game_configs WHERE game_id = $1 AND active = true',
    [gameId]
  )

  if (!gameConfig.rows.length) {
    return res.status(404).json({ error: `Game '${gameId}' not found or inactive` })
  }

  const config = gameConfig.rows[0]
  const paidLifeCap = config.lives_config?.paid_life_cap || 10

  // Check how many paid lives were purchased today
  const utcMidnight = new Date()
  utcMidnight.setUTCHours(0, 0, 0, 0)

  const todayPayments = await db.query(
    `SELECT SUM(lives_bought) as total 
     FROM payments 
     WHERE wallet = $1 AND created_at >= $2`,
    [wallet, utcMidnight.toISOString()]
  )

  const totalPaidToday = todayPayments.rows[0]?.total || 0

  if (totalPaidToday >= paidLifeCap) {
    return res.status(429).json({ 
      error: `Daily paid life limit of ${paidLifeCap} reached` 
    })
  }

  // Get current price information
  const priceInfo = await calculateLifePrices()
  
  // Generate unique nonce for this payment request  
  const nonce = Date.now() + Math.floor(Math.random() * 1000)
  
  // Generate temporary payment address
  const tempAddress = generateTempPaymentAddress(wallet, nonce)
  
  // Store the payment request in Redis
  const expiresAt = Date.now() + (TEMP_ADDRESS_TTL * 1000)
  const tempAddressData: TempAddressData = {
    wallet,
    nonce,
    priceInfo,
    timestamp: Date.now(),
    expiresAt,
    gameId
  }

  await redis.setEx(
    `temp_address:${tempAddress}`,
    TEMP_ADDRESS_TTL,
    JSON.stringify(tempAddressData)
  )

  // Publish event for analytics
  await publishEvent('payment.address_generated', {
    wallet,
    gameId,
    tempAddress: tempAddress.toString(),
    expiresAt
  })

  // Use game-specific pricing if available
  const gamePaymentConfig = config.payment_config || {}
  const priceUSD = gamePaymentConfig.prices_usd || {
    cheap: 0.03,
    mid: 0.09,
    high: 0.27
  }
  const livesPerTier = gamePaymentConfig.lives_per_tier || {
    cheap: 1,
    mid: 3,
    high: 10
  }

  res.json({
    payAddr: tempAddress.toString(),
    gameId,
    priceMWOR: {
      cheap: priceInfo.cheapPriceMwor,
      mid: priceInfo.midPriceMwor,
      high: priceInfo.highPriceMwor
    },
    priceUSD,
    lives: livesPerTier,
    mworPriceUsd: priceInfo.mworPriceUsd,
    expiresAt,
    remainingPaidLives: paidLifeCap - totalPaidToday,
    gameConfig: {
      name: config.name,
      payment_enabled: config.payment_config?.enabled !== false
    }
  })
}))

// Get temp address info (for webhook processing)
router.get('/temp-address/:address', asyncHandler(async (req: Request, res: Response) => {
  const { address } = req.params

  if (!address) {
    return res.status(400).json({ error: 'Address parameter required' })
  }

  const addressData = await redis.get(`temp_address:${address}`)
  
  if (!addressData) {
    return res.status(404).json({ error: 'Address not found or expired' })
  }

  const parsedData = JSON.parse(addressData) as TempAddressData
  
  if (Date.now() > parsedData.expiresAt) {
    await redis.del(`temp_address:${address}`)
    return res.status(410).json({ error: 'Address expired' })
  }

  res.json(parsedData)
}))

export { router as buyLifeRouter } 