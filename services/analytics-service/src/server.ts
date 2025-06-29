import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cron from 'node-cron'
import { errorHandler } from './middleware/errorHandler'
import { eventsRouter } from './routes/events'
import { subscribeToQueue } from './config/rabbitmq'
import { db } from './config/database'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000process.env.PORT || 3000process.env.PORT || 3014

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({
    status: 'healthy',
    service: 'analytics-service',
    version: '1.0.0',
    uptime: process.uptime()
  })
})

// Routes
app.use('/api/events', eventsRouter)

// Admin routes for analytics dashboards
app.get('/api/dashboard/overview', async (req: express.Request, res: express.Response) => {
  try {
    // Get overall stats
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT game_id) as total_games,
        COUNT(DISTINCT wallet_address) as total_users,
        COUNT(DISTINCT DATE(created_at)) as active_days
      FROM analytics_events 
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `)

    // Get top games by activity
    const topGames = await db.query(`
      SELECT 
        game_id,
        COUNT(*) as event_count,
        COUNT(DISTINCT wallet_address) as unique_users
      FROM analytics_events 
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY game_id 
      ORDER BY event_count DESC 
      LIMIT 10
    `)

    // Get recent activity
    const recentActivity = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as events,
        COUNT(DISTINCT wallet_address) as users
      FROM analytics_events 
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at) 
      ORDER BY date DESC
    `)

    res.json({
      overview: stats.rows[0],
      topGames: topGames.rows,
      recentActivity: recentActivity.rows
    })
  } catch (error) {
    console.error('Error getting dashboard overview:', error)
    res.status(500).json({ error: 'Failed to get dashboard data' })
  }
})

// Error handling
app.use(errorHandler)

// Schedule analytics aggregation jobs
cron.schedule('0 1 * * *', async () => {
  console.log('🔄 Running daily analytics aggregation...')
  try {
    // Aggregate daily stats
    await db.query(`
      INSERT INTO daily_analytics (date, game_id, total_events, unique_users, created_at)
      SELECT 
        DATE(created_at) as date,
        game_id,
        COUNT(*) as total_events,
        COUNT(DISTINCT wallet_address) as unique_users,
        NOW()
      FROM analytics_events 
      WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'
      GROUP BY DATE(created_at), game_id
      ON CONFLICT (date, game_id) DO UPDATE SET
        total_events = EXCLUDED.total_events,
        unique_users = EXCLUDED.unique_users,
        updated_at = NOW()
    `)

    console.log('✅ Daily analytics aggregation completed')
  } catch (error) {
    console.error('❌ Error during daily aggregation:', error)
  }
})

// Subscribe to analytics-related events
async function setupEventHandlers() {
  // Listen for all game events for analytics processing
  await subscribeToQueue(
    'analytics_all_events',
    '*.*',
    async (data) => {
      // Process events for real-time analytics
      console.log('Processing analytics event:', data)
      
      // You could implement real-time aggregations here
      // For example, update leaderboards, calculate streaks, etc.
    }
  )

  // Listen specifically for user events
  await subscribeToQueue(
    'analytics_user_events',
    'user.*',
    async (data) => {
      console.log('Processing user analytics:', data)
      // Track user behavior patterns, session lengths, etc.
    }
  )

  // Listen for game completion events for game analytics
  await subscribeToQueue(
    'analytics_game_events',
    'game.*',
    async (data) => {
      console.log('Processing game analytics:', data)
      // Track game performance, difficulty analysis, etc.
    }
  )
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Analytics Service running on port ${PORT}`)
  setupEventHandlers().catch(console.error)
}) 