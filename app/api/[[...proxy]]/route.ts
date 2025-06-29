import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// This ONE file replaces ALL your microservices
const handlers: Record<string, (req: NextRequest) => Promise<any>> = {
  // USER SERVICE ENDPOINTS
  'api/user/lives': async (req: NextRequest) => {
    const { searchParams } = new URL(req.url)
    const wallet = searchParams.get('wallet')
    
    const { data, error } = await supabase
      .from('user_lives')
      .select('*')
      .eq('wallet_address', wallet)
      .single()
    
    if (error) {
      // Create default user if not exists
      const { data: newUser } = await supabase
        .from('user_lives')
        .insert({ wallet_address: wallet, lives: 5 })
        .select()
        .single()
      return newUser
    }
    
    return { lives: data.lives, wallet_address: wallet }
  },
  
  // GAME ENGINE ENDPOINTS
  'api/game/start': async (req: NextRequest) => {
    const body = await req.json()
    const { data, error } = await supabase.rpc('handle_game_start', {
      p_wallet_address: body.wallet_address,
      p_game_id: body.game_id
    })
    
    if (error) throw error
    return data
  },
  
  'api/game/end': async (req: NextRequest) => {
    const body = await req.json()
    const { data, error } = await supabase.rpc('handle_game_end', {
      p_session_id: body.session_id,
      p_score: body.score,
      p_moves: body.moves || []
    })
    
    if (error) throw error
    return data
  },
  
  // LEADERBOARD ENDPOINTS
  'api/leaderboard/daily': async () => {
    const { data } = await supabase
      .from('daily_leaderboard')
      .select('*')
      .limit(100)
    
    return { leaderboard: data || [] }
  },
  
  'api/leaderboard/weekly': async () => {
    const { data } = await supabase
      .from('weekly_leaderboard')
      .select('*')
      .limit(100)
    
    return { leaderboard: data || [] }
  },
  
  // PAYMENT ENDPOINTS
  'api/buyLife': async (req: NextRequest) => {
    const body = await req.json()
    const { data, error } = await supabase.rpc('process_payment', {
      p_wallet_address: body.wallet_address,
      p_amount: body.amount,
      p_signature: body.signature,
      p_type: 'life_purchase'
    })
    
    if (error) throw error
    return data
  },
  
  // COMMUNITY ENDPOINTS
  'api/community/profile': async (req: NextRequest) => {
    const { searchParams } = new URL(req.url)
    const wallet = searchParams.get('walletAddress')
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('wallet_address', wallet)
      .single()
    
    return profile || { wallet_address: wallet, username: 'Anonymous' }
  },
  
  'api/community/achievements': async (req: NextRequest) => {
    const { searchParams } = new URL(req.url)
    const wallet = searchParams.get('walletAddress')
    
    // For now, return mock data - can be replaced with real query later
    return {
      achievements: [
        { id: 'first_game', name: 'First Game', unlocked: true },
        { id: 'high_scorer', name: 'High Scorer', unlocked: false }
      ]
    }
  },
  
  // DAILY RESET (Called by Vercel Cron)
  'api/resetMidnight': async (req: NextRequest) => {
    const { data, error } = await supabase.rpc('daily_reset')
    if (error) throw error
    return data
  }
}

// Universal GET handler
export async function GET(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const handler = handlers[pathname]
  
  if (!handler) {
    return NextResponse.json(
      { error: `Endpoint ${pathname} not found` },
      { status: 404 }
    )
  }
  
  try {
    const data = await handler(req)
    return NextResponse.json(data)
  } catch (error) {
    console.error(`Error in ${pathname}:`, error)
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Universal POST handler
export async function POST(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const handler = handlers[pathname]
  
  if (!handler) {
    return NextResponse.json(
      { error: `Endpoint ${pathname} not found` },
      { status: 404 }
    )
  }
  
  try {
    const data = await handler(req)
    return NextResponse.json(data)
  } catch (error) {
    console.error(`Error in ${pathname}:`, error)
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    )
  }
} 