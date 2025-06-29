import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { GameMove, generateSeedHash, signScoreProof } from '@/lib/solana-utils'
import { 
  getGameConfig, 
  recordGamePlay, 
  trackAnalyticsEvent,
  useLife 
} from '@/lib/enhanced-database'
import { vrfTetrisEngine, type PieceGenerationResult } from '@/lib/vrf-game-engine'

// Extended game move interface for multi-game support
interface ExtendedGameMove extends GameMove {
  data?: any // Additional game-specific data
}

// Generic game validation interface
interface GameValidator {
  validateMoves(moves: ExtendedGameMove[], seed: string, config: any): ValidationResult
}

interface ValidationResult {
  score: number
  valid: boolean
  gameData?: any
  errors?: string[]
}

// Tetris-specific validator (keeping backward compatibility)
class TetrisValidator implements GameValidator {
  validateMoves(moves: GameMove[], seed: string, config: any): ValidationResult {
    return simulateTetrisGame(moves, seed)
  }
}

// Generic validator for simple games
class GenericValidator implements GameValidator {
  validateMoves(moves: GameMove[], seed: string, config: any): ValidationResult {
    // Basic validation for generic games
    if (!moves || moves.length === 0) {
      return { score: 0, valid: false, errors: ['No moves provided'] }
    }

    if (moves.length > (config?.max_moves || 10000)) {
      return { score: 0, valid: false, errors: ['Too many moves'] }
    }

    // Validate timestamp order
    for (let i = 1; i < moves.length; i++) {
      if (moves[i].timestamp <= moves[i - 1].timestamp) {
        return { score: 0, valid: false, errors: ['Invalid timestamp order'] }
      }
    }

    // Basic score calculation based on moves
    const baseScore = moves.length * (config?.score_per_move || 10)
    const seedMultiplier = seedToMultiplier(seed)
    const finalScore = Math.floor(baseScore * seedMultiplier)

    return {
      score: finalScore,
      valid: true,
      gameData: {
        total_moves: moves.length,
        seed_multiplier: seedMultiplier,
        base_score: baseScore
      }
    }
  }
}

// Puzzle game validator
class PuzzleValidator implements GameValidator {
  validateMoves(moves: ExtendedGameMove[], seed: string, config: any): ValidationResult {
    // Validate puzzle-specific logic
    let score = 0
    let valid = true
    const errors: string[] = []

    // Puzzle games typically have solution validation
    const maxSolutions = config?.max_solutions || 100
    let solutionsFound = 0

    for (const move of moves) {
      // Handle puzzle-specific move types
      if ((move as any).type === 'solve') {
        if (move.data?.correct) {
          solutionsFound++
          score += config?.points_per_solution || 100
        } else {
          // Penalty for wrong solutions
          score = Math.max(0, score - (config?.penalty_per_error || 10))
        }
      }
    }

    if (solutionsFound > maxSolutions) {
      valid = false
      errors.push('Too many solutions claimed')
    }

    return {
      score,
      valid,
      gameData: {
        solutions_found: solutionsFound,
        total_moves: moves.length
      },
      errors: errors.length > 0 ? errors : undefined
    }
  }
}

// Validator factory
function createValidator(gameId: string, gameConfig: any): GameValidator {
  switch (gameId) {
    case 'tetris':
      return new TetrisValidator()
    case 'puzzle':
      return new PuzzleValidator()
    default:
      // Use generic validator for unknown games
      return new GenericValidator()
  }
}

// Helper functions
function seedToMultiplier(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return 1 + (Math.abs(hash) % 100) / 1000 // 1.0 to 1.099 multiplier
}

// Tetris game simulation (legacy implementation)
interface TetrisState {
  board: number[][]
  score: number
  level: number
  lines: number
  currentPiece: {
    type: number
    x: number
    y: number
    rotation: number
  } | null
}

function createEmptyBoard(): number[][] {
  return Array(20).fill(null).map(() => Array(10).fill(0))
}

