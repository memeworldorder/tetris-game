// Supabase client – migrated from monolith
/* eslint-disable */

import { createClient } from '@supabase/supabase-js'
import { testSupabase, setupTestDatabase, isTestEnvironment } from './test-database'

// =============================================================================
// SUPABASE CLIENT CONFIGURATION
// =============================================================================

// TypeScript interfaces for database tables
export interface LivesRow {
  id: string
  wallet_address: string
  free_today: number
  bonus_today: number
  paid_bank: number
  last_claim: string | null
  created_at: string
  updated_at: string
}

export interface PaymentsRow {
  id: string
  wallet_address: string
  tx_sig: string
  amount_usd: number
  amount_sol: number
  amount_mwor: number
  lives_bought: number
  status: 'pending' | 'confirmed' | 'failed'
  created_at: string
  confirmed_at: string | null
}

export interface PlaysRow {
  id: string
  wallet: string
  score: number
  seed_hash: string
  move_hash: string
  signature: string | null
  created_at: string
}

export interface VRFSeedsRow {
  id: string
  date: string
  seed: string
  proof: string | null
  vrf_signature: string | null
  created_at: string
}

export interface ScoreProofsRow {
  id: string
  wallet_address: string
  score: number
  seed_hash: string
  move_count: number
  signature: string
  timestamp: string
  created_at: string
}

export interface GameSessionsRow {
  id: string
  wallet_address: string
  session_id: string
  seed_hash: string
  revealed_seed: string | null
  status: 'active' | 'completed' | 'abandoned'
  created_at: string
  completed_at: string | null
}

export interface MoveLogsRow {
  id: string
  session_id: string
  move_index: number
  move_type: string
  timestamp: string
  board_state: string | null
  created_at: string
}

export interface DailyRafflesRow {
  id: string
  date: string
  winner_wallet: string
  winner_score: number
  winner_rank: number
  total_tickets: number
  merkle_root: string
  vrf_seed: string
  qualified_wallets_count: number
  created_at: string
}

export interface RaffleQualifiedWalletsRow {
  id: string
  date: string
  wallet_address: string
  score: number
  rank: number
  tickets: number
  tier: string
  created_at: string
}

export interface RaffleConfigRow {
  id: string
  config_key: string
  config_value: string
  updated_at: string
  created_at: string
}

export interface RateLimitsRow {
  id: string
  identifier: string
  action: string
  count: number
  window_start: string
  created_at: string
}

export interface SuspiciousActivityRow {
  id: string
  wallet_address: string
  activity_type: string
  details: string
  confidence_score: number
  flagged_at: string
  reviewed: boolean
  created_at: string
}

export interface DailyStatsRow {
  id: string
  date: string
  total_players: number
  total_games: number
  average_score: number
  highest_score: number
  total_lives_claimed: number
  total_lives_bought: number
  revenue_usd: number
  qualified_players: number
  created_at: string
}

