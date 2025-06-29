import type { UserData, PaymentData } from "@/types/wallet"

// Enhanced types for multi-game support
export interface GameConfig {
  game_id: string
  name: string
  description?: string
  lives_config: {
    max_lives: number
    free_lives_per_day: number
    bonus_divisor: number
    bonus_cap: number
    paid_life_cap: number
    regeneration_hours: number
  }
  scoring_rules: {
    validation_required: boolean
    server_side_simulation: boolean
    anti_cheat_enabled: boolean
  }
  leaderboard_config: {
    daily_enabled: boolean
    weekly_enabled: boolean
    monthly_enabled: boolean
    qualification_percent: number
    ticket_tiers: {
      rank1: number
      ranks2to5: number
      ranks6to10: number
      remaining: number
    }
  }
  raffle_config: {
    enabled: boolean
    daily_winners: number
    max_tickets_per_wallet: number
  }
  payment_config: {
    enabled: boolean
    prices_usd: {
      cheap: number
      mid: number
      high: number
    }
    lives_per_tier: {
      cheap: number
      mid: number
      high: number
    }
  }
  active: boolean
  created_at: string
  updated_at: string
}

export interface GamePlay {
  id: number
  game_id: string
  wallet_address: string
  score: number
  game_data: any
  moves_hash: string
  seed_hash: string
  merkle_proof: string[]
  validated: boolean
  created_at: string
}

export interface AnalyticsEvent {
  id?: number
  game_id?: string
  wallet_address?: string
  event_type: string
  event_data: any
  session_id?: string
  ip_address?: string
  user_agent?: string
  timestamp?: string
}

export interface DailyAnalytics {
  id?: number
  date: string
  game_id?: string
  total_users: number
  total_games_played: number
  total_revenue_usd: number
  avg_session_duration_seconds: number
  top_score: number
  lives_purchased: number
  raffle_tickets_distributed: number
}

export interface AdminUser {
  id: number
  username: string
  email: string
  password_hash?: string
  role: 'super_admin' | 'game_admin' | 'analytics_viewer'
  permissions: string[]
  active: boolean
  last_login?: string
  created_at: string
  updated_at: string
}

// Lazy initialization of database connection
let sql: any = null

async function getDbConnection() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set")
  }

  if (!sql) {
    try {
      const { neon } = await import("@neondatabase/serverless")
      sql = neon(process.env.DATABASE_URL)
    } catch (error) {
      console.error("Failed to initialize database connection:", error)
      throw new Error("Database connection failed")
    }
  }

  return sql
}

// ============================================================================
// GAME CONFIGURATION MANAGEMENT
// ============================================================================

