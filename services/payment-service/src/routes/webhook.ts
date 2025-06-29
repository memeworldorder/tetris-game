import { Router, Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { db } from '../config/database'
import { redis } from '../config/redis'
import { publishEvent } from '../config/rabbitmq'
import { getTransactionDetails } from '../utils/solana-utils'

const router = Router()

interface PaymentWebhook {
  signature: string
  recipient: string
  amount: number
  token: string
  timestamp: number
}

router.post('/solana', asyncHandler(async (req: Request, res: Response) => {
  const webhook = req.body as PaymentWebhook
  
  // Verify webhook authenticity (implement HMAC or similar)
  const webhookSecret = req.headers['x-webhook-secret']
  if (webhookSecret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Check if this transaction was already processed
  const processed = await redis.get(`processed_tx:${webhook.signature}`)
  if (processed) {
    return res.json({ status: 'already_processed' })
  }

  // Get temp address info
  const addressData = await redis.get(`temp_address:${webhook.recipient}`)
  if (!addressData) {
    console.warn('Payment to unknown address:', webhook.recipient)
    return res.status(404).json({ error: 'Unknown payment address' })
  }

  const tempAddress = JSON.parse(addressData)
  
  // Verify transaction details
  const txDetails = await getTransactionDetails(webhook.signature)
  
  // Determine lives purchased based on amount
  let livesBought = 0
  let tier = 'unknown'
  
  const priceInfo = tempAddress.priceInfo
  if (webhook.amount >= priceInfo.highPriceMwor * 0.95) {
    livesBought = 10
    tier = 'high'
  } else if (webhook.amount >= priceInfo.midPriceMwor * 0.95) {
    livesBought = 3
    tier = 'mid'
  } else if (webhook.amount >= priceInfo.cheapPriceMwor * 0.95) {
    livesBought = 1
    tier = 'cheap'
  }

  if (livesBought === 0) {
    return res.status(400).json({ error: 'Invalid payment amount' })
  }

  // Start transaction
  const client = await db.connect()
  try {
    await client.query('BEGIN')

    // Record payment
    const paymentResult = await client.query(
      `INSERT INTO payments (wallet, transaction_signature, amount, token, lives_bought, tier, game_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [tempAddress.wallet, webhook.signature, webhook.amount, webhook.token, livesBought, tier, tempAddress.gameId]
    )

    // Update user's paid lives
    await client.query(
      `INSERT INTO lives (wallet, paid_bank, last_reset)
       VALUES ($1, $2, NOW())
       ON CONFLICT (wallet) 
       DO UPDATE SET paid_bank = lives.paid_bank + $2`,
      [tempAddress.wallet, livesBought]
    )

    await client.query('COMMIT')

    // Mark transaction as processed
    await redis.setEx(`processed_tx:${webhook.signature}`, 86400, '1') // 24 hour TTL

    // Clean up temp address
    await redis.del(`temp_address:${webhook.recipient}`)

    // Publish event for other services
    await publishEvent('payment.completed', {
      wallet: tempAddress.wallet,
      gameId: tempAddress.gameId,
      paymentId: paymentResult.rows[0].id,
      livesBought,
      tier,
      amount: webhook.amount,
      token: webhook.token,
      signature: webhook.signature
    })

    res.json({ 
      status: 'success',
      livesBought,
      tier,
      paymentId: paymentResult.rows[0].id
    })

  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}))

export { router as webhookRouter } 