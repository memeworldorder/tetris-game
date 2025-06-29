export interface GameMove {
  type: string
  timestamp: number
  direction?: string
  data?: any
}

export interface ValidationResult {
  score: number
  valid: boolean
  gameData?: any
  errors?: string[]
}

export interface GameValidator {
  validateMoves(moves: GameMove[], seed: string, config: any): ValidationResult
}

// Base class for game validators
export abstract class BaseGameValidator implements GameValidator {
  abstract validateMoves(moves: GameMove[], seed: string, config: any): ValidationResult
  
  protected validateTimestamps(moves: GameMove[]): string[] {
    const errors: string[] = []
    
    for (let i = 1; i < moves.length; i++) {
      if (moves[i].timestamp <= moves[i - 1].timestamp) {
        errors.push(`Invalid timestamp order at move ${i}`)
      }
    }
    
    return errors
  }
  
  protected seedToMultiplier(seed: string): number {
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return 1 + (Math.abs(hash) % 100) / 1000 // 1.0 to 1.099 multiplier
  }
} 