export async function getGameConfig(gameId: string): Promise<GameConfig | null> {
  try {
    const db = await getDbConnection()
    
    const result = await db`
      SELECT * FROM game_configs 
      WHERE game_id = ${gameId} AND active = true
    `
    
    return result.length > 0 ? result[0] : null
  } catch (error) {
    console.error("Database error in getGameConfig:", error)
    throw new Error(`Failed to get game config: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function getAllGameConfigs(): Promise<GameConfig[]> {
  try {
    const db = await getDbConnection()
    
    const result = await db`
      SELECT * FROM game_configs 
      WHERE active = true
      ORDER BY created_at DESC
    `
    
    return result as GameConfig[]
  } catch (error) {
    console.error("Database error in getAllGameConfigs:", error)
    throw new Error(`Failed to get game configs: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function createGameConfig(config: Partial<GameConfig>): Promise<GameConfig> {
  try {
    const db = await getDbConnection()
    
    const result = await db`
      INSERT INTO game_configs (
        game_id, name, description, lives_config, scoring_rules,
        leaderboard_config, raffle_config, payment_config
      )
      VALUES (
        ${config.game_id},
        ${config.name},
        ${config.description || ''},
        ${JSON.stringify(config.lives_config)},
        ${JSON.stringify(config.scoring_rules)},
        ${JSON.stringify(config.leaderboard_config)},
        ${JSON.stringify(config.raffle_config)},
        ${JSON.stringify(config.payment_config)}
      )
      RETURNING *
    `
    
    return result[0] as GameConfig
  } catch (error) {
    console.error("Database error in createGameConfig:", error)
    throw new Error(`Failed to create game config: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function updateGameConfig(gameId: string, updates: Partial<GameConfig>): Promise<GameConfig> {
  try {
    const db = await getDbConnection()
    
    const result = await db`
      UPDATE game_configs 
      SET 
        name = COALESCE(${updates.name}, name),
        description = COALESCE(${updates.description}, description),
        lives_config = COALESCE(${updates.lives_config ? JSON.stringify(updates.lives_config) : null}, lives_config),
        scoring_rules = COALESCE(${updates.scoring_rules ? JSON.stringify(updates.scoring_rules) : null}, scoring_rules),
        leaderboard_config = COALESCE(${updates.leaderboard_config ? JSON.stringify(updates.leaderboard_config) : null}, leaderboard_config),
        raffle_config = COALESCE(${updates.raffle_config ? JSON.stringify(updates.raffle_config) : null}, raffle_config),
        payment_config = COALESCE(${updates.payment_config ? JSON.stringify(updates.payment_config) : null}, payment_config),
        active = COALESCE(${updates.active}, active),
        updated_at = CURRENT_TIMESTAMP
      WHERE game_id = ${gameId}
      RETURNING *
    `
    
    if (result.length === 0) {
      throw new Error("Game config not found")
    }
    
    return result[0] as GameConfig
  } catch (error) {
    console.error("Database error in updateGameConfig:", error)
    throw new Error(`Failed to update game config: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// ============================================================================
// ENHANCED GAME PLAY TRACKING
// ============================================================================

export async function recordGamePlay(play: Omit<GamePlay, 'id' | 'created_at'>): Promise<GamePlay> {
  try {
    const db = await getDbConnection()
    
    const result = await db`
      INSERT INTO plays (
        game_id, wallet_address, score, game_data, 
        moves_hash, seed_hash, merkle_proof, validated
      )
      VALUES (
        ${play.game_id},
        ${play.wallet_address},
        ${play.score},
        ${JSON.stringify(play.game_data)},
        ${play.moves_hash},
        ${play.seed_hash},
        ${play.merkle_proof},
        ${play.validated}
      )
      RETURNING *
    `
    
    // Track analytics event
    await trackAnalyticsEvent({
      game_id: play.game_id,
      wallet_address: play.wallet_address,
      event_type: 'game_end',
      event_data: {
        score: play.score,
        validated: play.validated
      }
    })
    
    return result[0] as GamePlay
  } catch (error) {
    console.error("Database error in recordGamePlay:", error)
    throw new Error(`Failed to record game play: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function getGamePlays(gameId: string, limit: number = 100): Promise<GamePlay[]> {
  try {
    const db = await getDbConnection()
    
    const result = await db`
      SELECT * FROM plays 
      WHERE game_id = ${gameId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
    
    return result as GamePlay[]
  } catch (error) {
    console.error("Database error in getGamePlays:", error)
    throw new Error(`Failed to get game plays: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function getDailyLeaderboard(gameId: string, date?: string): Promise<GamePlay[]> {
  try {
    const db = await getDbConnection()
    const targetDate = date || new Date().toISOString().split('T')[0]
    
    const result = await db`
      SELECT DISTINCT ON (wallet_address) 
        wallet_address, score, created_at, game_id
      FROM plays 
      WHERE game_id = ${gameId} 
        AND DATE(created_at) = ${targetDate}
        AND validated = true
      ORDER BY wallet_address, score DESC
    `
    
    // Sort by score descending and add ranks
    const sorted = result.sort((a: any, b: any) => b.score - a.score)
    return sorted as GamePlay[]
  } catch (error) {
    console.error("Database error in getDailyLeaderboard:", error)
    throw new Error(`Failed to get daily leaderboard: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// ============================================================================
// ANALYTICS TRACKING
// ============================================================================

export async function trackAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
  try {
    const db = await getDbConnection()
    
    await db`
      INSERT INTO analytics_events (
        game_id, wallet_address, event_type, event_data,
        session_id, ip_address, user_agent
      )
      VALUES (
        ${event.game_id || null},
        ${event.wallet_address || null},
        ${event.event_type},
        ${JSON.stringify(event.event_data)},
        ${event.session_id || null},
        ${event.ip_address || null},
        ${event.user_agent || null}
      )
    `
  } catch (error) {
    console.error("Database error in trackAnalyticsEvent:", error)
    // Don't throw here - analytics should not break main functionality
  }
}

export async function getDailyAnalytics(gameId?: string, date?: string): Promise<DailyAnalytics | null> {
  try {
    const db = await getDbConnection()
    const targetDate = date || new Date().toISOString().split('T')[0]
    
    const result = await db`
      SELECT * FROM analytics_daily 
      WHERE date = ${targetDate}
        AND (${gameId ? `game_id = ${gameId}` : 'TRUE'})
    `
    
    return result.length > 0 ? result[0] : null
  } catch (error) {
    console.error("Database error in getDailyAnalytics:", error)
    throw new Error(`Failed to get daily analytics: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function updateDailyAnalytics(gameId: string, date: string): Promise<void> {
  try {
    const db = await getDbConnection()
    
    // Calculate analytics for the day
    const analytics = await db`
      WITH daily_stats AS (
        SELECT 
          COUNT(DISTINCT wallet_address) as unique_users,
          COUNT(*) as total_games,
          MAX(score) as top_score,
          AVG(EXTRACT(EPOCH FROM (
            CASE WHEN ended_at IS NOT NULL 
            THEN ended_at - started_at 
            ELSE INTERVAL '0 seconds' 
            END
          ))) as avg_duration
        FROM game_sessions 
        WHERE game_id = ${gameId} 
          AND DATE(started_at) = ${date}
      ),
      payment_stats AS (
        SELECT 
          COALESCE(SUM(
            CASE 
              WHEN payment_type = 'MWOR' THEN amount_mwor * 0.03 
              ELSE amount_sol * 120 
            END
          ), 0) as revenue,
          SUM(lives_added) as lives_sold
        FROM payments 
        WHERE DATE(created_at) = ${date}
      )
      SELECT 
        ds.unique_users,
        ds.total_games,
        ds.top_score,
        ds.avg_duration,
        ps.revenue,
        ps.lives_sold
      FROM daily_stats ds
      CROSS JOIN payment_stats ps
    `
    
    const stats = analytics[0]
    
    await db`
      INSERT INTO analytics_daily (
        date, game_id, total_users, total_games_played,
        total_revenue_usd, avg_session_duration_seconds, top_score,
        lives_purchased, raffle_tickets_distributed
      )
      VALUES (
        ${date}, ${gameId}, ${stats.unique_users || 0}, 
        ${stats.total_games || 0}, ${stats.revenue || 0},
        ${Math.round(stats.avg_duration || 0)}, ${stats.top_score || 0},
        ${stats.lives_sold || 0}, 0
      )
      ON CONFLICT (date, game_id) DO UPDATE SET
        total_users = EXCLUDED.total_users,
        total_games_played = EXCLUDED.total_games_played,
        total_revenue_usd = EXCLUDED.total_revenue_usd,
        avg_session_duration_seconds = EXCLUDED.avg_session_duration_seconds,
        top_score = EXCLUDED.top_score,
        lives_purchased = EXCLUDED.lives_purchased
    `
  } catch (error) {
    console.error("Database error in updateDailyAnalytics:", error)
    throw new Error(`Failed to update daily analytics: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// ============================================================================
// ADMIN USER MANAGEMENT
// ============================================================================

export async function getAdminUser(username: string, includePassword: boolean = false): Promise<AdminUser | null> {
  try {
    const db = await getDbConnection()
    
    const result = await db`
      SELECT id, username, email, ${includePassword ? db`password_hash,` : db``} role, permissions, active, 
             last_login, created_at, updated_at
      FROM admin_users 
      WHERE username = ${username} AND active = true
    `
    
    return result.length > 0 ? result[0] : null
  } catch (error) {
    console.error("Database error in getAdminUser:", error)
    throw new Error(`Failed to get admin user: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function updateAdminLastLogin(userId: number): Promise<void> {
  try {
    const db = await getDbConnection()
    
    await db`
      UPDATE admin_users 
      SET last_login = CURRENT_TIMESTAMP
      WHERE id = ${userId}
    `
  } catch (error) {
    console.error("Database error in updateAdminLastLogin:", error)
    // Don't throw - this is not critical
  }
}

// ============================================================================
// SYSTEM ALERTS
// ============================================================================

export async function createSystemAlert(
  type: string,
  severity: string,
  title: string,
  message: string,
  metadata: any = {}
): Promise<void> {
  try {
    const db = await getDbConnection()
    
    await db`
      INSERT INTO system_alerts (alert_type, severity, title, message, metadata)
      VALUES (${type}, ${severity}, ${title}, ${message}, ${JSON.stringify(metadata)})
    `
  } catch (error) {
    console.error("Database error in createSystemAlert:", error)
    // Don't throw - alerts should not break main functionality
  }
}

export async function getUnresolvedAlerts(limit: number = 50): Promise<any[]> {
  try {
    const db = await getDbConnection()
    
    const result = await db`
      SELECT * FROM system_alerts 
      WHERE resolved = false
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
    
    return result
  } catch (error) {
    console.error("Database error in getUnresolvedAlerts:", error)
    return []
  }
}

// ============================================================================
// BACKWARD COMPATIBILITY WRAPPERS
// ============================================================================

// Keep existing functions for backward compatibility
export async function createUser(walletAddress: string): Promise<UserData> {
  try {
    const db = await getDbConnection()

    const result = await db`
      INSERT INTO users (wallet_address, total_lives, last_life_lost)
      VALUES (${walletAddress}, 5, NOW())
      ON CONFLICT (wallet_address) DO NOTHING
      RETURNING *
    `

    if (result.length === 0) {
      return getUserByWallet(walletAddress)
    }

    return result[0] as UserData
  } catch (error) {
    console.error("Database error in createUser:", error)
    throw new Error(`Failed to create user: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function getUserByWallet(walletAddress: string): Promise<UserData> {
  try {
    const db = await getDbConnection()

    const result = await db`
      SELECT * FROM users WHERE wallet_address = ${walletAddress}
    `

    if (result.length === 0) {
      throw new Error("User not found")
    }

    return result[0] as UserData
  } catch (error) {
    console.error("Database error in getUserByWallet:", error)
    throw new Error(`Failed to get user: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function updateUserLives(walletAddress: string): Promise<UserData> {
  try {
    const db = await getDbConnection()

    const result = await db`
      UPDATE users 
      SET 
        total_lives = LEAST(5, total_lives + FLOOR(EXTRACT(EPOCH FROM (NOW() - last_life_lost)) / 28800)),
        updated_at = NOW()
      WHERE wallet_address = ${walletAddress}
      RETURNING *
    `

    if (result.length === 0) {
      throw new Error("User not found")
    }

    return result[0] as UserData
  } catch (error) {
    console.error("Database error in updateUserLives:", error)
    throw new Error(`Failed to update user lives: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function useLife(walletAddress: string): Promise<UserData> {
  try {
    const db = await getDbConnection()

    const result = await db`
      UPDATE users 
      SET 
        total_lives = GREATEST(0, total_lives - 1),
        last_life_lost = CASE 
          WHEN total_lives > 0 THEN NOW() 
          ELSE last_life_lost 
        END,
        updated_at = NOW()
      WHERE wallet_address = ${walletAddress} AND total_lives > 0
      RETURNING *
    `

    if (result.length === 0) {
      throw new Error("No lives available or user not found")
    }

    // Track analytics event
    await trackAnalyticsEvent({
      wallet_address: walletAddress,
      event_type: 'life_used',
      event_data: { remaining_lives: result[0].total_lives }
    })

    return result[0] as UserData
  } catch (error) {
    console.error("Database error in useLife:", error)
    throw new Error(`Failed to use life: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function addLives(walletAddress: string, livesToAdd: number): Promise<UserData> {
  try {
    const db = await getDbConnection()

    const result = await db`
      UPDATE users 
      SET 
        total_lives = LEAST(5, total_lives + ${livesToAdd}),
        updated_at = NOW()
      WHERE wallet_address = ${walletAddress}
      RETURNING *
    `

    if (result.length === 0) {
      throw new Error("User not found")
    }

    // Track analytics event
    await trackAnalyticsEvent({
      wallet_address: walletAddress,
      event_type: 'lives_added',
      event_data: { lives_added: livesToAdd, new_total: result[0].total_lives }
    })

    return result[0] as UserData
  } catch (error) {
    console.error("Database error in addLives:", error)
    throw new Error(`Failed to add lives: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function recordPayment(
  walletAddress: string,
  transactionHash: string,
  blockNumber: number,
  paymentType: "SOL" | "MWOR",
  amount: number,
  livesAdded: number,
): Promise<PaymentData> {
  try {
    const db = await getDbConnection()

    const amountSol = paymentType === "SOL" ? amount : null
    const amountMwor = paymentType === "MWOR" ? amount : null

    const result = await db`
      INSERT INTO payments (
        wallet_address, 
        transaction_hash, 
        block_number, 
        amount_sol, 
        amount_mwor, 
        payment_type, 
        lives_added
      )
      VALUES (
        ${walletAddress}, 
        ${transactionHash}, 
        ${blockNumber}, 
        ${amountSol}, 
        ${amountMwor}, 
        ${paymentType}, 
        ${livesAdded}
      )
      ON CONFLICT (transaction_hash) DO NOTHING
      RETURNING *
    `

    if (result.length === 0) {
      throw new Error("Payment already recorded")
    }

    // Track analytics event
    await trackAnalyticsEvent({
      wallet_address: walletAddress,
      event_type: 'payment',
      event_data: {
        payment_type: paymentType,
        amount,
        lives_added: livesAdded,
        transaction_hash: transactionHash
      }
    })

    return result[0] as PaymentData
  } catch (error) {
    console.error("Database error in recordPayment:", error)
    throw new Error(`Failed to record payment: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function startGameSession(walletAddress: string, gameId: string = 'tetris'): Promise<number> {
  try {
    const db = await getDbConnection()

    const result = await db`
      INSERT INTO game_sessions (wallet_address, game_id)
      VALUES (${walletAddress}, ${gameId})
      RETURNING id
    `

    // Track analytics event
    await trackAnalyticsEvent({
      game_id: gameId,
      wallet_address: walletAddress,
      event_type: 'game_start',
      event_data: { session_id: result[0].id }
    })

    return result[0].id
  } catch (error) {
    console.error("Database error in startGameSession:", error)
    throw new Error(`Failed to start game session: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function endGameSession(
  sessionId: number,
  score: number,
  level: number,
  linesCleared: number,
): Promise<void> {
  try {
    const db = await getDbConnection()

    await db`
      UPDATE game_sessions 
      SET 
        score = ${score},
        level = ${level},
        lines_cleared = ${linesCleared},
        ended_at = NOW()
      WHERE id = ${sessionId}
    `
  } catch (error) {
    console.error("Database error in endGameSession:", error)
    throw new Error(`Failed to end game session: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
} 