function simulateTetrisGame(moves: GameMove[], seed: string): ValidationResult {
  let state: TetrisState = {
    board: createEmptyBoard(),
    score: 0,
    level: 1,
    lines: 0,
    currentPiece: null
  }

  const rng = seedRandom(seed)
  
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i]
    
    if (!move.type || !move.timestamp) {
      return { score: 0, valid: false, errors: ['Invalid move format'] }
    }
    
    if (i > 0 && move.timestamp <= moves[i - 1].timestamp) {
      return { score: 0, valid: false, errors: ['Invalid timestamp order'] }
    }
    
    try {
      applyTetrisMove(state, move, rng)
    } catch (error) {
      return { score: 0, valid: false, errors: ['Invalid move sequence'] }
    }
  }
  
  return { 
    score: state.score, 
    valid: true,
    gameData: {
      level: state.level,
      lines: state.lines,
      total_moves: moves.length
    }
  }
}

function seedRandom(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  return function() {
    hash = (hash * 9301 + 49297) % 233280
    return hash / 233280
  }
}

function applyTetrisMove(state: TetrisState, move: GameMove, rng: () => number) {
  if (!state.currentPiece) {
    state.currentPiece = {
      type: Math.floor(rng() * 7),
      x: 4,
      y: 0,
      rotation: 0
    }
  }
  
  switch (move.type) {
    case 'move':
      if (move.direction === 'left' && state.currentPiece.x > 0) {
        state.currentPiece.x--
      } else if (move.direction === 'right' && state.currentPiece.x < 9) {
        state.currentPiece.x++
      } else if (move.direction === 'down') {
        state.currentPiece.y++
      }
      break
      
    case 'rotate':
      state.currentPiece.rotation = (state.currentPiece.rotation + 1) % 4
      break
      
    case 'drop':
      const linesCleared = Math.floor(rng() * 4)
      state.lines += linesCleared
      state.score += linesCleared * 100 * state.level
      state.level = Math.floor(state.lines / 10) + 1
      state.currentPiece = null
      break
  }
}

