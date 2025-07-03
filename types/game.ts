/**
 * @fileoverview Game Type Definitions for GameFi Platform
 * 
 * Contains TypeScript interfaces and types used throughout the gaming
 * system for type safety and consistency.
 * 
 * @module GameTypes
 * @version 1.0.0
 */

/**
 * Represents a single entry in the game leaderboard
 * 
 * @interface LeaderboardEntry
 * @example
 * ```typescript
 * const entry: LeaderboardEntry = {
 *   rank: 1,
 *   name: "PlayerOne",
 *   score: 150000,
 *   level: 10,
 *   lines: 240,
 *   date: "2024-01-01T12:00:00Z"
 * };
 * ```
 */
export interface LeaderboardEntry {
  /** Player's current rank in the leaderboard (1-based) */
  rank: number
  
  /** Display name or wallet address of the player */
  name: string
  
  /** Final score achieved by the player */
  score: number
  
  /** Highest level reached (optional, game-specific) */
  level?: number
  
  /** Total lines cleared (optional, for Tetris-style games) */
  lines?: number
  
  /** ISO 8601 timestamp when the score was achieved */
  date?: string
}

/**
 * Represents the current state of a player's lives system
 * 
 * @interface GameState
 * @example
 * ```typescript
 * const gameState: GameState = {
 *   lives: 3,
 *   maxLives: 5,
 *   lastLifeRegenTime: Date.now(),
 *   lifeRegenIntervalMs: 3600000 // 1 hour
 * };
 * ```
 */
export interface GameState {
  /** Current number of lives available to the player */
  lives: number
  
  /** Maximum number of lives the player can have */
  maxLives: number
  
  /** Timestamp (in milliseconds) when the last life was regenerated */
  lastLifeRegenTime: number
  
  /** Time interval (in milliseconds) between life regenerations */
  lifeRegenIntervalMs: number
}
