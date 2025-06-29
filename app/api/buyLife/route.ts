import { NextRequest, NextResponse } from 'next/server'
import { generateTempPaymentAddress, calculateLifePrices } from '@/lib/solana-utils'
import { supabase } from '@/lib/supabase'
import { getGameConfig } from '@/lib/enhanced-database'

// Store temp payment addresses (in production, use database or Redis)
const tempAddressStore = new Map<string, {
  wallet: string
  nonce: number
  priceInfo: any
  timestamp: number
  expiresAt: number
}>()

export async function POST(request: NextRequest) {
  try {
    const { wallet, gameId = 'tetris' } = await request.json()
    

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      )
    }

    // Get game configuration for paid life cap and pricing
    const gameConfig = await getGameConfig(gameId)
    const paidLifeCap = gameConfig?.lives_config?.paid_life_cap || parseInt(process.env.PAID_LIFE_CAP || '10')
    
    // Get current lives record to check paid lives used today
    const { data: livesRecord } = await supabase
      .from('lives')
      .select('*')
      .eq('wallet', wallet)
      .single()

    // Check how many paid lives were purchased today
    const utcMidnight = new Date()
    utcMidnight.setUTCHours(0, 0, 0, 0)

    const { data: todayPayments } = await supabase
      .from('payments')
      .select('lives_bought')
      .eq('wallet', wallet)
      .gte('created_at', utcMidnight.toISOString())

    const totalPaidToday = todayPayments?.reduce((sum: number, p: any) => sum + p.lives_bought, 0) || 0

    if (totalPaidToday >= paidLifeCap) {
      return NextResponse.json(
        { error: `Daily paid life limit of ${paidLifeCap} reached` },
        { status: 429 }
      )
    }

    // Get current price information
    const priceInfo = await calculateLifePrices()
    
    // Generate unique nonce for this payment request  
    const nonce = Date.now() + Math.floor(Math.random() * 1000)
    
    // Generate temporary payment address
    const tempAddress = generateTempPaymentAddress(wallet, nonce)
    
    // Store the payment request (expires in 15 minutes)
    const expiresAt = Date.now() + (15 * 60 * 1000)
    tempAddressStore.set(tempAddress.toString(), {
      wallet,
      nonce,
      priceInfo,
      timestamp: Date.now(),
      expiresAt
    })

    // Clean up expired entries
    for (const [key, value] of tempAddressStore.entries()) {
      if (Date.now() > value.expiresAt) {
        tempAddressStore.delete(key)
      }
    }

    // Use game-specific pricing if available, otherwise use defaults
    const gamePaymentConfig = gameConfig?.payment_config
    const priceUSD = gamePaymentConfig?.prices_usd || {
      cheap: parseFloat(process.env.PAID_LIFE_USD_CHEAP || '0.03'),
      mid: parseFloat(process.env.PAID_LIFE_USD_MID || '0.09'),
      high: parseFloat(process.env.PAID_LIFE_USD_HIGH || '0.27')
    }
    const livesPerTier = gamePaymentConfig?.lives_per_tier || {
      cheap: 1,
      mid: 3,
      high: 10
    }

    // Return payment information
    return NextResponse.json({
      payAddr: tempAddress.toString(),
      gameId,
      priceMWOR: {
        cheap: priceInfo.cheapPriceMwor,
        mid: priceInfo.midPriceMwor,
        high: priceInfo.highPriceMwor
      },
      priceUSD,
      lives: livesPerTier,
      mworPriceUsd: priceInfo.mworPriceUsd,
      expiresAt,
      remainingPaidLives: paidLifeCap - totalPaidToday,
      gameConfig: gameConfig ? {
        name: gameConfig.name,
        payment_enabled: gameConfig.payment_config?.enabled !== false
      } : null
    })

  } catch (error) {
    console.error('Error in buyLife:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper endpoint to get temp address info (for webhook processing)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter required' },
        { status: 400 }
      )
    }

    const addressInfo = tempAddressStore.get(address)
    
    if (!addressInfo) {
      return NextResponse.json(
        { error: 'Address not found or expired' },
        { status: 404 }
      )
    }

    if (Date.now() > addressInfo.expiresAt) {
      tempAddressStore.delete(address)
      return NextResponse.json(
        { error: 'Address expired' },
        { status: 410 }
      )
    }

    return NextResponse.json(addressInfo)

  } catch (error) {
    console.error('Error getting temp address info:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 