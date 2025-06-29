import { Router, Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { db } from '../config/database'
import { publishEvent } from '../config/rabbitmq'
import { GameValidator } from '../validators/game-validator'
import { TetrisValidator } from '../validators/tetris-validator'
import { GenericValidator } from '../validators/generic-validator'
import crypto from 'crypto'

const router = Router()

// Validator factory
function createValidator(gameId: string, gameConfig: any): GameValidator {
  switch (gameId) {
    case 'tetris':
      return new TetrisValidator()
    default:
      return new GenericValidator()
  }
}

// Generate hash for seed/moves
function generateHash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

router.post('/end-round', asyncHandler(async (req: Request, res: Response) => {
  const { wallet, moves, seed, gameId = 'tetris', vrfSessionId, vrfPieces } = req.body

  if (!wallet || !moves || !seed) {
    return res.status(400).json({ 
      error: 'Missing required fields: wallet, moves, seed' 
    })
  }

  if (!Array.isArray(moves)) {
    return res.status(400).json({ error: 'Moves must be an array' })
  }

  // Get game configuration
  const gameConfig = await db.query(
    'SELECT * FROM game_configs WHERE game_id = $1 AND active = true',
    [gameId]
  )

  if (!gameConfig.rows.length) {
    return res.status(404).json({ 
      error: `Game '${gameId}' not found or inactive` 
    })
  }

  const config = gameConfig.rows[0]

  // Check if validation is required
  if (!config.scoring_rules?.validation_required) {
    return res.status(400).json({ 
      error: 'Score validation not enabled for this game' 
    })
  }

  // Validate moves array length
  if (moves.length === 0) {
    return res.status(400).json({ error: 'No moves provided' })
  }

  const maxMoves = config.scoring_rules?.max_moves || 10000
  if (moves.length > maxMoves) {
    return res.status(400).json({ 
      error: `Too many moves (max: ${maxMoves})` 
    })
  }

  // Get the appropriate validator
  const validator = createValidator(gameId, config.scoring_rules)
  
  // Validate the game
  const validationResult = validator.validateMoves(moves, seed, config.scoring_rules)
  
  if (!validationResult.valid) {
    // Track failed validation
    await publishEvent('game.validation_failed', {
      gameId,
      wallet,
      errors: validationResult.errors,
      movesCount: moves.length
    })

    return res.status(400).json({ 
      error: 'Invalid move sequence detected',
      details: validationResult.errors
    })
  }

  // Generate hashes for verification
  const seedHash = generateHash(seed)
  const movesHash = generateHash(JSON.stringify(moves))

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    // Check and consume a life
    const livesResult = await client.query(
      'SELECT * FROM lives WHERE wallet = $1',
      [wallet]
    )

    if (!livesResult.rows.length) {
      throw new Error('No lives record found')
    }

    const lives = livesResult.rows[0]
    const totalLives = lives.free_today + lives.bonus_today + lives.paid_bank

    if (totalLives <= 0) {
      throw new Error('No lives remaining')
    }

    // Consume a life (priority: free > bonus > paid)
    if (lives.free_today > 0) {
      await client.query(
        'UPDATE lives SET free_today = free_today - 1 WHERE wallet = $1',
        [wallet]
      )
    } else if (lives.bonus_today > 0) {
      await client.query(
        'UPDATE lives SET bonus_today = bonus_today - 1 WHERE wallet = $1',
        [wallet]
      )
    } else {
      await client.query(
        'UPDATE lives SET paid_bank = paid_bank - 1 WHERE wallet = $1',
        [wallet]
      )
    }

    // Record the game play
    const gamePlayResult = await client.query(
      `INSERT INTO game_plays (game_id, wallet_address, score, game_data, moves_hash, seed_hash, validated)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        gameId,
        wallet,
        validationResult.score,
        JSON.stringify(validationResult.gameData || {}),
        movesHash,
        seedHash,
        true
      ]
    )

    // Update user statistics
    await client.query(
      `INSERT INTO user_stats (wallet, game_id, games_played, high_score, total_score)
       VALUES ($1, $2, 1, $3, $3)
       ON CONFLICT (wallet, game_id) 
       DO UPDATE SET 
         games_played = user_stats.games_played + 1,
         high_score = GREATEST(user_stats.high_score, $3),
         total_score = user_stats.total_score + $3,
         last_played = NOW()`,
      [wallet, gameId, validationResult.score]
    )

    await client.query('COMMIT')

    const playId = gamePlayResult.rows[0].id
    const remainingLives = totalLives - 1

    // Publish game completion event
    await publishEvent('game.completed', {
      gameId,
      wallet,
      playId,
      score: validationResult.score,
      gameData: validationResult.gameData,
      remainingLives
    })

    res.json({
      status: 'success',
      score: validationResult.score,
      playId,
      seedHash,
      gameData: validationResult.gameData,
      remainingLives,
      gameId
    })

  } catch (error) {
    await client.query('ROLLBACK')
    
    if ((error as Error).message === 'No lives remaining') {
      return res.status(403).json({ error: 'No lives remaining' })
    }
    
    throw error
  } finally {
    client.release()
  }
}))

export { router as endRoundRouter } 