import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cron from 'node-cron'
import { errorHandler } from './middleware/errorHandler'
import { claimDailyRouter } from './routes/claimDaily'
import { subscribeToQueue } from './config/rabbitmq'
import { db } from './config/database'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000process.env.PORT || 3000process.env.PORT || 3012

// Middleware
app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({
    status: 'healthy',
    service: 'rewards-service',
    version: '1.0.0',
    uptime: process.uptime()
  })
})

// Routes
app.use('/api/rewards', claimDailyRouter)

// Error handling
app.use(errorHandler)

// Schedule daily reset at midnight UTC
cron.schedule('0 0 * * *', async () => {
  console.log('🔄 Running daily lives reset...')
  try {
    const utcMidnight = new Date()
    utcMidnight.setUTCHours(0, 0, 0, 0)
    
    // Reset all users' daily lives
    await db.query(
      `UPDATE lives 
       SET free_today = 0, bonus_today = 0, last_reset = $1 
       WHERE last_reset < $1`,
      [utcMidnight.toISOString()]
    )
    
    console.log('✅ Daily lives reset completed')
  } catch (error) {
    console.error('❌ Error during daily reset:', error)
  }
})

// Subscribe to reward-related events
async function setupEventHandlers() {
  // Listen for game completions to process achievements
  await subscribeToQueue(
    'rewards_game_completions',
    'game.completed',
    async (data) => {
      console.log('Game completed:', data)
      // Process achievements, streak bonuses, etc.
    }
  )

  // Listen for payment completions to update paid lives
  await subscribeToQueue(
    'rewards_payment_completed',
    'payment.completed',
    async (data) => {
      console.log('Payment completed, updating lives:', data)
      // This is handled by payment service, but we can track for achievements
    }
  )
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Rewards Service running on port ${PORT}`)
  setupEventHandlers().catch(console.error)
}) 