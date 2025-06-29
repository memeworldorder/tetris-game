import { createClient } from 'redis'

const redisUrl = process.env.REDIS_URL || 'redis://redis:6379'

export const redis = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries: number) => {
      if (retries > 10) {
        console.error('❌ Too many Redis reconnection attempts')
        return new Error('Too many retries')
      }
      return Math.min(retries * 100, 3000)
    }
  }
})

redis.on('error', (err: Error) => {
  console.error('Redis Client Error:', err)
})

redis.on('connect', () => {
  console.log('✅ Connected to Redis')
})

// Connect to Redis
redis.connect().catch((err: Error) => {
  console.error('❌ Failed to connect to Redis:', err)
  process.exit(1)
}) 