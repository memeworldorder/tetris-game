import { BaseGameValidator, GameMove, ValidationResult } from './game-validator'

export class GenericValidator extends BaseGameValidator {
  validateMoves(moves: GameMove[], seed: string, config: any): ValidationResult {
    // Basic validation for generic games
    if (!moves || moves.length === 0) {
      return { score: 0, valid: false, errors: ['No moves provided'] }
    }

    const maxMoves = config?.max_moves || 10000
    if (moves.length > maxMoves) {
      return { score: 0, valid: false, errors: [`Too many moves (max: ${maxMoves})`] }
    }

    // Validate timestamp order
    const timestampErrors = this.validateTimestamps(moves)
    if (timestampErrors.length > 0) {
      return { score: 0, valid: false, errors: timestampErrors }
    }

    // Basic score calculation based on moves
    const baseScore = moves.length * (config?.score_per_move || 10)
    const seedMultiplier = this.seedToMultiplier(seed)
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