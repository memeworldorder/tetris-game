import type { GameState } from "@/types/game"

const STORAGE_KEY = "mwor-tetris-game-state"
const DEFAULT_MAX_LIVES = 5
const LIFE_REGEN_INTERVAL_MS = 60 * 60 * 1000 // 1 hour in milliseconds

// Initialize or load game state
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

// Update lives based on time passed
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

// Use a life
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

// Calculate time until next life
export function getTimeUntilNextLife(state: GameState): number | null {
  if (state.lives >= state.maxLives) {
    return null
  }

  const now = Date.now()
  const nextLifeTime = state.lastLifeRegenTime + state.lifeRegenIntervalMs
  const timeRemaining = nextLifeTime - now

  return Math.max(0, timeRemaining)
}

// Save game state to localStorage
function saveGameState(state: GameState): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }
}
