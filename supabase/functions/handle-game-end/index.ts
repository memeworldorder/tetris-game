/**
 * HANDLE GAME END - Supabase Edge Function
 * 
 * This function processes the completion of a Tetris game session.
 * It validates the game session, performs anti-cheat checks, updates scores,
 * calculates achievements, and updates leaderboards.
 * 
 * @route POST /functions/v1/handle-game-end
 * 
 * @requestBody {Object} body - The request payload
 * @requestBody {string} body.session_id - Game session ID from game start (REQUIRED)
 * @requestBody {string} body.wallet_address - Player's wallet address (REQUIRED)
 * @requestBody {number} body.score - Final game score (REQUIRED)
 * @requestBody {number} [body.moves_count] - Total number of moves made
 * @requestBody {number} [body.lines_cleared] - Total lines cleared in the game
 * @requestBody {number} [body.game_duration] - Game duration in seconds
 * @requestBody {number} [body.level_reached] - Highest level reached
 * 
 * @returns {Object} Success response
 * @returns {boolean} success - Always true on success
 * @returns {Object} session - Updated game session data
 * @returns {boolean} personal_best - Whether this is a new personal best score
 * @returns {string[]} achievements - Array of achievement codes unlocked
 * @returns {number} final_score - The validated final score
 * @returns {number} game_duration - Actual game duration in seconds
 * 
 * @throws {400} Missing required fields (session_id, wallet_address, score)
 * @throws {400} Invalid or expired game session
 * @throws {400} Game too short - potential cheating detected
 * @throws {400} Score too high - potential cheating detected
 * @throws {500} Database errors or other server issues
 * 
 * @example
 * // Request
 * POST /functions/v1/handle-game-end
 * {
 *   "session_id": "123e4567-e89b-12d3-a456-426614174000",
 *   "wallet_address": "FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai",
 *   "score": 45000,
 *   "moves_count": 250,
 *   "lines_cleared": 15,
 *   "level_reached": 5
 * }
 * 
 * // Response
 * {
 *   "success": true,
 *   "session": { ... },
 *   "personal_best": true,
 *   "achievements": ["SCORE_10K", "PERSONAL_BEST"],
 *   "final_score": 45000,
 *   "game_duration": 180
 * }
 * 
 * @workflow
 * 1. Validate required fields are provided
 * 2. Verify game session exists and belongs to user
 * 3. Perform anti-cheat validation (duration, score limits)
 * 4. Update game session with final stats
 * 5. Check for new personal best
 * 6. Update or create user statistics
 * 7. Check for new achievements
 * 8. Update daily leaderboard
 * 9. Return results with achievements
 * 
 * @anti_cheat_measures
 * - Minimum game duration: 10 seconds
 * - Maximum score: 999,999 points
 * - Session validation (must exist and be active)
 * - Wallet ownership verification
 * 
 * @achievements
 * - SCORE_10K: Score 10,000+ points
 * - SCORE_50K: Score 50,000+ points  
 * - SCORE_100K: Score 100,000+ points
 * - LINES_100: Clear 100+ lines
 * - PERSONAL_BEST: New personal best score
 * 
 * @database_tables
 * - game_sessions: Updated with final game data
 * - user_stats: User's overall statistics
 * - daily_leaderboard: Daily ranking data
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

    const { 
      session_id, 
      wallet_address, 
      score, 
      moves_count, 
      lines_cleared,
      game_duration,
      level_reached 
    } = await req.json()

    if (!session_id || !wallet_address || score === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate session exists and belongs to user
    const { data: session, error: sessionError } = await supabaseClient
      .from('game_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('wallet_address', wallet_address)
      .eq('status', 'active')
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired game session' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Basic anti-cheat validation
    const gameStartTime = new Date(session.started_at).getTime()
    const gameEndTime = new Date().getTime()
    const actualDuration = Math.floor((gameEndTime - gameStartTime) / 1000) // seconds
    const minGameDuration = 10 // minimum 10 seconds
    const maxScore = 999999 // reasonable max score

    if (actualDuration < minGameDuration) {
      return new Response(
        JSON.stringify({ error: 'Game too short - potential cheating detected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (score > maxScore) {
      return new Response(
        JSON.stringify({ error: 'Score too high - potential cheating detected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update game session
    const { data: updatedSession, error: updateError } = await supabaseClient
      .from('game_sessions')
      .update({
        score,
        moves_count,
        lines_cleared,
        game_duration: game_duration || actualDuration,
        level_reached,
        ended_at: new Date().toISOString(),
        status: 'completed'
      })
      .eq('id', session_id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Check for new personal best
    const { data: personalBest } = await supabaseClient
      .from('game_sessions')
      .select('score')
      .eq('wallet_address', wallet_address)
      .eq('status', 'completed')
      .order('score', { ascending: false })
      .limit(1)
      .single()

    const isNewPersonalBest = !personalBest || score > personalBest.score

    // Update user statistics
    const { data: userStats, error: statsError } = await supabaseClient
      .from('user_stats')
      .select('*')
      .eq('wallet_address', wallet_address)
      .single()

    if (statsError && statsError.code === 'PGRST116') {
      // Create user stats if doesn't exist
      await supabaseClient
        .from('user_stats')
        .insert({
          wallet_address,
          games_played: 1,
          total_score: score,
          best_score: score,
          total_lines_cleared: lines_cleared || 0,
          total_game_time: actualDuration
        })
    } else if (userStats) {
      // Update existing stats
      await supabaseClient
        .from('user_stats')
        .update({
          games_played: userStats.games_played + 1,
          total_score: userStats.total_score + score,
          best_score: Math.max(userStats.best_score, score),
          total_lines_cleared: userStats.total_lines_cleared + (lines_cleared || 0),
          total_game_time: userStats.total_game_time + actualDuration
        })
        .eq('wallet_address', wallet_address)
    }

    // Check for achievements (simplified)
    const achievements = []
    if (score >= 10000) achievements.push('SCORE_10K')
    if (score >= 50000) achievements.push('SCORE_50K')
    if (score >= 100000) achievements.push('SCORE_100K')
    if (lines_cleared && lines_cleared >= 100) achievements.push('LINES_100')
    if (isNewPersonalBest) achievements.push('PERSONAL_BEST')

    // Update daily leaderboard
    const today = new Date().toISOString().split('T')[0]
    await supabaseClient
      .from('daily_leaderboard')
      .upsert({
        wallet_address,
        date: today,
        best_score: score,
        games_played: 1
      }, {
        onConflict: 'wallet_address,date'
      })

    return new Response(
      JSON.stringify({
        success: true,
        session: updatedSession,
        personal_best: isNewPersonalBest,
        achievements,
        final_score: score,
        game_duration: actualDuration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in handle-game-end:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 