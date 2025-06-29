import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { errorHandler } from './middleware/errorHandler'
import { servicesRouter } from './routes/services'
import { gamesRouter } from './routes/games'

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
    service: 'admin-dashboard',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  })
})

// System overview endpoint
app.get('/api/overview', async (req, res) => {
  try {
    // Get basic system stats
    const stats = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }

    res.json(stats)
  } catch (error) {
    console.error('Error getting overview:', error)
    res.status(500).json({
      error: 'Failed to get system overview'
    })
  }
})

// Routes
app.use('/api/services', servicesRouter)
app.use('/api/games', gamesRouter)

// Dashboard routes
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    // This would aggregate data from all services
    const summary = {
      services: {
        total: 7,
        healthy: 0, // Will be calculated from actual health checks
        degraded: 0
      },
      games: {
        total: 0,
        active: 0,
        paused: 0
      },
      players: {
        total: 0,
        active_24h: 0,
        new_24h: 0
      },
      revenue: {
        total_24h: 0,
        total_7d: 0,
        total_30d: 0
      }
    }

    res.json(summary)
  } catch (error) {
    console.error('Error getting dashboard summary:', error)
    res.status(500).json({
      error: 'Failed to get dashboard summary'
    })
  }
})

// Service configuration endpoints
app.get('/api/config/global', async (req, res) => {
  try {
    // Return global configuration that affects all services
    const globalConfig = {
      maintenance_mode: false,
      rate_limits: {
        api_calls_per_minute: 1000,
        game_sessions_per_hour: 50
      },
      feature_flags: {
        new_player_bonus: true,
        social_features: true,
        payment_processing: true
      },
      blockchain: {
        network: 'mainnet-beta', // Production mainnet
        confirmation_blocks: 1,
        max_retry_attempts: 3
      }
    }

    res.json(globalConfig)
  } catch (error) {
    console.error('Error getting global config:', error)
    res.status(500).json({
      error: 'Failed to get global configuration'
    })
  }
})

app.put('/api/config/global', async (req, res) => {
  try {
    const { config } = req.body
    
    if (!config) {
      return res.status(400).json({
        error: 'Configuration data is required'
      })
    }

    // Store global config and notify all services
    // This would be stored in database and sent to all services

    res.json({
      success: true,
      message: 'Global configuration updated successfully'
    })
  } catch (error) {
    console.error('Error updating global config:', error)
    res.status(500).json({
      error: 'Failed to update global configuration'
    })
  }
})

// Admin actions
app.post('/api/admin/maintenance', async (req, res) => {
  try {
    const { enabled, message, duration } = req.body

    // Enable/disable maintenance mode across all services
    const maintenanceConfig = {
      enabled,
      message: message || 'System maintenance in progress',
      duration: duration || null,
      startTime: enabled ? new Date().toISOString() : null
    }

    // This would notify all services about maintenance mode
    res.json({
      success: true,
      maintenanceMode: maintenanceConfig,
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`
    })
  } catch (error) {
    console.error('Error setting maintenance mode:', error)
    res.status(500).json({
      error: 'Failed to set maintenance mode'
    })
  }
})

// Bulk service operations
app.post('/api/admin/restart-all', async (req, res) => {
  try {
    const { excludeServices = [] } = req.body

    // This would restart all services except excluded ones
    res.json({
      success: true,
      message: 'Restart command sent to all services',
      excludedServices: excludeServices
    })
  } catch (error) {
    console.error('Error restarting all services:', error)
    res.status(500).json({
      error: 'Failed to restart all services'
    })
  }
})

// Analytics and monitoring
app.get('/api/analytics/platform', async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query

    // This would aggregate analytics from all services
    const analytics = {
      timeframe,
      metrics: {
        total_requests: 0,
        error_rate: 0,
        avg_response_time: 0,
        active_users: 0
      },
      services: {},
      games: {}
    }

    res.json(analytics)
  } catch (error) {
    console.error('Error getting platform analytics:', error)
    res.status(500).json({
      error: 'Failed to get platform analytics'
    })
  }
})

// Error handling middleware
app.use(errorHandler)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Admin Dashboard service running on port ${PORT}`)
  console.log(`📊 Dashboard available at http://localhost:${PORT}`)
  console.log(`🔧 Health check: http://localhost:${PORT}/health`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📥 SIGTERM received. Shutting down gracefully...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('📥 SIGINT received. Shutting down gracefully...')
  process.exit(0)
}) 