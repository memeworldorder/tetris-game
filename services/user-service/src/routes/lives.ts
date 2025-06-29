import express from 'express'
import { db } from '../config/database'
import { logger } from '../config/logger'

const router = express.Router()

// GET /api/user/lives - Get user's lives data
router.get('/lives', async (req, res) => {
  try {
    const { wallet } = req.query

    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({
        error: 'Wallet address is required',
        service: 'user-service'
      })
    }

    logger.info(`Getting lives for wallet: ${wallet}`)

    // Get user data and lives from database
    const userResult = await db.query(
      'SELECT * FROM users WHERE wallet_address = $1',
      [wallet]
    )

    if (userResult.rows.length === 0) {
      // Create new user if doesn't exist
      const newUserResult = await db.query(
        `INSERT INTO users (wallet_address, created_at, updated_at, last_login) 
         VALUES ($1, NOW(), NOW(), NOW()) 
         RETURNING *`,
        [wallet]
      )
      
      // Create initial lives record
      const livesResult = await db.query(
        `INSERT INTO lives (wallet, free_today, bonus_today, paid_bank, created_at, updated_at)
         VALUES ($1, 3, 0, 0, NOW(), NOW())
         RETURNING *`,
        [wallet]
      )

      return res.json({
        user: newUserResult.rows[0],
        lives: livesResult.rows[0],
        message: 'New user created'
      })
    }

    // Get existing lives data
    const livesResult = await db.query(
      'SELECT * FROM lives WHERE wallet = $1',
      [wallet]
    )

    if (livesResult.rows.length === 0) {
      // Create lives record if missing
      const newLivesResult = await db.query(
        `INSERT INTO lives (wallet, free_today, bonus_today, paid_bank, created_at, updated_at)
         VALUES ($1, 3, 0, 0, NOW(), NOW())
         RETURNING *`,
        [wallet]
      )

      return res.json({
        user: userResult.rows[0],
        lives: newLivesResult.rows[0],
        message: 'Lives record created'
      })
    }

    return res.json({
      user: userResult.rows[0],
      lives: livesResult.rows[0]
    })

  } catch (error) {
    logger.error('Error getting user lives:', error)
    res.status(500).json({
      error: 'Internal server error',
      service: 'user-service'
    })
  }
})

// POST /api/user/use-life - Use a life
router.post('/use-life', async (req, res) => {
  try {
    const { wallet, lifeType = 'free' } = req.body

    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({
        error: 'Wallet address is required',
        service: 'user-service'
      })
    }

    logger.info(`Using life for wallet: ${wallet}, type: ${lifeType}`)

    // Get current lives
    const livesResult = await db.query(
      'SELECT * FROM lives WHERE wallet = $1',
      [wallet]
    )

    if (livesResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Lives record not found',
        service: 'user-service'
      })
    }

    const lives = livesResult.rows[0]
    let updateQuery: string
    let updateParams: any[]

    // Determine which life type to use and update accordingly
    if (lives.free_today > 0) {
      updateQuery = 'UPDATE lives SET free_today = free_today - 1, updated_at = NOW() WHERE wallet = $1 RETURNING *'
      updateParams = [wallet]
    } else if (lives.bonus_today > 0) {
      updateQuery = 'UPDATE lives SET bonus_today = bonus_today - 1, updated_at = NOW() WHERE wallet = $1 RETURNING *'
      updateParams = [wallet]
    } else if (lives.paid_bank > 0) {
      updateQuery = 'UPDATE lives SET paid_bank = paid_bank - 1, updated_at = NOW() WHERE wallet = $1 RETURNING *'
      updateParams = [wallet]
    } else {
      return res.status(400).json({
        error: 'No lives available',
        lives: lives,
        service: 'user-service'
      })
    }

    const updatedResult = await db.query(updateQuery, updateParams)

    return res.json({
      success: true,
      lives: updatedResult.rows[0],
      message: 'Life used successfully'
    })

  } catch (error) {
    logger.error('Error using life:', error)
    res.status(500).json({
      error: 'Internal server error',
      service: 'user-service'
    })
  }
})

export { router as livesRouter } 