export async function POST(request: NextRequest) {
  try {
    const { wallet, moves, seed, gameId = 'tetris', vrfSessionId, vrfPieces } = await request.json()

    if (!wallet || !moves || !seed) {
      return NextResponse.json(
        { error: 'Missing required fields: wallet, moves, seed' },
        { status: 400 }
      )
    }

    if (!Array.isArray(moves)) {
      return NextResponse.json(
        { error: 'Moves must be an array' },
        { status: 400 }
      )
    }

    // Get game configuration
    const gameConfig = await getGameConfig(gameId)
    if (!gameConfig) {
      return NextResponse.json(
        { error: `Game '${gameId}' not found or inactive` },
        { status: 404 }
      )
    }

    // Check if validation is required for this game
    if (!gameConfig.scoring_rules.validation_required) {
      return NextResponse.json(
        { error: 'Score validation not enabled for this game' },
        { status: 400 }
      )
    }

    // Validate moves array length
    if (moves.length === 0) {
      return NextResponse.json(
        { error: 'No moves provided' },
        { status: 400 }
      )
    }

    const maxMoves = (gameConfig.scoring_rules as any).max_moves || 10000
    if (moves.length > maxMoves) {
      return NextResponse.json(
        { error: `Too many moves (max: ${maxMoves})` },
        { status: 400 }
      )
    }

    // VRF-based piece validation for enhanced security
    let vrfValidation = { valid: true, errors: [] as string[] }
    
    if (vrfSessionId && vrfPieces && Array.isArray(vrfPieces)) {
      console.log('🔍 Performing VRF piece validation...')
      
      try {
        // Verify VRF session exists
        const session = vrfTetrisEngine.getSession(vrfSessionId)
        if (!session) {
          vrfValidation.valid = false
          vrfValidation.errors.push('VRF session not found')
        } else if (session.walletAddress !== wallet) {
          vrfValidation.valid = false
          vrfValidation.errors.push('VRF session wallet mismatch')
        } else {
          // Validate each VRF piece
          for (const piece of vrfPieces) {
            const isValid = vrfTetrisEngine.verifyPieceGeneration(piece as PieceGenerationResult)
            if (!isValid) {
              vrfValidation.valid = false
              vrfValidation.errors.push(`Invalid VRF piece at index ${piece.pieceIndex}`)
            }
          }
          
          // Verify piece sequence integrity
          const sortedPieces = [...vrfPieces].sort((a, b) => a.pieceIndex - b.pieceIndex)
          for (let i = 0; i < sortedPieces.length - 1; i++) {
            if (sortedPieces[i + 1].pieceIndex !== sortedPieces[i].pieceIndex + 1) {
              vrfValidation.valid = false
              vrfValidation.errors.push('VRF piece sequence gap detected')
              break
            }
          }
        }
        
        console.log('🎲 VRF validation result:', {
          valid: vrfValidation.valid,
          pieces: vrfPieces.length,
          errors: vrfValidation.errors
        })
        
      } catch (error) {
        console.error('❌ VRF validation error:', error)
        vrfValidation.valid = false
        vrfValidation.errors.push('VRF validation failed')
      }
    } else if (gameId === 'tetris') {
      // For Tetris games, warn if VRF data is missing but allow legacy play
      console.warn('⚠️ Tetris game submitted without VRF data - legacy mode')
    }

    // Get the appropriate validator for this game
    const validator = createValidator(gameId, gameConfig.scoring_rules)
    
    // Server-side game validation
    const validationResult = validator.validateMoves(moves, seed, gameConfig.scoring_rules)
    
    // Check both VRF and move validation
    if (!vrfValidation.valid || !validationResult.valid) {
      const allErrors = [...(vrfValidation.errors || []), ...(validationResult.errors || [])]
      
      // Track failed validation attempt
      await trackAnalyticsEvent({
        game_id: gameId,
        wallet_address: wallet,
        event_type: 'validation_failed',
        event_data: {
          errors: allErrors,
          moves_count: moves.length,
          vrf_validation_failed: !vrfValidation.valid,
          move_validation_failed: !validationResult.valid,
          vrf_pieces_count: vrfPieces?.length || 0
        },
        ip_address: request.headers.get('x-forwarded-for') || undefined,
        user_agent: request.headers.get('user-agent') || undefined
      })

      return NextResponse.json(
        { 
          error: !vrfValidation.valid ? 'VRF validation failed' : 'Invalid move sequence detected',
          details: allErrors
        },
        { status: 400 }
      )
    }

    // Generate seed hash for verification
    const seedHash = generateSeedHash(seed)
    
    // Calculate moves hash for integrity
    const movesHash = generateSeedHash(JSON.stringify(moves))
    
    // Consume a life from the user
    try {
      await useLife(wallet)
    } catch (error) {
      return NextResponse.json(
        { error: 'No lives remaining' },
        { status: 403 }
      )
    }

    // Record the game play with enhanced data
    const playRecord = await recordGamePlay({
      game_id: gameId,
      wallet_address: wallet,
      score: validationResult.score,
      game_data: validationResult.gameData || {},
      moves_hash: movesHash,
      seed_hash: seedHash,
      merkle_proof: [], // Will be populated by leaderboard system
      validated: true
    })

    // Track successful game completion
    await trackAnalyticsEvent({
      game_id: gameId,
      wallet_address: wallet,
      event_type: 'game_completed',
      event_data: {
        score: validationResult.score,
        moves_count: moves.length,
        validation_passed: true,
        game_data: validationResult.gameData
      },
      ip_address: request.headers.get('x-forwarded-for') || undefined,
      user_agent: request.headers.get('user-agent') || undefined
    })

    // Get remaining lives (simplified - in real implementation would query current state)
    let remainingLives = 0
    try {
      const livesRecord = await supabase
        .from('lives')
        .select('*')
        .eq('wallet', wallet)
        .single()

      if (livesRecord.data) {
        remainingLives = livesRecord.data.free_today + 
                        livesRecord.data.bonus_today + 
                        livesRecord.data.paid_bank
      }
    } catch (error) {
      console.warn('Could not fetch remaining lives:', error)
    }

    return NextResponse.json({
      status: 'success',
      score: validationResult.score,
      playId: playRecord.id,
      seedHash,
      gameData: validationResult.gameData,
      remainingLives,
      gameId,
      vrfValidated: vrfValidation.valid,
      vrfPiecesValidated: vrfPieces?.length || 0
    })

  } catch (error) {
    console.error('Error in endRound:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 