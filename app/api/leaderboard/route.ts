import { NextRequest, NextResponse } from 'next/server'
import { getDailyLeaderboard, getGameConfig, trackAnalyticsEvent } from '@/lib/enhanced-database'
import { GameFiAPI } from '@/lib/supabase-client'

interface LeaderboardEntry {
  rank: number
  wallet_address: string
  score: number
  timestamp: string
  displayWallet: string
  gameData?: any
}

interface LeaderboardStats {
  totalPlays: number
  totalPlayers: number
  averageScore: number
  topScore: number
  period: {
    type: string
    start: string
    end: string
    nextReset: string
  }
}

function calculatePeriodBounds(period: string, date?: string): { start: Date, end: Date, nextReset: Date } {
  const referenceDate = date ? new Date(date) : new Date()
  
  switch (period) {
    case 'daily': {
      const start = new Date(referenceDate)
      start.setUTCHours(0, 0, 0, 0)
      
      const end = new Date(start)
      end.setUTCDate(end.getUTCDate() + 1)
      
      const nextReset = new Date(end)
      
      return { start, end, nextReset }
    }
    
    case 'weekly': {
      const start = new Date(referenceDate)
      const dayOfWeek = start.getUTCDay()
      start.setUTCDate(start.getUTCDate() - dayOfWeek) // Start of week (Sunday)
      start.setUTCHours(0, 0, 0, 0)
      
      const end = new Date(start)
      end.setUTCDate(end.getUTCDate() + 7)
      
      const nextReset = new Date(end)
      
      return { start, end, nextReset }
    }
    
    case 'monthly': {
      const start = new Date(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1)
      
      const end = new Date(start)
      end.setUTCMonth(end.getUTCMonth() + 1)
      
      const nextReset = new Date(end)
      
      return { start, end, nextReset }
    }
    
    default:
      throw new Error(`Invalid period: ${period}`)
  }
}

async function getDbConnection() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set")
  }

  const { neon } = await import("@neondatabase/serverless")
  return neon(process.env.DATABASE_URL)
}

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100')
    const game_type = request.nextUrl.searchParams.get('game_type') || 'all'
    const period = request.nextUrl.searchParams.get('period') || 'all_time'

    console.log(`🏆 Getting ${period} leaderboard for ${game_type} (limit: ${limit})`)

    const leaderboard = await GameFiAPI.getLeaderboard(limit)

    return NextResponse.json({
      success: true,
      data: leaderboard,
      meta: {
        limit,
        game_type,
        period,
        count: leaderboard.length
      }
    })
  } catch (error) {
    console.error('Leaderboard API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get leaderboard',
      details: (error as Error).message
    }, { status: 500 })
  }
}

// POST endpoint for manual leaderboard updates/snapshots
export async function POST(request: NextRequest) {
  try {
    const { gameId, period, force = false } = await request.json()

    if (!gameId || !period) {
      return NextResponse.json(
        { error: 'gameId and period are required' },
        { status: 400 }
      )
    }

    // Validate period
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period. Must be daily, weekly, or monthly' },
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

    // Calculate period bounds
    const { start, end } = calculatePeriodBounds(period)

    // Get database connection
    const db = await getDbConnection()

    // Create leaderboard snapshot
    const snapshotQuery = await db`
      WITH ranked_plays AS (
        SELECT DISTINCT ON (wallet_address)
          wallet_address,
          score,
          game_data,
          created_at,
          ROW_NUMBER() OVER (ORDER BY score DESC) as rank
        FROM plays 
        WHERE game_id = ${gameId}
          AND created_at >= ${start.toISOString()}
          AND created_at < ${end.toISOString()}
          AND validated = true
        ORDER BY wallet_address, score DESC
      )
      INSERT INTO leaderboards (
        game_id,
        period_type,
        period_start,
        period_end,
        wallet_address,
        score,
        rank,
        tickets_earned
      )
      SELECT 
        ${gameId},
        ${period},
        ${start.toISOString()},
        ${end.toISOString()},
        wallet_address,
        score,
        rank,
        CASE 
          WHEN rank = 1 THEN ${gameConfig.leaderboard_config.ticket_tiers.rank1}
          WHEN rank >= 2 AND rank <= 5 THEN ${gameConfig.leaderboard_config.ticket_tiers.ranks2to5}
          WHEN rank >= 6 AND rank <= 10 THEN ${gameConfig.leaderboard_config.ticket_tiers.ranks6to10}
          ELSE ${gameConfig.leaderboard_config.ticket_tiers.remaining}
        END
      FROM ranked_plays
      ON CONFLICT (game_id, period_type, period_start, wallet_address) 
      DO UPDATE SET
        score = EXCLUDED.score,
        rank = EXCLUDED.rank,
        tickets_earned = EXCLUDED.tickets_earned
      RETURNING *
    `

    // Track snapshot creation
    await trackAnalyticsEvent({
      game_id: gameId,
      event_type: 'leaderboard_snapshot',
      event_data: {
        period,
        entries_created: snapshotQuery.length,
        force_update: force
      }
    })

    return NextResponse.json({
      message: 'Leaderboard snapshot created successfully',
      period: {
        type: period,
        start: start.toISOString(),
        end: end.toISOString()
      },
      entriesCreated: snapshotQuery.length
    })

  } catch (error) {
    console.error('Error creating leaderboard snapshot:', error)
    return NextResponse.json(
      { error: 'Failed to create leaderboard snapshot' },
      { status: 500 }
    )
  }
} 