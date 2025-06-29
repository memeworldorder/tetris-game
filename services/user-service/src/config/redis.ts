import { createClient, RedisClientType } from 'redis'
import { logger } from './logger'

let redisClient: RedisClientType | null = null

export const connectRedis = async (): Promise<RedisClientType> => {
  if (redisClient) {
    return redisClient
  }

  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 10000,
      },
    })

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err)
    })

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected successfully')
    })

    redisClient.on('ready', () => {
      logger.info('✅ Redis ready for commands')
    })

    redisClient.on('end', () => {
      logger.info('Redis connection ended')
    })

    await redisClient.connect()
    return redisClient
  } catch (error) {
    logger.error('❌ Redis connection failed:', error)
    throw error
  }
}

export const getRedis = (): RedisClientType => {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call connectRedis() first.')
  }
  return redisClient
}

export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
    logger.info('Redis connection closed')
  }
} 