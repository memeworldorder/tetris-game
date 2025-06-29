import { NextRequest, NextResponse } from 'next/server'
import { GameFiAPI } from '@/lib/supabase-client'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// 🚀 Simple GameFi API - No microservices needed!
export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get('action')
    const wallet = request.nextUrl.searchParams.get('wallet')

    switch (action) {
      case 'lives':
        if (!wallet) {
          return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
        }
        const lives = await GameFiAPI.getUserLives(wallet)
        return NextResponse.json({ success: true, data: lives })

      case 'profile':
        if (!wallet) {
          return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
        }
        const profile = await GameFiAPI.getUserProfile(wallet)
        return NextResponse.json({ success: true, data: profile })

      case 'leaderboard':
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100')
        const leaderboard = await GameFiAPI.getLeaderboard(limit)
        return NextResponse.json({ success: true, data: leaderboard })

      case 'health':
        return NextResponse.json({ 
          success: true, 
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: 'simple-gamefi-api',
          message: 'No microservices needed - just works!'
        })

      default:
        return NextResponse.json({ 
          error: 'Invalid action',
          available_actions: ['lives', 'profile', 'leaderboard', 'health']
        }, { status: 400 })
    }
  } catch (error) {
    console.error('GameFi API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: (error as Error).message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, wallet_address } = body

    if (!wallet_address) {
      return NextResponse.json({ error: 'wallet_address required' }, { status: 400 })
    }

    switch (action) {
      case 'use_life':
        const lifeResult = await GameFiAPI.useLife(wallet_address)
        return NextResponse.json({ success: true, data: lifeResult })

      case 'buy_lives':
        const { lives_count, tx_signature } = body
        if (!lives_count || !tx_signature) {
          return NextResponse.json({ 
            error: 'lives_count and tx_signature required' 
          }, { status: 400 })
        }
        const buyResult = await GameFiAPI.buyLives(wallet_address, lives_count, tx_signature)
        return NextResponse.json({ success: true, data: buyResult })

      case 'end_game':
        const { session_id, score, game_data } = body
        if (!session_id || score === undefined) {
          return NextResponse.json({ 
            error: 'session_id and score required' 
          }, { status: 400 })
        }
        const gameResult = await GameFiAPI.endGame(session_id, wallet_address, score, game_data)
        return NextResponse.json({ success: true, data: gameResult })

      default:
        return NextResponse.json({ 
          error: 'Invalid action',
          available_actions: ['use_life', 'buy_lives', 'end_game']
        }, { status: 400 })
    }
  } catch (error) {
    console.error('GameFi API POST error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: (error as Error).message
    }, { status: 500 })
  }
} 