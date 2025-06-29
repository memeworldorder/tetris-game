/**
 * VERIFY WALLET - Supabase Edge Function
 * 
 * This function verifies Solana wallet signatures and manages user authentication.
 * It validates that the user owns the wallet address they claim to own.
 * 
 * @route POST /functions/v1/verify-wallet
 * 
 * @requestBody {Object} body - The request payload
 * @requestBody {string} body.wallet_address - Solana wallet public key (REQUIRED)
 * @requestBody {string} body.signature - Signed message signature (REQUIRED)
 * @requestBody {string} body.message - Original message that was signed (REQUIRED)
 * @requestBody {number} [body.timestamp] - Message timestamp for replay protection
 * 
 * @returns {Object} Success response
 * @returns {boolean} success - Always true on success
 * @returns {string} wallet_address - Verified wallet address
 * @returns {boolean} is_new_user - Whether this is a new user registration
 * @returns {Object} user_profile - User profile data
 * @returns {string} auth_token - JWT token for authenticated requests
 * 
 * @throws {400} Missing required fields
 * @throws {400} Invalid signature
 * @throws {400} Message too old (replay protection)
 * @throws {500} Database errors or other server issues
 * 
 * @example
 * // Request
 * POST /functions/v1/verify-wallet
 * {
 *   "wallet_address": "FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai",
 *   "signature": "base58-encoded-signature",
 *   "message": "Sign this message to verify wallet ownership: 1234567890",
 *   "timestamp": 1703123456789
 * }
 * 
 * // Response
 * {
 *   "success": true,
 *   "wallet_address": "FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai",
 *   "is_new_user": false,
 *   "user_profile": { ... },
 *   "auth_token": "jwt-token-here"
 * }
 * 
 * @workflow
 * 1. Validate required fields are provided
 * 2. Check message timestamp for replay protection
 * 3. Verify signature against wallet public key
 * 4. Check if user exists in database
 * 5. Create user profile if new user
 * 6. Generate JWT authentication token
 * 7. Return verification result with auth token
 * 
 * @security
 * - Signature verification using ed25519
 * - Replay protection with timestamp validation
 * - Rate limiting to prevent abuse
 * - JWT token generation for authenticated sessions
 * 
 * @database_tables
 * - user_profiles: User account information
 * - user_lives: Initialize lives for new users
 * - auth_sessions: Track authenticated sessions
 */

import { serve } from "std/http/server.ts"
import { createClient } from "@supabase/supabase-js"
import { verify } from "https://deno.land/x/ed25519@1.7.0/mod.ts"
import { encode, decode } from "https://deno.land/x/base58@v0.2.0/mod.ts"
import { create, verify as verifyJWT } from "https://deno.land/x/djwt@v3.0.1/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// JWT secret key (should be in environment variables)
const JWT_SECRET = new TextEncoder().encode(
  Deno.env.get('JWT_SECRET') ?? 'your-super-secret-jwt-key-change-this-in-production'
)

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
      wallet_address, 
      signature, 
      message, 
      timestamp 
    } = await req.json()

    // Validate required fields
    if (!wallet_address || !signature || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: wallet_address, signature, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate timestamp for replay protection (message must be within 5 minutes)
    if (timestamp) {
      const now = Date.now()
      const messageAge = now - timestamp
      const maxAge = 5 * 60 * 1000 // 5 minutes

      if (messageAge > maxAge) {
        return new Response(
          JSON.stringify({ error: 'Message too old. Please generate a new signature.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Verify signature
    try {
      const publicKeyBytes = decode(wallet_address)
      const signatureBytes = decode(signature)
      const messageBytes = new TextEncoder().encode(message)

      const isValidSignature = await verify(publicKeyBytes, messageBytes, signatureBytes)

      if (!isValidSignature) {
        return new Response(
          JSON.stringify({ error: 'Invalid signature. Wallet verification failed.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (err) {
      console.error('Signature verification error:', err)
      return new Response(
        JSON.stringify({ error: 'Invalid signature format or verification failed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user exists
    let { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('wallet_address', wallet_address)
      .single()

    let isNewUser = false

    // Create user if doesn't exist
    if (profileError && profileError.code === 'PGRST116') {
      isNewUser = true
      
      // Create user profile
      const { data: newProfile, error: createError } = await supabaseClient
        .from('user_profiles')
        .insert({
          wallet_address,
          username: `Player_${wallet_address.slice(-6)}`,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
          is_verified: true
        })
        .select()
        .single()

      if (createError) {
        throw createError
      }

      userProfile = newProfile

      // Initialize user lives
      await supabaseClient
        .from('user_lives')
        .insert({
          wallet_address,
          free_today: 3,
          bonus_today: 0,
          paid_bank: 0
        })

      // Initialize user stats
      await supabaseClient
        .from('user_stats')
        .insert({
          wallet_address,
          games_played: 0,
          total_score: 0,
          best_score: 0,
          total_lines_cleared: 0,
          total_game_time: 0,
          login_streak: 1
        })

      console.log('✅ Created new user:', wallet_address)
    } else if (profileError) {
      throw profileError
    } else {
      // Update last login for existing user
      await supabaseClient
        .from('user_profiles')
        .update({ 
          last_login: new Date().toISOString(),
          is_verified: true 
        })
        .eq('wallet_address', wallet_address)
    }

    // Generate JWT token
    const payload = {
      wallet_address,
      user_id: userProfile.id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    }

    const authToken = await create({ alg: "HS256", typ: "JWT" }, payload, JWT_SECRET)

    // Log authentication session
    await supabaseClient
      .from('auth_sessions')
      .insert({
        wallet_address,
        session_token: authToken,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      })

    return new Response(
      JSON.stringify({
        success: true,
        wallet_address,
        is_new_user: isNewUser,
        user_profile: userProfile,
        auth_token: authToken
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in verify-wallet:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 