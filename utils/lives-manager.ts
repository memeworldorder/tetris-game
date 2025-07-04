/**
 * @fileoverview Lives Management System for GameFi Platform
 * 
 * Provides client-side lives management with automatic regeneration,
 * localStorage persistence, and browser-safe operations.
 * 
 * @module LivesManager
 * @version 1.0.0
 */

import type { GameState } from "@/types/game"

/** Local storage key for persisting game state */
const STORAGE_KEY = "mwor-tetris-game-state"

/** Default maximum number of lives a player can have */
const DEFAULT_MAX_LIVES = 5

/** Time interval for life regeneration in milliseconds (1 hour) */
const LIFE_REGEN_INTERVAL_MS = 60 * 60 * 1000 // 1 hour in milliseconds

/**
 * Initialize or load game state from localStorage
 * 
 * Attempts to load existing game state from localStorage and update
 * lives based on time passed. Falls back to default state if no
 * saved state exists or parsing fails.
 * 
 * @returns {GameState} The initialized or loaded game state
 * 
 * @example
 * ```typescript
 * const gameState = initGameState();
 * console.log(`Player has ${gameState.lives} lives`);
 * ```
 */
export function initGameState(): GameState {
  // Check if we're in a browser environment
  if (typeof window === "undefined") {
    return {
      lives: DEFAULT_MAX_LIVES,
      maxLives: DEFAULT_MAX_LIVES,
      lastLifeRegenTime: Date.now(),
      lifeRegenIntervalMs: LIFE_REGEN_INTERVAL_MS,
    }
  }

  // Try to load from localStorage
  const savedState = localStorage.getItem(STORAGE_KEY)

  if (savedState) {
    try {
      const parsedState = JSON.parse(savedState) as GameState

      // Update lives based on time passed since last check
      return updateLivesBasedOnTime(parsedState)
    } catch (error) {
      console.error("Error parsing saved game state:", error)
    }
  }

  // Default state if nothing is saved or parsing failed
  const defaultState: GameState = {
    lives: DEFAULT_MAX_LIVES,
    maxLives: DEFAULT_MAX_LIVES,
    lastLifeRegenTime: Date.now(),
    lifeRegenIntervalMs: LIFE_REGEN_INTERVAL_MS,
  }

  // Save the default state
  saveGameState(defaultState)

  return defaultState
}

/**
 * Update lives based on time elapsed since last regeneration
 * 
 * Calculates how many lives should be regenerated based on the time
 * that has passed since the last regeneration timestamp. Lives regenerate
 * at a rate of 1 life per hour up to the maximum limit.
 * 
 * @param {GameState} state - Current game state
 * @returns {GameState} Updated game state with regenerated lives
 * 
 * @example
 * ```typescript
 * const updatedState = updateLivesBasedOnTime(currentState);
 * console.log(`Lives updated: ${updatedState.lives}/${updatedState.maxLives}`);
 * ```
 */
export function updateLivesBasedOnTime(state: GameState): GameState {
  const now = Date.now()
  const timePassed = now - state.lastLifeRegenTime

  // If no time has passed or lives are already at max, return the state as is
  if (timePassed <= 0 || state.lives >= state.maxLives) {
    return state
  }

  // Calculate how many lives should be regenerated
  const livesToRegen = Math.floor(timePassed / state.lifeRegenIntervalMs)

  if (livesToRegen <= 0) {
    return state
  }

  // Calculate new lives count and last regen time
  const newLives = Math.min(state.lives + livesToRegen, state.maxLives)
  const newLastRegenTime = state.lastLifeRegenTime + livesToRegen * state.lifeRegenIntervalMs

  const updatedState = {
    ...state,
    lives: newLives,
    lastLifeRegenTime: newLastRegenTime,
  }

  // Save the updated state
  saveGameState(updatedState)

  return updatedState
}

/**
 * Consume a life from the player's current total
 * 
 * Decrements the lives count by 1 if the player has lives remaining.
 * If no lives are available, returns the state unchanged.
 * 
 * @param {GameState} state - Current game state
 * @returns {GameState} Updated game state with decremented lives
 * 
 * @example
 * ```typescript
 * const gameState = useLife(currentState);
 * if (gameState.lives > 0) {
 *   console.log('Game can continue');
 * } else {
 *   console.log('No lives remaining');
 * }
 * ```
 */
export function useLife(state: GameState): GameState {
  if (state.lives <= 0) {
    return state
  }

  const updatedState = {
    ...state,
    lives: state.lives - 1,
  }

  // Save the updated state
  saveGameState(updatedState)

  return updatedState
}

/**
 * Calculate time remaining until the next life regenerates
 * 
 * Returns the number of milliseconds until the next life will be added
 * to the player's total. Returns null if the player already has maximum lives.
 * 
 * @param {GameState} state - Current game state
 * @returns {number | null} Milliseconds until next life, or null if at max lives
 * 
 * @example
 * ```typescript
 * const timeRemaining = getTimeUntilNextLife(gameState);
 * if (timeRemaining !== null) {
 *   const minutes = Math.floor(timeRemaining / 60000);
 *   console.log(`Next life in ${minutes} minutes`);
 * } else {
 *   console.log('Lives are full');
 * }
 * ```
 */
export function getTimeUntilNextLife(state: GameState): number | null {
  if (state.lives >= state.maxLives) {
    return null
  }

  const now = Date.now()
  const nextLifeTime = state.lastLifeRegenTime + state.lifeRegenIntervalMs
  const timeRemaining = nextLifeTime - now

  return Math.max(0, timeRemaining)
}

/**
 * Save game state to localStorage (browser-safe)
 * 
 * Persists the current game state to localStorage for retrieval
 * on subsequent page loads. Only operates in browser environments.
 * 
 * @private
 * @param {GameState} state - Game state to persist
 * 
 * @example
 * ```typescript
 * saveGameState({ lives: 3, maxLives: 5, lastLifeRegenTime: Date.now() });
 * ```
 */
function saveGameState(state: GameState): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }
}
