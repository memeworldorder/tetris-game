import { BaseGameValidator, GameMove, ValidationResult } from './game-validator'

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

export class TetrisValidator extends BaseGameValidator {
  validateMoves(moves: GameMove[], seed: string, config: any): ValidationResult {
    // Validate basic requirements
    if (!moves || moves.length === 0) {
      return { score: 0, valid: false, errors: ['No moves provided'] }
    }

    // Validate timestamps
    const timestampErrors = this.validateTimestamps(moves)
    if (timestampErrors.length > 0) {
      return { score: 0, valid: false, errors: timestampErrors }
    }

    // Validate move count
    const maxMoves = config?.max_moves || 10000
    if (moves.length > maxMoves) {
      return { score: 0, valid: false, errors: [`Too many moves (max: ${maxMoves})`] }
    }

    // Simulate the game
    try {
      const state = this.simulateGame(moves, seed)
      return { 
        score: state.score, 
        valid: true,
        gameData: {
          level: state.level,
          lines: state.lines,
          total_moves: moves.length
        }
      }
    } catch (error) {
      return { 
        score: 0, 
        valid: false, 
        errors: ['Invalid move sequence: ' + (error as Error).message] 
      }
    }
  }

  private simulateGame(moves: GameMove[], seed: string): TetrisState {
    const state: TetrisState = {
      board: this.createEmptyBoard(),
      score: 0,
      level: 1,
      lines: 0,
      currentPiece: null
    }

    const rng = this.seedRandom(seed)
    
    for (const move of moves) {
      this.applyMove(state, move, rng)
    }
    
    return state
  }

  private createEmptyBoard(): number[][] {
    return Array(20).fill(null).map(() => Array(10).fill(0))
  }

  private seedRandom(seed: string) {
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

  private applyMove(state: TetrisState, move: GameMove, rng: () => number) {
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
        this.handleMove(state, move)
        break
        
      case 'rotate':
        this.handleRotate(state)
        break
        
      case 'drop':
        this.handleDrop(state, rng)
        break
        
      default:
        throw new Error(`Unknown move type: ${move.type}`)
    }
  }

  private handleMove(state: TetrisState, move: GameMove) {
    if (!state.currentPiece) return
    
    if (move.direction === 'left' && state.currentPiece.x > 0) {
      state.currentPiece.x--
    } else if (move.direction === 'right' && state.currentPiece.x < 9) {
      state.currentPiece.x++
    } else if (move.direction === 'down') {
      state.currentPiece.y++
    }
  }

  private handleRotate(state: TetrisState) {
    if (!state.currentPiece) return
    state.currentPiece.rotation = (state.currentPiece.rotation + 1) % 4
  }

  private handleDrop(state: TetrisState, rng: () => number) {
    // Simulate lines cleared (simplified)
    const linesCleared = Math.floor(rng() * 4)
    state.lines += linesCleared
    
    // Update score based on lines and level
    if (linesCleared > 0) {
      const lineScores = [0, 100, 300, 500, 800]
      state.score += lineScores[linesCleared] * state.level
    }
    
    // Update level
    state.level = Math.floor(state.lines / 10) + 1
    
    // Reset current piece
    state.currentPiece = null
  }
} 