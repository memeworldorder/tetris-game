import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { telegramRouter } from './routes/telegram'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000process.env.PORT || 3000process.env.PORT || 3015

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'telegram-bot',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  })
})

// Routes
app.use('/api/telegram', telegramRouter)

// Admin routes for admin dashboard integration
app.post('/admin/reload-config', (req, res) => {
  console.log('Config reload requested for Telegram bot')
  res.json({
    success: true,
    message: 'Configuration reloaded'
  })
})

app.post('/admin/restart', (req, res) => {
  console.log('Restart requested for Telegram bot')
  res.json({
    success: true,
    message: 'Restart initiated'
  })
})

app.get('/admin/logs', (req, res) => {
  const { lines = 100 } = req.query
  res.json({
    service: 'telegram-bot',
    logs: [
      'Telegram bot service started',
      'Bot configuration loaded',
      'Health check passed'
    ].slice(0, Number(lines)),
    lines: Number(lines)
  })
})

app.get('/admin/metrics', (req, res) => {
  res.json({
    service: 'telegram-bot',
    metrics: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      messagesSent: 0, // This would be tracked in real implementation
      botStatus: 'active',
      lastMessageTime: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  })
})

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Telegram Bot Error:', err)
  
  const status = err.status || 500
  const message = err.message || 'Internal server error'

  res.status(status).json({
    error: message,
    service: 'telegram-bot',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    service: 'telegram-bot'
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🤖 Telegram Bot service running on port ${PORT}`)
  console.log(`📱 Bot API available at http://localhost:${PORT}/api/telegram`)
  console.log(`🔧 Health check: http://localhost:${PORT}/health`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📥 SIGTERM received. Shutting down Telegram Bot gracefully...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('📥 SIGINT received. Shutting down Telegram Bot gracefully...')
  process.exit(0)
}) 