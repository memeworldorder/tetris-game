/**
 * HANDLE GAME START - Supabase Edge Function
 * 
 * This function handles the initialization of a new Tetris game session.
 * It validates the user has available lives, deducts a life, and creates a new game session.
 * 
 * @route POST /functions/v1/handle-game-start
 * 
 * @requestBody {Object} body - The request payload
 * @requestBody {string} body.wallet_address - Solana wallet address of the player (REQUIRED)
 * @requestBody {string} [body.game_type='tetris'] - Type of game being started (default: 'tetris')
 * 
 * @returns {Object} Success response
 * @returns {boolean} success - Always true on success
 * @returns {string} session_id - Unique game session ID for tracking this game
 * @returns {Object} remaining_lives - Updated user lives after deduction
 * @returns {number} remaining_lives.free_today - Free lives remaining today
 * @returns {number} remaining_lives.bonus_today - Bonus lives remaining
 * @returns {number} remaining_lives.paid_bank - Paid lives in bank
 * @returns {string} message - Success message
 * 
 * @throws {400} Missing wallet address
 * @throws {400} No lives available
 * @throws {500} Database errors or other server issues
 * 
 * @example
 * // Request
 * POST /functions/v1/handle-game-start
 * {
 *   "wallet_address": "FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai",
 *   "game_type": "tetris"
 * }
 * 
 * // Response
 * {
 *   "success": true,
 *   "session_id": "123e4567-e89b-12d3-a456-426614174000",
 *   "remaining_lives": {
 *     "free_today": 2,
 *     "bonus_today": 1,
 *     "paid_bank": 5
 *   },
 *   "message": "Game started successfully"
 * }
 * 
 * @workflow
 * 1. Validate wallet_address is provided
 * 2. Check if user exists in user_lives table
 * 3. Create user with 3 free lives if doesn't exist
 * 4. Check if user has any lives available (free + bonus + paid)
 * 5. Deduct one life (priority: free > bonus > paid)
 * 6. Create new game session with 'active' status
 * 7. Return session ID and remaining lives
 * 
 * @database_tables
 * - user_lives: Stores user life counts and wallet addresses
 * - game_sessions: Stores individual game session records
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { wallet_address, game_type = 'tetris' } = await req.json()

    if (!wallet_address) {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user lives
    let { data: userLives, error: livesError } = await supabaseClient
      .from('user_lives')
      .select('*')
      .eq('wallet_address', wallet_address)
      .single()

    // Create user if doesn't exist
    if (livesError && livesError.code === 'PGRST116') {
      const { data: newUser, error: createError } = await supabaseClient
        .from('user_lives')
        .insert({
          wallet_address,
          free_today: 3,
          bonus_today: 0,
          paid_bank: 0
        })
        .select()
        .single()

      if (createError) {
        throw createError
      }
      userLives = newUser
    } else if (livesError) {
      throw livesError
    }

    // Check if user has lives
    const totalLives = userLives.free_today + userLives.bonus_today + userLives.paid_bank
    if (totalLives <= 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No lives available',
          lives: userLives 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Deduct a life (prioritize free > bonus > paid)
    let updateData: any = {}
    if (userLives.free_today > 0) {
      updateData.free_today = userLives.free_today - 1
    } else if (userLives.bonus_today > 0) {
      updateData.bonus_today = userLives.bonus_today - 1
    } else if (userLives.paid_bank > 0) {
      updateData.paid_bank = userLives.paid_bank - 1
    }

    // Update user lives
    const { data: updatedLives, error: updateError } = await supabaseClient
      .from('user_lives')
      .update(updateData)
      .eq('wallet_address', wallet_address)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Create game session
    const { data: gameSession, error: sessionError } = await supabaseClient
      .from('game_sessions')
      .insert({
        wallet_address,
        game_type,
        started_at: new Date().toISOString(),
        status: 'active'
      })
      .select()
      .single()

    if (sessionError) {
      throw sessionError
    }

    return new Response(
      JSON.stringify({
        success: true,
        session_id: gameSession.id,
        remaining_lives: updatedLives,
        message: 'Game started successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in handle-game-start:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 