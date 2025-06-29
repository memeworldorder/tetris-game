import { Router, Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { db } from '../config/database'
import axios from 'axios'

const router = Router()

// Get all games
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const gamesResult = await db.query(`
      SELECT 
        gc.*,
        COUNT(gp.id) as total_plays,
        COUNT(DISTINCT gp.wallet_address) as unique_players,
        AVG(gp.score) as avg_score,
        MAX(gp.score) as high_score
      FROM game_configs gc
      LEFT JOIN game_plays gp ON gc.game_id = gp.game_id
      GROUP BY gc.id, gc.game_id, gc.name, gc.active, gc.created_at, gc.updated_at
      ORDER BY gc.created_at DESC
    `)

    res.json({
      games: gamesResult.rows,
      total: gamesResult.rows.length
    })
  } catch (error) {
    console.error('Error getting games:', error)
    res.status(500).json({
      error: 'Failed to get games list'
    })
  }
}))

// Get specific game configuration
router.get('/:gameId', asyncHandler(async (req: Request, res: Response) => {
  const { gameId } = req.params

  try {
    const gameResult = await db.query(
      'SELECT * FROM game_configs WHERE game_id = $1',
      [gameId]
    )

    if (gameResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Game not found',
        gameId
      })
    }

    const game = gameResult.rows[0]

    // Get recent stats
    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as plays_last_24h,
        COUNT(DISTINCT wallet_address) as players_last_24h,
        AVG(score) as avg_score_last_24h
      FROM game_plays 
      WHERE game_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'
    `, [gameId])

    res.json({
      game,
      recentStats: statsResult.rows[0]
    })
  } catch (error) {
    console.error('Error getting game:', error)
    res.status(500).json({
      error: 'Failed to get game configuration'
    })
  }
}))

// Create new game
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { 
    gameId, 
    name, 
    description, 
    gameType, 
    livesConfig, 
    scoringRules, 
    paymentConfig,
    uiConfig 
  } = req.body

  if (!gameId || !name || !gameType) {
    return res.status(400).json({
      error: 'Missing required fields: gameId, name, gameType'
    })
  }

  try {
    // Check if game already exists
    const existingGame = await db.query(
      'SELECT id FROM game_configs WHERE game_id = $1',
      [gameId]
    )

    if (existingGame.rows.length > 0) {
      return res.status(409).json({
        error: 'Game with this ID already exists',
        gameId
      })
    }

    // Create new game
    const gameConfig = {
      name,
      description: description || '',
      game_type: gameType,
      lives_config: livesConfig || {
        free_lives_per_day: 5,
        paid_life_cap: 10,
        bonus_divisor: 1000,
        bonus_cap: 5
      },
      scoring_rules: scoringRules || {
        validation_required: true,
        max_moves: 10000,
        score_per_move: 10
      },
      payment_config: paymentConfig || {
        enabled: true,
        prices_usd: { cheap: 0.03, mid: 0.09, high: 0.27 },
        lives_per_tier: { cheap: 1, mid: 3, high: 10 }
      },
      ui_config: uiConfig || {
        theme: 'default',
        show_leaderboard: true,
        show_achievements: true
      }
    }

    const result = await db.query(
      `INSERT INTO game_configs (
        game_id, name, description, game_type, lives_config, 
        scoring_rules, payment_config, ui_config, active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
      RETURNING *`,
      [
        gameId,
        gameConfig.name,
        gameConfig.description,
        gameConfig.game_type,
        JSON.stringify(gameConfig.lives_config),
        JSON.stringify(gameConfig.scoring_rules),
        JSON.stringify(gameConfig.payment_config),
        JSON.stringify(gameConfig.ui_config)
      ]
    )

    // Notify services about new game
    try {
      await axios.post('http://game-engine:3011/admin/reload-games', { timeout: 10000 })
      await axios.post('http://rewards-service:3012/admin/reload-games', { timeout: 10000 })
    } catch (error) {
      console.warn('Failed to notify services about new game:', error)
    }

    res.status(201).json({
      success: true,
      game: result.rows[0],
      message: 'Game created successfully'
    })
  } catch (error) {
    console.error('Error creating game:', error)
    res.status(500).json({
      error: 'Failed to create game'
    })
  }
}))

// Update game configuration
router.put('/:gameId', asyncHandler(async (req: Request, res: Response) => {
  const { gameId } = req.params
  const { 
    name, 
    description, 
    livesConfig, 
    scoringRules, 
    paymentConfig, 
    uiConfig, 
    active 
  } = req.body

  try {
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`)
      values.push(name)
      paramIndex++
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`)
      values.push(description)
      paramIndex++
    }

    if (livesConfig !== undefined) {
      updates.push(`lives_config = $${paramIndex}`)
      values.push(JSON.stringify(livesConfig))
      paramIndex++
    }

    if (scoringRules !== undefined) {
      updates.push(`scoring_rules = $${paramIndex}`)
      values.push(JSON.stringify(scoringRules))
      paramIndex++
    }

    if (paymentConfig !== undefined) {
      updates.push(`payment_config = $${paramIndex}`)
      values.push(JSON.stringify(paymentConfig))
      paramIndex++
    }

    if (uiConfig !== undefined) {
      updates.push(`ui_config = $${paramIndex}`)
      values.push(JSON.stringify(uiConfig))
      paramIndex++
    }

    if (active !== undefined) {
      updates.push(`active = $${paramIndex}`)
      values.push(active)
      paramIndex++
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'No fields to update'
      })
    }

    updates.push(`updated_at = NOW()`)
    values.push(gameId)

    const result = await db.query(
      `UPDATE game_configs SET ${updates.join(', ')} WHERE game_id = $${paramIndex} RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Game not found',
        gameId
      })
    }

    // Notify services about game update
    try {
      await axios.post('http://game-engine:3011/admin/reload-games', { timeout: 10000 })
      await axios.post('http://rewards-service:3012/admin/reload-games', { timeout: 10000 })
    } catch (error) {
      console.warn('Failed to notify services about game update:', error)
    }

    res.json({
      success: true,
      game: result.rows[0],
      message: 'Game updated successfully'
    })
  } catch (error) {
    console.error('Error updating game:', error)
    res.status(500).json({
      error: 'Failed to update game'
    })
  }
}))

