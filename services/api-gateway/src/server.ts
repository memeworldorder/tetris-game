import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createProxyMiddleware } from 'http-proxy-middleware'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000process.env.PORT || 3000process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())

// Service URLs
const services = {
  user: process.env.USER_SERVICE_URL || 'http://localhost:3010',
  gameEngine: process.env.GAME_ENGINE_URL || 'http://localhost:3011',
  rewards: process.env.REWARDS_SERVICE_URL || 'http://localhost:3012',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3013',
  analytics: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3014',
  social: process.env.SOCIAL_HUB_URL || 'http://localhost:3017'
}

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    version: '1.0.0',
    uptime: process.uptime()
  })
})

// Create proxy middleware for each service
const createProxy = (target: string) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    onError: (err: any, req: any, res: any) => {
      console.error('Proxy error:', err)
      res.status(503).json({
        error: 'Service temporarily unavailable',
        service: target
      })
    }
  })
}

// Route mappings
app.use('/api/user', createProxy(services.user))
app.use('/api/auth', createProxy(services.user))
app.use('/api/wallet', createProxy(services.user))

// Game routes
app.use('/api/endRound', createProxy(services.gameEngine))
app.use('/api/game', createProxy(services.gameEngine))

// Rewards routes
app.use('/api/claimDaily', createProxy(services.rewards))
app.use('/api/rewards', createProxy(services.rewards))

// Payment routes
app.use('/api/buyLife', createProxy(services.payment))
app.use('/api/payments', createProxy(services.payment))
app.use('/api/webhooks', createProxy(services.payment))

// Analytics routes
app.use('/api/analytics', createProxy(services.analytics))
app.use('/api/admin/analytics', createProxy(services.analytics))

// Social routes
app.use('/api/social', createProxy(services.social))
app.use('/api/community', createProxy(services.social))

// Default 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  })
})

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Gateway error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`)
  console.log('Service endpoints:')
  Object.entries(services).forEach(([name, url]) => {
    console.log(`  - ${name}: ${url}`)
  })
}) 