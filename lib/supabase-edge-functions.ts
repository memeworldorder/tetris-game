/**
 * SUPABASE EDGE FUNCTIONS CLIENT
 * 
 * This module provides typed client-side functions to call all Supabase Edge Functions
 * for the GameFi Tetris platform. Each function includes proper error handling,
 * TypeScript types, and comprehensive documentation.
 * 
 * @usage
 * import { gameAPI } from '@/lib/supabase-edge-functions'
 * 
 * // Start a game
 * const session = await gameAPI.startGame('your-wallet-address')
 * 
 * // End a game
 * const result = await gameAPI.endGame({
 *   sessionId: session.session_id,
 *   walletAddress: 'your-wallet-address',
 *   score: 45000
 * })
 */

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Type definitions for edge function responses
export interface UserLives {
  free_today: number
  bonus_today: number
  paid_bank: number
  wallet_address: string
  last_reset?: string
  last_bonus_date?: string
}

export interface GameSession {
  id: string
  wallet_address: string
  game_type: string
  score?: number
  moves_count?: number
  lines_cleared?: number
  game_duration?: number
  level_reached?: number
  started_at: string
  ended_at?: string
  status: 'active' | 'completed' | 'abandoned'
}

export interface GameStartResponse {
  success: boolean
  session_id: string
  remaining_lives: UserLives
  message: string
}

export interface GameEndResponse {
  success: boolean
  session: GameSession
  personal_best: boolean
  achievements: string[]
  final_score: number
  game_duration: number
}

export interface DailyResetResponse {
  success: boolean
  message: string
  stats: {
    users_reset: string
    bonus_awarded: number
    leaderboard_updated: number
  }
}

/**
 * Main GameFi API client for calling edge functions
 */
