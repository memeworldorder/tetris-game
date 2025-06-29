import { Router, Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { db } from '../config/database'
import axios from 'axios'

const router = Router()

// Service registry with endpoints
const SERVICES = {
  'api-gateway': { url: process.env.API_GATEWAY_URL || 'http://api-gateway:3000', port: 3000 },
  'user-service': { url: process.env.USER_SERVICE_URL || 'http://user-service:3010', port: 3010 },
  'game-engine': { url: process.env.GAME_ENGINE_URL || 'http://game-engine:3011', port: 3011 },
  'rewards-service': { url: process.env.REWARDS_SERVICE_URL || 'http://rewards-service:3012', port: 3012 },
  'payment-service': { url: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3013', port: 3013 },
  'analytics-service': { url: process.env.ANALYTICS_SERVICE_URL || 'http://analytics-service:3014', port: 3014 },
  'telegram-bot': { url: process.env.TELEGRAM_BOT_URL || 'http://telegram-bot:3015', port: 3015 },
  'twitter-bot': { url: process.env.TWITTER_BOT_URL || 'http://twitter-bot:3016', port: 3016 },
  'social-hub': { url: process.env.SOCIAL_HUB_URL || 'http://social-hub:3017', port: 3017 },
}

// Get all service statuses
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  const serviceStatuses = await Promise.allSettled(
    Object.entries(SERVICES).map(async ([name, config]) => {
      try {
        const response = await axios.get(`${config.url}/health`, { timeout: 5000 })
        return {
          name,
          status: 'healthy',
          ...config,
          details: response.data,
          lastChecked: new Date().toISOString()
        }
      } catch (error) {
        return {
          name,
          status: 'unhealthy',
          ...config,
          error: (error as Error).message,
          lastChecked: new Date().toISOString()
        }
      }
    })
  )

  const results = serviceStatuses.map(result => 
    result.status === 'fulfilled' ? result.value : result.reason
  )

  const healthyCount = results.filter(s => s.status === 'healthy').length
  const totalCount = results.length

  res.json({
    overall: {
      healthy: healthyCount,
      total: totalCount,
      status: healthyCount === totalCount ? 'all_healthy' : 'degraded'
    },
    services: results
  })
}))

// Get service configuration
router.get('/config/:serviceName', asyncHandler(async (req: Request, res: Response) => {
  const { serviceName } = req.params

  try {
    const configResult = await db.query(
      'SELECT * FROM service_configs WHERE service_name = $1',
      [serviceName]
    )

    if (configResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Service configuration not found',
        serviceName
      })
    }

    res.json({
      serviceName,
      config: configResult.rows[0].config_data,
      lastUpdated: configResult.rows[0].updated_at,
      version: configResult.rows[0].version
    })
  } catch (error) {
    console.error('Error getting service config:', error)
    res.status(500).json({
      error: 'Failed to get service configuration'
    })
  }
}))

// Update service configuration
router.put('/config/:serviceName', asyncHandler(async (req: Request, res: Response) => {
  const { serviceName } = req.params
  const { config, description } = req.body

  if (!config) {
    return res.status(400).json({
      error: 'Configuration data is required'
    })
  }

  try {
    const result = await db.query(
      `INSERT INTO service_configs (service_name, config_data, description, version, updated_at)
       VALUES ($1, $2, $3, 1, NOW())
       ON CONFLICT (service_name) 
       DO UPDATE SET 
         config_data = $2,
         description = $3,
         version = service_configs.version + 1,
         updated_at = NOW()
       RETURNING *`,
      [serviceName, JSON.stringify(config), description || 'Configuration updated via admin dashboard']
    )

    // Notify the service about config change
    if (SERVICES[serviceName as keyof typeof SERVICES]) {
      try {
        await axios.post(`${SERVICES[serviceName as keyof typeof SERVICES].url}/admin/reload-config`, {
          config,
          version: result.rows[0].version
        }, { timeout: 10000 })
      } catch (error) {
        console.warn(`Failed to notify ${serviceName} about config change:`, error)
      }
    }

    res.json({
      success: true,
      serviceName,
      version: result.rows[0].version,
      message: 'Configuration updated successfully'
    })
  } catch (error) {
    console.error('Error updating service config:', error)
    res.status(500).json({
      error: 'Failed to update service configuration'
    })
  }
}))

// Restart service
router.post('/restart/:serviceName', asyncHandler(async (req: Request, res: Response) => {
  const { serviceName } = req.params

  if (!SERVICES[serviceName as keyof typeof SERVICES]) {
    return res.status(404).json({
      error: 'Service not found',
      availableServices: Object.keys(SERVICES)
    })
  }

  try {
    // Send restart command to service
    const serviceUrl = SERVICES[serviceName as keyof typeof SERVICES].url
    await axios.post(`${serviceUrl}/admin/restart`, {
      requestedBy: 'admin-dashboard',
      timestamp: new Date().toISOString()
    }, { timeout: 15000 })

    // Log the restart action
    await db.query(
      `INSERT INTO service_actions (service_name, action, status, details, created_at)
       VALUES ($1, 'restart', 'requested', $2, NOW())`,
      [serviceName, JSON.stringify({ requestedBy: 'admin-dashboard' })]
    )

    res.json({
      success: true,
      serviceName,
      message: 'Restart command sent successfully'
    })
  } catch (error) {
    console.error(`Error restarting ${serviceName}:`, error)
    
    // Log the failed restart
    await db.query(
      `INSERT INTO service_actions (service_name, action, status, details, created_at)
       VALUES ($1, 'restart', 'failed', $2, NOW())`,
      [serviceName, JSON.stringify({ error: (error as Error).message })]
    )

    res.status(500).json({
      error: 'Failed to restart service',
      serviceName,
      details: (error as Error).message
    })
  }
}))

// Get service logs
router.get('/logs/:serviceName', asyncHandler(async (req: Request, res: Response) => {
  const { serviceName } = req.params
  const { lines = 100, level = 'all' } = req.query

  try {
    if (!SERVICES[serviceName as keyof typeof SERVICES]) {
      return res.status(404).json({
        error: 'Service not found'
      })
    }

    const serviceUrl = SERVICES[serviceName as keyof typeof SERVICES].url
    const response = await axios.get(`${serviceUrl}/admin/logs`, {
      params: { lines, level },
      timeout: 10000
    })

    res.json({
      serviceName,
      logs: response.data.logs,
      lines: response.data.lines,
      level,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error(`Error getting logs for ${serviceName}:`, error)
    res.status(500).json({
      error: 'Failed to get service logs',
      serviceName
    })
  }
}))

// Get service metrics
router.get('/metrics/:serviceName', asyncHandler(async (req: Request, res: Response) => {
  const { serviceName } = req.params

  try {
    if (!SERVICES[serviceName as keyof typeof SERVICES]) {
      return res.status(404).json({
        error: 'Service not found'
      })
    }

    const serviceUrl = SERVICES[serviceName as keyof typeof SERVICES].url
    const response = await axios.get(`${serviceUrl}/admin/metrics`, { timeout: 10000 })

    res.json({
      serviceName,
      metrics: response.data,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error(`Error getting metrics for ${serviceName}:`, error)
    res.status(500).json({
      error: 'Failed to get service metrics',
      serviceName
    })
  }
}))

export { router as servicesRouter } 