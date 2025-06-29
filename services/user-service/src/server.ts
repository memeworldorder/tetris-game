import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import dotenv from 'dotenv'

import { logger } from './config/logger'
import { db } from './config/database'
import { connectRedis } from './config/redis'
import { connectMessageQueue } from './config/queue'
import { errorHandler } from './middleware/errorHandler'
import { authRouter } from './routes/auth'
import { profileRouter } from './routes/profile'
import { walletRouter } from './routes/wallet'
import { healthRouter } from './routes/health'
import { livesRouter } from './routes/lives'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000process.env.PORT || 3000process.env.PORT || 3010

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}))
app.use(compression())
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Request ID middleware
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] as string || Math.random().toString(36).substr(2, 9)
  res.setHeader('x-request-id', req.id)
  next()
})

// Routes
app.use('/api/auth', authRouter)
app.use('/api/profile', profileRouter)
app.use('/api/wallet', walletRouter)
app.use('/api/user', livesRouter)
app.use('/health', healthRouter)

// Root route
app.get('/', (req, res) => {
  res.json({
    service: 'GameFi User Service',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      profile: '/api/profile',
      wallet: '/api/wallet',
      health: '/health'
    }
  })
})

// Error handling
app.use(errorHandler)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    service: 'user-service'
  })
})

// Graceful shutdown
const gracefulShutdown = async (server: any) => {
  logger.info('Received shutdown signal, closing server gracefully...')
  
  // Close server
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed')
    })
  }
  
  // Close database connections, message queues, etc.
  // await closeDatabase()
  // await closeRedis()
  // await closeMessageQueue()
  
  process.exit(0)
}

// Start server
const startServer = async () => {
  try {
    // Initialize connections
    await connectRedis()
    // await connectMessageQueue() // Temporarily disabled for testing
    
    const server = app.listen(PORT, () => {
      logger.info(`🎮 User Service running on port ${PORT}`)
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
      logger.info(`Health check: http://localhost:${PORT}/health`)
    })
    
    // Set up graceful shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown(server))
    process.on('SIGINT', () => gracefulShutdown(server))
    
    return server
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()

export default app

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      id: string
      user?: {
        id: string
        wallet_address: string
        username?: string
      }
    }
  }
} 