// Database interface
export interface Database {
  public: {
    Tables: {
      lives: { Row: LivesRow; Insert: Omit<LivesRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<LivesRow, 'id' | 'created_at'>> }
      payments: { Row: PaymentsRow; Insert: Omit<PaymentsRow, 'id' | 'created_at'>; Update: Partial<Omit<PaymentsRow, 'id' | 'created_at'>> }
      plays: { Row: PlaysRow; Insert: Omit<PlaysRow, 'id' | 'created_at'>; Update: Partial<Omit<PlaysRow, 'id' | 'created_at'>> }
      vrf_seeds: { Row: VRFSeedsRow; Insert: Omit<VRFSeedsRow, 'id' | 'created_at'>; Update: Partial<Omit<VRFSeedsRow, 'id' | 'created_at'>> }
      score_proofs: { Row: ScoreProofsRow; Insert: Omit<ScoreProofsRow, 'id' | 'created_at'>; Update: Partial<Omit<ScoreProofsRow, 'id' | 'created_at'>> }
      game_sessions: { Row: GameSessionsRow; Insert: Omit<GameSessionsRow, 'id' | 'created_at'>; Update: Partial<Omit<GameSessionsRow, 'id' | 'created_at'>> }
      move_logs: { Row: MoveLogsRow; Insert: Omit<MoveLogsRow, 'id' | 'created_at'>; Update: Partial<Omit<MoveLogsRow, 'id' | 'created_at'>> }
      daily_raffles: { Row: DailyRafflesRow; Insert: Omit<DailyRafflesRow, 'id' | 'created_at'>; Update: Partial<Omit<DailyRafflesRow, 'id' | 'created_at'>> }
      raffle_qualified_wallets: { Row: RaffleQualifiedWalletsRow; Insert: Omit<RaffleQualifiedWalletsRow, 'id' | 'created_at'>; Update: Partial<Omit<RaffleQualifiedWalletsRow, 'id' | 'created_at'>> }
      raffle_config: { Row: RaffleConfigRow; Insert: Omit<RaffleConfigRow, 'id' | 'created_at'>; Update: Partial<Omit<RaffleConfigRow, 'id' | 'created_at'>> }
      rate_limits: { Row: RateLimitsRow; Insert: Omit<RateLimitsRow, 'id' | 'created_at'>; Update: Partial<Omit<RateLimitsRow, 'id' | 'created_at'>> }
      suspicious_activity: { Row: SuspiciousActivityRow; Insert: Omit<SuspiciousActivityRow, 'id' | 'created_at'>; Update: Partial<Omit<SuspiciousActivityRow, 'id' | 'created_at'>> }
      daily_stats: { Row: DailyStatsRow; Insert: Omit<DailyStatsRow, 'id' | 'created_at'>; Update: Partial<Omit<DailyStatsRow, 'id' | 'created_at'>> }
    }
  }
}

// Environment configuration
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

// =============================================================================
// SUPABASE CLIENT INITIALIZATION
// =============================================================================

let supabaseClient: any

if (isTestEnvironment()) {
  // Use test database when no production database is configured
  console.log('🧪 Using test database for development/testing')
  setupTestDatabase()
  supabaseClient = testSupabase
} else if (supabaseUrl && supabaseKey) {
  // Use real Supabase in production
  console.log('🔗 Using Supabase database')
  supabaseClient = createClient<Database>(supabaseUrl, supabaseKey)
} else {
  // Fallback to test database with warning
  console.warn('⚠️ No database configuration found, falling back to test database')
  console.warn('Set SUPABASE_URL and SUPABASE_ANON_KEY for production usage')
  setupTestDatabase()
  supabaseClient = testSupabase
}

export const supabase = supabaseClient

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Check if using test database
export const isUsingTestDatabase = () => {
  return isTestEnvironment() || supabaseClient === testSupabase
}

// Get database type
export const getDatabaseType = () => {
  if (isUsingTestDatabase()) {
    return 'test'
  } else if (supabaseUrl && supabaseKey) {
    return 'supabase'
  } else {
    return 'unknown'
  }
}

// Database health check
export const checkDatabaseHealth = async () => {
  try {
    if (isUsingTestDatabase()) {
      // Test database health check
      const { data, error } = await supabase.from('lives').select('*').limit(1)
      return {
        healthy: !error,
        type: 'test',
        error: error?.message,
        recordCount: data?.length || 0,
      }
    } else {
      // Real Supabase health check
      const { data, error } = await supabase.from('lives').select('count').limit(1)
      return {
        healthy: !error,
        type: 'supabase',
        error: error?.message,
        connected: true,
      }
    }
  } catch (error) {
    return {
      healthy: false,
      type: getDatabaseType(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// =============================================================================
// MIGRATION UTILITIES (FOR TESTING)
// =============================================================================

// Initialize test data for VRF testing (no longer adds dummy data)
export const initializeTestData = async () => {
  if (!isUsingTestDatabase()) {
    console.warn('⚠️ initializeTestData() only works with test database')
    return
  }

  console.log('📊 Test database ready - no dummy data loaded')
  console.log('💡 Connect wallets and play games to populate with real data')
}

// Types are exported as interfaces above