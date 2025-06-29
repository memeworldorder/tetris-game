const amqp = require('amqplib')
import { logger } from './logger'

let connection: any = null
let channel: any = null

export const connectMessageQueue = async (): Promise<{ connection: any; channel: any }> => {
  if (connection && channel) {
    return { connection, channel }
  }

  try {
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672'
    
    connection = await amqp.connect(rabbitmqUrl)
    channel = await connection.createChannel()

    connection.on('error', (err: any) => {
      logger.error('RabbitMQ Connection Error:', err)
    })

    connection.on('close', () => {
      logger.warn('RabbitMQ Connection Closed')
    })

    // Declare exchanges and queues
    await channel.assertExchange('user.events', 'topic', { durable: true })
    await channel.assertQueue('user.notifications', { durable: true })
    await channel.assertQueue('user.analytics', { durable: true })

    logger.info('✅ Message Queue connected successfully')
    return { connection, channel }
  } catch (error) {
    logger.error('❌ Message Queue connection failed:', error)
    throw error
  }
}

export const getMessageQueue = (): { connection: any; channel: any } => {
  if (!connection || !channel) {
    throw new Error('Message Queue not initialized. Call connectMessageQueue() first.')
  }
  return { connection, channel }
}

export const closeMessageQueue = async (): Promise<void> => {
  if (channel) {
    await channel.close()
    channel = null
  }
  if (connection) {
    await connection.close()
    connection = null
  }
  logger.info('Message Queue connection closed')
}

export const publishMessage = async (exchange: string, routingKey: string, message: any): Promise<void> => {
  const { channel } = getMessageQueue()
  const messageBuffer = Buffer.from(JSON.stringify(message))
  
  channel.publish(exchange, routingKey, messageBuffer, {
    persistent: true,
    timestamp: Date.now(),
  })
  
  logger.debug(`Message published to ${exchange}:${routingKey}`)
} 