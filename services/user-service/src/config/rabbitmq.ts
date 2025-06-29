const amqp = require('amqplib')

let connection: any = null
let channel: any = null

const RABBITMQ_URL = process.env.RABBITMQ_URL || 
  'amqp://gamefi:gamefi_queue@rabbitmq:5672/gamefi_vhost'

export async function connectRabbitMQ(): Promise<void> {
  try {
    connection = await amqp.connect(RABBITMQ_URL)
    if (connection) {
      channel = await connection.createChannel()
      
      if (channel) {
        // Set up exchange
        await channel.assertExchange('gamefi_events', 'topic', { durable: true })
        
        console.log('✅ Connected to RabbitMQ')
        
        // Handle connection events
        connection.on('error', (err: Error) => {
          console.error('RabbitMQ connection error:', err)
          setTimeout(connectRabbitMQ, 5000)
        })
        
        connection.on('close', () => {
          console.log('RabbitMQ connection closed, reconnecting...')
          setTimeout(connectRabbitMQ, 5000)
        })
      }
    }
  } catch (error) {
    console.error('❌ Failed to connect to RabbitMQ:', error)
    setTimeout(connectRabbitMQ, 5000)
  }
}

export async function publishEvent(routingKey: string, data: any): Promise<void> {
  if (!channel) {
    console.error('RabbitMQ channel not available')
    return
  }
  
  try {
    const message = Buffer.from(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'user-service',
      ...data
    }))
    
    channel.publish('gamefi_events', routingKey, message, {
      persistent: true,
      contentType: 'application/json'
    })
  } catch (error) {
    console.error('Failed to publish event:', error)
  }
}

export async function subscribeToQueue(
  queueName: string, 
  routingKey: string,
  handler: (msg: any) => Promise<void>
): Promise<void> {
  if (!channel) {
    console.error('RabbitMQ channel not available')
    return
  }
  
  try {
    await channel.assertQueue(queueName, { durable: true })
    await channel.bindQueue(queueName, 'gamefi_events', routingKey)
    
    await channel.consume(queueName, async (msg: any) => {
      if (msg && channel) {
        try {
          const data = JSON.parse(msg.content.toString())
          await handler(data)
          channel.ack(msg)
        } catch (error) {
          console.error('Error processing message:', error)
          channel.nack(msg, false, false)
        }
      }
    })
  } catch (error) {
    console.error('Failed to subscribe to queue:', error)
  }
}

// Initialize connection
connectRabbitMQ() 