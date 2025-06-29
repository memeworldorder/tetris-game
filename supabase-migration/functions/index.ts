import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)


export async function userLives(filters = {}) {
  let query = supabase.from('user_lives')
  
  // Apply filters
  if (filters.wallet_address) query = query.eq('wallet_address', filters.wallet_address)
  
  
  
  
  const { data, error } = await query.select()
  
  if (error) throw error
  return data
}

export async function userProfile(filters = {}) {
  let query = supabase.from('users')
  
  // Apply filters
  if (filters.wallet_address) query = query.eq('wallet_address', filters.wallet_address)
  
  
  
  
  const { data, error } = await query.select()
  
  if (error) throw error
  return data
}

export async function userStats(filters = {}) {
  let query = supabase.from('user_game_stats')
  
  // Apply filters
  if (filters.wallet_address) query = query.eq('wallet_address', filters.wallet_address)
  
  
  
  
  const { data, error } = await query.select()
  
  if (error) throw error
  return data
}

export async function gameStart(params) {
  const { data, error } = await supabase.rpc('handle_game_start', {
    wallet_address: params.wallet_address,
    game_id: params.game_id
  })
  
  if (error) throw error
  return data
}

export async function gameEnd(params) {
  const { data, error } = await supabase.rpc('handle_game_end', {
    session_id: params.session_id,
    score: params.score,
    moves: params.moves
  })
  
  if (error) throw error
  return data
}

export async function leaderboardDaily(filters = {}) {
  let query = supabase.from('daily_leaderboard')
  
  // Apply filters
  
  
  query = query.order('score', { ascending: false })
  query = query.limit(100)
  
  const { data, error } = await query.select()
  
  if (error) throw error
  return data
}

export async function leaderboardWeekly(filters = {}) {
  let query = supabase.from('weekly_leaderboard')
  
  // Apply filters
  
  
  query = query.order('total_score', { ascending: false })
  query = query.limit(100)
  
  const { data, error } = await query.select()
  
  if (error) throw error
  return data
}

export async function paymentsProcess(params) {
  const { data, error } = await supabase.rpc('process_payment', {
    wallet_address: params.wallet_address,
    amount: params.amount,
    signature: params.signature
  })
  
  if (error) throw error
  return data
}

export async function communityAchievements(filters = {}) {
  let query = supabase.from('user_achievements')
  
  // Apply filters
  if (filters.wallet_address) query = query.eq('wallet_address', filters.wallet_address)
  
  
  
  
  const { data, error } = await query.select()
  
  if (error) throw error
  return data
}

export async function communityReferrals(filters = {}) {
  let query = supabase.from('referrals')
  
  // Apply filters
  if (filters.referrer_wallet) query = query.eq('referrer_wallet', filters.referrer_wallet)
  if (filters.referred_wallet) query = query.eq('referred_wallet', filters.referred_wallet)
  
  
  
  
  const { data, error } = await query.select()
  
  if (error) throw error
  return data
}
