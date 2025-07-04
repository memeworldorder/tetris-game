/**
 * @fileoverview Mobile Vibration System for GameFi Platform
 * 
 * Provides haptic feedback for game actions on mobile devices using the
 * Web Vibration API. Includes predefined patterns for different game events
 * with graceful fallbacks for unsupported devices.
 * 
 * @module Vibration
 * @version 1.0.0
 */

/**
 * Check if the Vibration API is supported in the current environment
 * 
 * @returns {boolean} True if vibration is supported, false otherwise
 * 
 * @example
 * ```typescript
 * if (isVibrationSupported()) {
 *   vibrate(100); // Safe to use vibration
 * }
 * ```
 */
export const isVibrationSupported = (): boolean => {
  return typeof navigator !== "undefined" && "vibrate" in navigator
}

/**
 * Predefined vibration patterns for different game actions
 * 
 * Each pattern can be either:
 * - A number (single vibration duration in ms)
 * - An array of numbers ([vibrate, pause, vibrate, pause, ...])
 * - A function that returns a pattern based on parameters
 * 
 * @constant
 */
export const vibrationPatterns = {
  // Short vibration for basic movements
  move: 20,

  // Medium vibration for rotation
  rotate: 30,

  // Strong vibration for hard drop
  hardDrop: 50,

  // Double pulse for piece lock
  pieceLock: [30, 20, 60],

  // Triple pulse for line clear (intensity based on number of lines)
  lineClear: (lines: number) => {
    switch (lines) {
      case 1:
        return [40, 30, 40]
      case 2:
        return [40, 30, 60, 30, 40]
      case 3:
        return [40, 30, 80, 30, 60]
      case 4: // Tetris!
        return [60, 30, 100, 30, 80, 30, 60]
      default:
        return [40, 30, 40]
    }
  },

  // Long vibration for game over
  gameOver: [100, 50, 100, 50, 200],
}

/**
 * Trigger vibration with the specified pattern
 * 
 * Uses the Web Vibration API to provide haptic feedback. Automatically
 * checks for API support before attempting to vibrate.
 * 
 * @param {number | number[]} pattern - Vibration pattern in milliseconds
 *   - Single number: vibrates for that duration
 *   - Array: alternates between vibrate and pause durations
 * 
 * @example
 * ```typescript
 * vibrate(100);                    // Single 100ms vibration
 * vibrate([100, 50, 100]);         // Vibrate-pause-vibrate pattern
 * vibrate([200, 100, 300, 100]);   // Complex pattern
 * ```
 */
export const vibrate = (pattern: number | number[]): void => {
  if (isVibrationSupported()) {
    navigator.vibrate(pattern)
  }
}

/**
 * Trigger vibration for a specific game action using predefined patterns
 * 
 * Provides contextual haptic feedback based on game events. Each action
 * has a unique vibration pattern designed to enhance the gaming experience.
 * 
 * @param {string} action - The game action to trigger vibration for
 *   - 'move': Basic piece movement
 *   - 'rotate': Piece rotation
 *   - 'hardDrop': Hard drop action
 *   - 'pieceLock': When a piece locks in place
 *   - 'lineClear': Lines cleared (requires lines parameter)
 *   - 'gameOver': Game over event
 * @param {number} [lines] - Number of lines cleared (required for 'lineClear' action)
 * 
 * @example
 * ```typescript
 * vibrateForAction('move');           // Short vibration for movement
 * vibrateForAction('pieceLock');      // Double pulse for piece locking
 * vibrateForAction('lineClear', 4);   // Intense pattern for Tetris (4 lines)
 * vibrateForAction('gameOver');       // Long pattern for game over
 * ```
 */
export const vibrateForAction = (action: keyof typeof vibrationPatterns | "lineClear", lines?: number): void => {
  if (!isVibrationSupported()) return

  if (action === "lineClear" && typeof lines === "number") {
    vibrate(vibrationPatterns.lineClear(lines))
  } else if (action !== "lineClear") {
    vibrate(vibrationPatterns[action])
  }
}
