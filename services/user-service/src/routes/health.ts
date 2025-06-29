import { Router, Request, Response } from 'express'
import { db } from '../config/database'
import { getRedis } from '../config/redis'
import { getMessageQueue } from '../config/queue'
import { logger } from '../config/logger'

const router = Router()

interface HealthStatus {
  service: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  version: string
  timestamp: string
  uptime: number
  dependencies: {
    database: boolean
    redis: boolean
    messageQueue: boolean
  }
  details?: any
}

router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now()
  const healthStatus: HealthStatus = {
    service: 'user-service',
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dependencies: {
      database: false,
      redis: false,
      messageQueue: false,
    },
  }

  try {
    // Check database
    await db.query('SELECT 1')
    healthStatus.dependencies.database = true
  } catch (error) {
    healthStatus.dependencies.database = false
    healthStatus.status = 'degraded'
    logger.warn('Database health check failed:', error)
  }

  try {
    // Check Redis
    const redis = getRedis()
    await redis.ping()
    healthStatus.dependencies.redis = true
  } catch (error) {
    healthStatus.dependencies.redis = false
    healthStatus.status = 'degraded'
    logger.warn('Redis health check failed:', error)
  }

  try {
    // Check message queue
    const { channel } = getMessageQueue()
    await channel.checkQueue('user.notifications')
    healthStatus.dependencies.messageQueue = true
  } catch (error) {
    healthStatus.dependencies.messageQueue = false
    healthStatus.status = 'degraded'
    logger.warn('Message queue health check failed:', error)
  }

  // Determine overall status
  const allHealthy = Object.values(healthStatus.dependencies).every(Boolean)
  if (!allHealthy) {
    healthStatus.status = 'degraded'
  }

  const responseTime = Date.now() - startTime
  healthStatus.details = { responseTime: `${responseTime}ms` }

  const statusCode = healthStatus.status === 'healthy' ? 200 : 503
  res.status(statusCode).json(healthStatus)
})

router.get('/ready', async (req: Request, res: Response) => {
  try {
    await db.query('SELECT 1')
    res.status(200).json({ ready: true })
  } catch (error) {
    res.status(503).json({ ready: false, error: 'Database not ready' })
  }
})

router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ alive: true })
})

export { router as healthRouter } 