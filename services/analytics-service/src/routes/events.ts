import { Router, Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { db } from '../config/database'
import { publishEvent } from '../config/rabbitmq'

const router = Router()

interface AnalyticsEvent {
  game_id: string
  wallet_address?: string
  event_type: string
  event_data: any
  ip_address?: string
  user_agent?: string
  session_id?: string
}

router.post('/track', asyncHandler(async (req: Request, res: Response) => {
  const {
    game_id,
    wallet_address,
    event_type,
    event_data,
    session_id
  }: AnalyticsEvent = req.body

  if (!game_id || !event_type) {
    return res.status(400).json({
      error: 'Missing required fields: game_id, event_type'
    })
  }

  const ip_address = req.headers['x-forwarded-for'] || req.ip
  const user_agent = req.headers['user-agent']

  try {
    // Store event in database
    const result = await db.query(
      `INSERT INTO analytics_events (
        game_id, wallet_address, event_type, event_data,
        ip_address, user_agent, session_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id`,
      [
        game_id,
        wallet_address || null,
        event_type,
        JSON.stringify(event_data),
        ip_address,
        user_agent,
        session_id || null
      ]
    )

    // Publish for real-time processing
    await publishEvent('analytics.event_tracked', {
      eventId: result.rows[0].id,
      game_id,
      wallet_address,
      event_type,
      event_data,
      ip_address,
      user_agent,
      session_id
    })

    res.json({
      success: true,
      eventId: result.rows[0].id
    })

  } catch (error) {
    console.error('Error tracking event:', error)
    res.status(500).json({
      error: 'Failed to track event'
    })
  }
}))

router.post('/batch', asyncHandler(async (req: Request, res: Response) => {
  const { events } = req.body

  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({
      error: 'Events array is required and must not be empty'
    })
  }

  if (events.length > 100) {
    return res.status(400).json({
      error: 'Maximum 100 events per batch'
    })
  }

  const ip_address = req.headers['x-forwarded-for'] || req.ip
  const user_agent = req.headers['user-agent']

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    const eventIds = []
    for (const event of events) {
      const { game_id, wallet_address, event_type, event_data, session_id } = event

      if (!game_id || !event_type) {
        throw new Error('Each event must have game_id and event_type')
      }

      const result = await client.query(
        `INSERT INTO analytics_events (
          game_id, wallet_address, event_type, event_data,
          ip_address, user_agent, session_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id`,
        [
          game_id,
          wallet_address || null,
          event_type,
          JSON.stringify(event_data),
          ip_address,
          user_agent,
          session_id || null
        ]
      )

      eventIds.push(result.rows[0].id)
    }

    await client.query('COMMIT')

    // Publish batch event
    await publishEvent('analytics.batch_tracked', {
      eventIds,
      count: events.length,
      ip_address,
      user_agent
    })

    res.json({
      success: true,
      eventIds,
      count: events.length
    })

  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error tracking batch events:', error)
    res.status(500).json({
      error: 'Failed to track batch events'
    })
  } finally {
    client.release()
  }
}))

router.get('/summary/:game_id', asyncHandler(async (req: Request, res: Response) => {
  const { game_id } = req.params
  const { 
    start_date, 
    end_date, 
    event_type,
    wallet_address 
  } = req.query

  try {
    let query = `
      SELECT 
        event_type,
        COUNT(*) as count,
        COUNT(DISTINCT wallet_address) as unique_users,
        DATE(created_at) as date
      FROM analytics_events 
      WHERE game_id = $1
    `
    const params = [game_id]
    let paramIndex = 2

    if (start_date) {
      query += ` AND created_at >= $${paramIndex}`
      params.push(start_date as string)
      paramIndex++
    }

    if (end_date) {
      query += ` AND created_at <= $${paramIndex}`
      params.push(end_date as string)
      paramIndex++
    }

    if (event_type) {
      query += ` AND event_type = $${paramIndex}`
      params.push(event_type as string)
      paramIndex++
    }

    if (wallet_address) {
      query += ` AND wallet_address = $${paramIndex}`
      params.push(wallet_address as string)
      paramIndex++
    }

    query += ` GROUP BY event_type, DATE(created_at) ORDER BY date DESC, count DESC`

    const result = await db.query(query, params)

    res.json({
      game_id,
      summary: result.rows,
      filters: {
        start_date,
        end_date,
        event_type,
        wallet_address
      }
    })

  } catch (error) {
    console.error('Error getting analytics summary:', error)
    res.status(500).json({
      error: 'Failed to get analytics summary'
    })
  }
}))

export { router as eventsRouter } 