export const gameAPI = {
  /**
   * START GAME - Initialize a new Tetris game session
   * 
   * Validates user has lives, deducts a life, creates game session
   * 
   * @param walletAddress - Solana wallet address of the player
   * @param gameType - Type of game (default: 'tetris')
   * @returns Promise<GameStartResponse>
   * 
   * @example
   * const session = await gameAPI.startGame('FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai')
   * console.log(`Game started! Session: ${session.session_id}`)
   * console.log(`Lives remaining: ${session.remaining_lives.free_today}`)
   */
  async startGame(walletAddress: string, gameType: string = 'tetris'): Promise<GameStartResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('handle-game-start', {
        body: { 
          wallet_address: walletAddress,
          game_type: gameType
        }
      })

      if (error) {
        throw new Error(`Game start failed: ${error.message}`)
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to start game')
      }

      return data as GameStartResponse
    } catch (err: any) {
      console.error('❌ Error starting game:', err)
      throw err
    }
  },

  /**
   * END GAME - Complete a Tetris game session
   * 
   * Validates session, performs anti-cheat checks, updates scores and achievements
   * 
   * @param params - Game completion parameters
   * @param params.sessionId - Game session ID from startGame
   * @param params.walletAddress - Player's wallet address
   * @param params.score - Final game score
   * @param params.movesCount - Total moves made (optional)
   * @param params.linesCleared - Lines cleared (optional)
   * @param params.gameDuration - Game duration in seconds (optional)
   * @param params.levelReached - Highest level reached (optional)
   * @returns Promise<GameEndResponse>
   * 
   * @example
   * const result = await gameAPI.endGame({
   *   sessionId: 'session-uuid',
   *   walletAddress: 'FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai',
   *   score: 45000,
   *   linesCleared: 15,
   *   levelReached: 5
   * })
   * 
   * if (result.personal_best) {
   *   console.log('🎉 New personal best!')
   * }
   * 
   * console.log('Achievements:', result.achievements)
   */
  async endGame(params: {
    sessionId: string
    walletAddress: string
    score: number
    movesCount?: number
    linesCleared?: number
    gameDuration?: number
    levelReached?: number
  }): Promise<GameEndResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('handle-game-end', {
        body: {
          session_id: params.sessionId,
          wallet_address: params.walletAddress,
          score: params.score,
          moves_count: params.movesCount,
          lines_cleared: params.linesCleared,
          game_duration: params.gameDuration,
          level_reached: params.levelReached
        }
      })

      if (error) {
        throw new Error(`Game end failed: ${error.message}`)
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to end game')
      }

      return data as GameEndResponse
    } catch (err: any) {
      console.error('❌ Error ending game:', err)
      throw err
    }
  },

  /**
   * TRIGGER DAILY RESET - Manually trigger daily reset (admin only)
   * 
   * Resets user lives, processes bonuses, updates streaks, cleans data
   * 
   * @returns Promise<DailyResetResponse>
   * 
   * @example
   * // Usually called by cron, but can be triggered manually
   * const result = await gameAPI.triggerDailyReset()
   * console.log(`Reset completed. Bonus awarded to ${result.stats.bonus_awarded} users`)
   */
  async triggerDailyReset(): Promise<DailyResetResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('daily-reset', {
        body: {}
      })

      if (error) {
        throw new Error(`Daily reset failed: ${error.message}`)
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to trigger daily reset')
      }

      return data as DailyResetResponse
    } catch (err: any) {
      console.error('❌ Error triggering daily reset:', err)
      throw err
    }
  },

  /**
   * GET USER LIVES - Get current life count for a user
   * 
   * @param walletAddress - User's wallet address
   * @returns Promise<UserLives>
   * 
   * @example
   * const lives = await gameAPI.getUserLives('FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai')
   * console.log(`Free lives: ${lives.free_today}`)
   * console.log(`Bonus lives: ${lives.bonus_today}`)
   * console.log(`Paid lives: ${lives.paid_bank}`)
   */
  async getUserLives(walletAddress: string): Promise<UserLives> {
    try {
      const { data, error } = await supabase
        .from('user_lives')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single()

      if (error && error.code === 'PGRST116') {
        // User doesn't exist, return default
        return {
          wallet_address: walletAddress,
          free_today: 3,
          bonus_today: 0,
          paid_bank: 0
        }
      }

      if (error) {
        throw error
      }

      return data as UserLives
    } catch (err: any) {
      console.error('❌ Error getting user lives:', err)
      throw err
    }
  },

  /**
   * GET LEADERBOARD - Get current leaderboard data
   * 
   * @param type - Leaderboard type ('daily', 'weekly', 'all-time')
   * @param limit - Number of entries to return (default: 10)
   * @returns Promise<GameSession[]>
   * 
   * @example
   * const dailyLeaders = await gameAPI.getLeaderboard('daily', 10)
   * dailyLeaders.forEach((player, index) => {
   *   console.log(`${index + 1}. ${player.wallet_address}: ${player.score}`)
   * })
   */
  async getLeaderboard(type: 'daily' | 'weekly' | 'all-time' = 'daily', limit: number = 10): Promise<GameSession[]> {
    try {
      let query = supabase
        .from('game_sessions')
        .select('*')
        .eq('status', 'completed')
        .order('score', { ascending: false })
        .limit(limit)

      // Add time filters based on type
      const now = new Date()
      if (type === 'daily') {
        const today = now.toISOString().split('T')[0]
        query = query.gte('started_at', today + 'T00:00:00.000Z')
      } else if (type === 'weekly') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        query = query.gte('started_at', weekAgo.toISOString())
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return data as GameSession[]
    } catch (err: any) {
      console.error('❌ Error getting leaderboard:', err)
      throw err
    }
  }
}

/**
 * UTILITY FUNCTIONS
 */
export const gameUtils = {
  /**
   * Format wallet address for display (truncate middle)
   */
  formatWalletAddress(address: string): string {
    if (!address || address.length < 8) return address
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  },

  /**
   * Calculate total lives for a user
   */
  getTotalLives(lives: UserLives): number {
    return lives.free_today + lives.bonus_today + lives.paid_bank
  },

  /**
   * Check if user can play (has any lives)
   */
  canPlay(lives: UserLives): boolean {
    return this.getTotalLives(lives) > 0
  },

  /**
   * Format score with commas
   */
  formatScore(score: number): string {
    return score.toLocaleString()
  },

  /**
   * Get achievement display name
   */
  getAchievementName(code: string): string {
    const achievements: Record<string, string> = {
      'SCORE_10K': '🎯 Score Master (10K)',
      'SCORE_50K': '🚀 High Scorer (50K)',
      'SCORE_100K': '👑 Score Legend (100K)',
      'LINES_100': '🔥 Line Clearer (100 lines)',
      'PERSONAL_BEST': '⭐ Personal Best'
    }
    return achievements[code] || code
  }
} 