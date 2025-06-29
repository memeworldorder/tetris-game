import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getMworBalance, calculateBonusLives, generateDeviceFingerprint } from '@/lib/solana-utils'
import { getGameConfig, trackAnalyticsEvent } from '@/lib/enhanced-database'

// Rate limiting storage (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number, lastReset: number }>()

export async function POST(request: NextRequest) {
  try {
    const { wallet, deviceId, ip, gameId = 'tetris' } = await request.json()

    if (!wallet || !deviceId || !ip) {
      return NextResponse.json(
        { error: 'Missing required fields: wallet, deviceId, ip' },
        { status: 400 }
      )
    }

    // Get game configuration
    const gameConfig = await getGameConfig(gameId)
    if (!gameConfig) {
      return NextResponse.json(
        { error: `Game '${gameId}' not found or inactive` },
        { status: 404 }
      )
    }

    // Generate device fingerprint for rate limiting
    const userAgent = request.headers.get('user-agent') || ''
    const deviceFingerprint = generateDeviceFingerprint(ip, userAgent)
    const rateLimitKey = `${ip}:${deviceFingerprint}:${wallet}`

    // Check rate limits using game configuration
    const freeLifeLimit = gameConfig.lives_config.free_lives_per_day
    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000
    
    const rateLimitEntry = rateLimitStore.get(rateLimitKey)
    if (rateLimitEntry) {
      // Reset counter if it's been more than 24 hours
      if (now - rateLimitEntry.lastReset > oneDayMs) {
        rateLimitEntry.count = 0
        rateLimitEntry.lastReset = now
      }
      
      if (rateLimitEntry.count >= freeLifeLimit) {
        return NextResponse.json(
          { error: 'Daily free life limit exceeded for this IP/device' },
          { status: 429 }
        )
      }
    }

    // Check if user needs daily reset
    const utcMidnight = new Date()
    utcMidnight.setUTCHours(0, 0, 0, 0)

    // Get current lives record
    const { data: existingLives, error: fetchError } = await supabase
      .from('lives')
      .select('*')
      .eq('wallet', wallet)
      .single()

    let livesRecord = existingLives
    let needsReset = false

    if (!livesRecord) {
      // Create new record
      const { data: newRecord, error: createError } = await supabase
        .from('lives')
        .insert([{
          wallet,
          free_today: 0,
          bonus_today: 0,
          paid_bank: 0,
          last_reset: utcMidnight.toISOString()
        }])
        .select()
        .single()

      if (createError) {
        console.error('Error creating lives record:', createError)
        return NextResponse.json(
          { error: 'Failed to create user record' },
          { status: 500 }
        )
      }

      livesRecord = newRecord
    } else {
      // Check if reset is needed
      const lastReset = new Date(livesRecord.last_reset)
      if (lastReset < utcMidnight) {
        needsReset = true
      }
    }

    // Get MWOR balance for bonus calculation
    let mworBalance = 0
    try {
      mworBalance = await getMworBalance(wallet)
    } catch (error) {
      console.error('Error getting MWOR balance:', error)
      // Continue without bonus lives if balance check fails
    }

    // Calculate bonus lives using game configuration
    const bonusLives = Math.min(
      Math.floor(mworBalance / gameConfig.lives_config.bonus_divisor),
      gameConfig.lives_config.bonus_cap
    )

    // Update lives record
    const updates: any = {}
    
    if (needsReset) {
      updates.free_today = 1 // Give 1 free life
      updates.bonus_today = bonusLives
      updates.last_reset = utcMidnight.toISOString()
    } else {
      // Check if user hasn't claimed today's free life
      if (livesRecord.free_today === 0) {
        updates.free_today = 1
      }
      
      // Always update bonus based on current balance
      updates.bonus_today = bonusLives
    }

    const { data: updatedRecord, error: updateError } = await supabase
      .from('lives')
      .update(updates)
      .eq('wallet', wallet)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating lives record:', updateError)
      return NextResponse.json(
        { error: 'Failed to update lives' },
        { status: 500 }
      )
    }

    // Update rate limit counter
    if (rateLimitStore.has(rateLimitKey)) {
      rateLimitStore.get(rateLimitKey)!.count++
    } else {
      rateLimitStore.set(rateLimitKey, { count: 1, lastReset: now })
    }

    // Track analytics event
    await trackAnalyticsEvent({
      game_id: gameId,
      wallet_address: wallet,
      event_type: 'daily_claim',
      event_data: {
        free_lives: updatedRecord.free_today,
        bonus_lives: updatedRecord.bonus_today,
        paid_lives: updatedRecord.paid_bank,
        total_lives: updatedRecord.free_today + updatedRecord.bonus_today + updatedRecord.paid_bank,
        mwor_balance: mworBalance,
        was_reset: needsReset
      },
      ip_address: ip,
      user_agent: request.headers.get('user-agent') || undefined
    })

    return NextResponse.json({
      free: updatedRecord.free_today,
      bonus: updatedRecord.bonus_today,
      paid_bank: updatedRecord.paid_bank,
      total: updatedRecord.free_today + updatedRecord.bonus_today + updatedRecord.paid_bank
    })

  } catch (error) {
    console.error('Error in claimDaily:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 