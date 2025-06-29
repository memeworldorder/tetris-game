import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { errorHandler } from './middleware/errorHandler'
import { buyLifeRouter } from './routes/buyLife'
import { webhookRouter } from './routes/webhook'
import { subscribeToQueue } from './config/rabbitmq'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000process.env.PORT || 3000process.env.PORT || 3013

// Middleware
app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({
    status: 'healthy',
    service: 'payment-service',
    version: '1.0.0',
    uptime: process.uptime()
  })
})

// Routes
app.use('/api/payments', buyLifeRouter)
app.use('/api/webhooks', webhookRouter)

// Error handling
app.use(errorHandler)

// Subscribe to payment-related events
async function setupEventHandlers() {
  // Listen for payment confirmations
  await subscribeToQueue(
    'payment_confirmations',
    'blockchain.payment.confirmed',
    async (data) => {
      console.log('Payment confirmed:', data)
      // Process confirmed payment
      // Update user's paid lives
      // Send confirmation to user
    }
  )

  // Listen for refund requests
  await subscribeToQueue(
    'payment_refunds',
    'payment.refund.requested',
    async (data) => {
      console.log('Refund requested:', data)
      // Process refund logic
    }
  )
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Payment Service running on port ${PORT}`)
  setupEventHandlers().catch(console.error)
}) 