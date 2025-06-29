/**
 * DAILY RESET - Supabase Edge Function
 * 
 * This function handles the daily reset of user lives, processes daily bonuses,
 * updates login streaks, cleans up old data, and refreshes leaderboards.
 * Should be called via cron job at midnight UTC daily.
 * 
 * @route POST /functions/v1/daily-reset
 * 
 * @requestBody {Object} [body] - No body required (triggered by cron)
 * 
 * @returns {Object} Success response
 * @returns {boolean} success - Always true on success
 * @returns {string} message - Success message
 * @returns {Object} stats - Statistics about the reset operation
 * @returns {string} stats.users_reset - Number of users reset (usually "all")
 * @returns {number} stats.bonus_awarded - Number of users who got daily bonus
 * @returns {number} stats.leaderboard_updated - Number of leaderboard entries updated
 * 
 * @throws {500} Database errors or other server issues
 * 
 * @example
 * // Request (usually from cron)
 * POST /functions/v1/daily-reset
 * {}
 * 
 * // Response
 * {
 *   "success": true,
 *   "message": "Daily reset completed successfully",
 *   "stats": {
 *     "users_reset": "all",
 *     "bonus_awarded": 150,
 *     "leaderboard_updated": 75
 *   }
 * }
 * 
 * @workflow
 * 1. Reset all users' free_today lives to 3
 * 2. Find users who played yesterday
 * 3. Award daily login bonus (1 bonus life) to active users
 * 4. Update login streaks for all users
 * 5. Clean up old game sessions (30+ days old)
 * 6. Refresh daily leaderboard rankings
 * 7. Return operation statistics
 * 
 * @daily_operations
 * - Reset free lives: 3 per user
 * - Login bonus: 1 bonus life for yesterday's players
 * - Streak calculation: Consecutive day tracking
 * - Data cleanup: Remove sessions older than 30 days
 * - Leaderboard: Recalculate daily rankings
 * 
 * @database_tables
 * - user_lives: Reset free_today, award bonus_today
 * - user_stats: Update login_streak, last_play_date
 * - game_sessions: Cleanup old completed sessions
 * - daily_leaderboard: Update rankings and scores
 * 
 * @cron_schedule
 * Recommended: "0 0 * * *" (daily at midnight UTC)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    console.log('Starting daily reset process...')

    // Reset all users' daily lives to 3
    const { data: resetResult, error: resetError } = await supabaseClient
      .from('user_lives')
      .update({ 
        free_today: 3,
        last_reset: new Date().toISOString().split('T')[0]
      })
      .neq('wallet_address', '') // Update all users

    if (resetError) {
      throw resetError
    }

    console.log(`Reset lives for users`)

    // Process daily login bonuses
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Get users who played yesterday
    const { data: activeUsers, error: activeError } = await supabaseClient
      .from('game_sessions')
      .select('DISTINCT wallet_address')
      .gte('started_at', yesterday + 'T00:00:00.000Z')
      .lt('started_at', today + 'T00:00:00.000Z')

    if (activeError) {
      throw activeError
    }

    // Award daily login bonus to active users
    if (activeUsers && activeUsers.length > 0) {
      const bonusUpdates = activeUsers.map((user: any) => ({
        wallet_address: user.wallet_address,
        bonus_today: 1, // Award 1 bonus life
        last_bonus_date: today
      }))

      const { error: bonusError } = await supabaseClient
        .from('user_lives')
        .upsert(bonusUpdates, {
          onConflict: 'wallet_address'
        })

      if (bonusError) {
        throw bonusError
      }

      console.log(`Awarded daily bonus to ${activeUsers.length} active users`)
    }

    // Update user streaks
    const { data: allUsers, error: usersError } = await supabaseClient
      .from('user_stats')
      .select('wallet_address, last_play_date, login_streak')

    if (usersError) {
      throw usersError
    }

    if (allUsers) {
      for (const user of allUsers) {
        const lastPlayDate = user.last_play_date
        let newStreak = user.login_streak || 0

        if (lastPlayDate === yesterday) {
          // Consecutive day - increase streak
          newStreak += 1
        } else if (lastPlayDate !== today) {
          // Missed a day - reset streak
          newStreak = 0
        }

        // Update streak if user played today
        const { data: todayPlay } = await supabaseClient
          .from('game_sessions')
          .select('id')
          .eq('wallet_address', user.wallet_address)
          .gte('started_at', today + 'T00:00:00.000Z')
          .limit(1)

        if (todayPlay && todayPlay.length > 0) {
          await supabaseClient
            .from('user_stats')
            .update({
              last_play_date: today,
              login_streak: newStreak
            })
            .eq('wallet_address', user.wallet_address)
        }
      }
    }

    // Clean up old game sessions (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    const { error: cleanupError } = await supabaseClient
      .from('game_sessions')
      .delete()
      .lt('started_at', thirtyDaysAgo)
      .eq('status', 'completed')

    if (cleanupError) {
      console.error('Cleanup error:', cleanupError)
    } else {
      console.log('Cleaned up old game sessions')
    }

    // Update daily leaderboard rankings
    const { data: dailyScores, error: scoresError } = await supabaseClient
      .from('game_sessions')
      .select('wallet_address, score')
      .gte('started_at', today + 'T00:00:00.000Z')
      .eq('status', 'completed')
      .order('score', { ascending: false })

    if (scoresError) {
      throw scoresError
    }

    // Calculate rankings and update leaderboard
    if (dailyScores && dailyScores.length > 0) {
      const rankings = dailyScores.reduce((acc: any, session: any, index: number) => {
        if (!acc[session.wallet_address] || session.score > acc[session.wallet_address].score) {
          acc[session.wallet_address] = {
            wallet_address: session.wallet_address,
            score: session.score,
            rank: index + 1,
            date: today
          }
        }
        return acc
      }, {})

      const leaderboardEntries = Object.values(rankings)
      
      const { error: leaderboardError } = await supabaseClient
        .from('daily_leaderboard')
        .upsert(leaderboardEntries, {
          onConflict: 'wallet_address,date'
        })

      if (leaderboardError) {
        throw leaderboardError
      }

      console.log(`Updated daily leaderboard with ${leaderboardEntries.length} entries`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily reset completed successfully',
        stats: {
          users_reset: 'all',
          bonus_awarded: activeUsers?.length || 0,
          leaderboard_updated: dailyScores?.length || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in daily-reset:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 