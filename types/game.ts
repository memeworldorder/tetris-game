export interface LeaderboardEntry {
  rank: number
  name: string
  score: number
  level?: number
  lines?: number
  date?: string
}

export interface GameState {
  lives: number
  maxLives: number
  lastLifeRegenTime: number
  lifeRegenIntervalMs: number
}