// Launch/activate game
router.post('/:gameId/launch', asyncHandler(async (req: Request, res: Response) => {
  const { gameId } = req.params
  const { announcement, scheduledAt } = req.body

  try {
    // Update game to active
    const result = await db.query(
      'UPDATE game_configs SET active = true, updated_at = NOW() WHERE game_id = $1 RETURNING *',
      [gameId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Game not found',
        gameId
      })
    }

    // Log the launch action
    await db.query(
      `INSERT INTO game_actions (game_id, action, status, details, created_at)
       VALUES ($1, 'launch', 'success', $2, NOW())`,
      [gameId, JSON.stringify({ announcement, scheduledAt, launchedBy: 'admin-dashboard' })]
    )

    // Send notifications
    try {
      // Notify all services
      await Promise.all([
        axios.post('http://game-engine:3011/admin/reload-games', { timeout: 10000 }),
        axios.post('http://rewards-service:3012/admin/reload-games', { timeout: 10000 }),
        axios.post('http://social-hub:3017/admin/announce-game', {
          gameId,
          action: 'launch',
          announcement
        }, { timeout: 10000 })
      ])
    } catch (error) {
      console.warn('Failed to notify services about game launch:', error)
    }

    res.json({
      success: true,
      game: result.rows[0],
      message: `Game ${gameId} launched successfully`
    })
  } catch (error) {
    console.error('Error launching game:', error)
    res.status(500).json({
      error: 'Failed to launch game'
    })
  }
}))

// Pause/deactivate game
router.post('/:gameId/pause', asyncHandler(async (req: Request, res: Response) => {
  const { gameId } = req.params
  const { reason, announcement } = req.body

  try {
    // Update game to inactive
    const result = await db.query(
      'UPDATE game_configs SET active = false, updated_at = NOW() WHERE game_id = $1 RETURNING *',
      [gameId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Game not found',
        gameId
      })
    }

    // Log the pause action
    await db.query(
      `INSERT INTO game_actions (game_id, action, status, details, created_at)
       VALUES ($1, 'pause', 'success', $2, NOW())`,
      [gameId, JSON.stringify({ reason, announcement, pausedBy: 'admin-dashboard' })]
    )

    // Notify services
    try {
      await Promise.all([
        axios.post('http://game-engine:3011/admin/reload-games', { timeout: 10000 }),
        axios.post('http://rewards-service:3012/admin/reload-games', { timeout: 10000 }),
        axios.post('http://social-hub:3017/admin/announce-game', {
          gameId,
          action: 'pause',
          reason,
          announcement
        }, { timeout: 10000 })
      ])
    } catch (error) {
      console.warn('Failed to notify services about game pause:', error)
    }

    res.json({
      success: true,
      game: result.rows[0],
      message: `Game ${gameId} paused successfully`
    })
  } catch (error) {
    console.error('Error pausing game:', error)
    res.status(500).json({
      error: 'Failed to pause game'
    })
  }
}))

// Get game analytics
router.get('/:gameId/analytics', asyncHandler(async (req: Request, res: Response) => {
  const { gameId } = req.params
  const { days = 7 } = req.query

  try {
    // Get analytics from analytics service
    const analyticsResponse = await axios.get(
      `http://analytics-service:3014/api/events/summary/${gameId}`,
      {
        params: {
          start_date: new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000).toISOString()
        },
        timeout: 10000
      }
    )

    res.json({
      gameId,
      period: `${days} days`,
      analytics: analyticsResponse.data
    })
  } catch (error) {
    console.error('Error getting game analytics:', error)
    res.status(500).json({
      error: 'Failed to get game analytics'
    })
  }
}))

export { router as gamesRouter } 