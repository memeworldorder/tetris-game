/**
 * Utility functions for haptic feedback using the Vibration API
 */

// Check if vibration is supported
export const isVibrationSupported = (): boolean => {
  return typeof navigator !== "undefined" && "vibrate" in navigator
}

// Vibration patterns for different game actions
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
 * @param pattern Number or array of numbers representing vibration pattern in milliseconds
 */
export const vibrate = (pattern: number | number[]): void => {
  if (isVibrationSupported()) {
    navigator.vibrate(pattern)
  }
}

/**
 * Trigger vibration for a specific game action
 * @param action The game action to trigger vibration for
 * @param lines Optional number of lines cleared (for lineClear action)
 */
export const vibrateForAction = (action: keyof typeof vibrationPatterns | "lineClear", lines?: number): void => {
  if (!isVibrationSupported()) return

  if (action === "lineClear" && typeof lines === "number") {
    vibrate(vibrationPatterns.lineClear(lines))
  } else if (action !== "lineClear") {
    vibrate(vibrationPatterns[action])
  }
}
