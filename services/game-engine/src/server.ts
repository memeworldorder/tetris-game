import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { errorHandler } from './middleware/errorHandler'
import { endRoundRouter } from './routes/endRound'
import { subscribeToQueue } from './config/rabbitmq'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000process.env.PORT || 3000process.env.PORT || 3011

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' })) // Increased limit for game moves

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({
    status: 'healthy',
    service: 'game-engine',
    version: '1.0.0',
    uptime: process.uptime()
  })
})

// Routes
app.use('/api/game', endRoundRouter)

// Error handling
app.use(errorHandler)

// Subscribe to game-related events
async function setupEventHandlers() {
  // Listen for life consumption requests from other services
  await subscribeToQueue(
    'game_engine_life_requests',
    'game.life.consume',
    async (data) => {
      console.log('Life consumption request:', data)
      // Process life consumption if needed
    }
  )

  // Listen for game configuration updates
  await subscribeToQueue(
    'game_engine_config_updates',
    'config.game.updated',
    async (data) => {
      console.log('Game configuration updated:', data)
      // Invalidate caches or reload configuration
    }
  )
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Game Engine Service running on port ${PORT}`)
  setupEventHandlers().catch(console.error)
}) 