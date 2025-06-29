import { createClient } from '@supabase/supabase-js'

// Fixed Supabase client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public'
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
})

// Client for server-side operations (admin access)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public'
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Simple GameFi API functions that just work!
export class GameFiAPI {
  
  // Get user lives
  static async getUserLives(walletAddress: string) {
    try {
      console.log('🔍 Getting user lives for:', walletAddress)
      
      let { data, error } = await supabase
        .from('user_lives')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single()

      if (error && error.code === 'PGRST116') {
        // User doesn't exist, create them with default lives
        console.log('👤 Creating new user:', walletAddress)
        const { data: newUser, error: createError } = await supabase
          .from('user_lives')
          .insert({
            wallet_address: walletAddress,
            free_today: 5,
            bonus_today: 0,
            paid_bank: 0
          })
          .select()
          .single()

        if (createError) {
          console.error('❌ Error creating user:', createError)
          throw createError
        }
        return newUser
      }

      if (error) {
        console.error('❌ Error fetching user lives:', error)
        throw error
      }
      
      console.log('✅ Retrieved user lives:', data)
      
      // Check if we need to reset daily lives
      const lastUpdate = new Date(data.updated_at)
      const now = new Date()
      const isNewDay = lastUpdate.toDateString() !== now.toDateString()

      if (isNewDay) {
        console.log('🌅 Resetting daily lives for new day')
        const { data: updatedUser, error: updateError } = await supabase
          .from('user_lives')
          .update({
            free_today: 5,
            bonus_today: 0,
            updated_at: now.toISOString()
          })
          .eq('wallet_address', walletAddress)
          .select()
          .single()

        if (updateError) throw updateError
        return updatedUser
      }

      return data
    } catch (error) {
      console.error('💥 Error in getUserLives:', error)
      throw error
    }
  }

  // Use a life to start game
  static async useLife(walletAddress: string) {
    try {
      console.log('🎮 Using life for:', walletAddress)
      const userLives = await this.getUserLives(walletAddress)
      
      const totalLives = userLives.free_today + userLives.bonus_today + userLives.paid_bank
      
      if (totalLives <= 0) {
        throw new Error('No lives remaining')
      }

      // Deduct lives in order: free -> bonus -> paid
      let newFree = userLives.free_today
      let newBonus = userLives.bonus_today
      let newPaid = userLives.paid_bank

      if (newFree > 0) {
        newFree -= 1
      } else if (newBonus > 0) {
        newBonus -= 1
      } else {
        newPaid -= 1
      }

      const { data, error } = await supabase
        .from('user_lives')
        .update({
          free_today: newFree,
          bonus_today: newBonus,
          paid_bank: newPaid,
          updated_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress)
        .select()
        .single()

      if (error) throw error

      // Create game session
      const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .insert({
          wallet_address: walletAddress,
          started_at: new Date().toISOString(),
          game_type: 'tetris',
          status: 'active'
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      return {
        session_id: session.id,
        remaining_lives: newFree + newBonus + newPaid,
        lives_breakdown: {
          free: newFree,
          bonus: newBonus,
          paid: newPaid
        }
      }
    } catch (error) {
      console.error('💥 Error using life:', error)
      throw error
    }
  }

  // Buy lives with SOL
  static async buyLives(walletAddress: string, livesCount: number, txSignature: string) {
    try {
      // Get current lives first
      const currentLives = await this.getUserLives(walletAddress)
      
      // Add lives to paid bank
      const { data, error } = await supabase
        .from('user_lives')
        .update({
          paid_bank: currentLives.paid_bank + livesCount,
          updated_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress)
        .select()
        .single()

      if (error) throw error

      // Record the transaction
      await supabase
        .from('transactions')
        .insert({
          wallet_address: walletAddress,
          type: 'buy_lives',
          amount_sol: livesCount * 0.001,
          lives_purchased: livesCount,
          tx_signature: txSignature,
          status: 'completed'
        })

      return data
    } catch (error) {
      console.error('💥 Error buying lives:', error)
      throw error
    }
  }

  // End game and save score
  static async endGame(sessionId: string, walletAddress: string, score: number, gameData: any) {
    try {
      // Update game session
      const { error: sessionError } = await supabase
        .from('game_sessions')
        .update({
          score: score,
          ended_at: new Date().toISOString(),
          status: 'completed',
          game_data: gameData
        })
        .eq('id', sessionId)
        .eq('wallet_address', walletAddress)

      if (sessionError) throw sessionError

      // Update or create user stats
      const { data: existingStats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single()

      if (existingStats) {
        // Update existing stats
        await supabase
          .from('user_stats')
          .update({
            total_games: existingStats.total_games + 1,
            total_score: existingStats.total_score + score,
            best_score: Math.max(existingStats.best_score, score),
            updated_at: new Date().toISOString()
          })
          .eq('wallet_address', walletAddress)
      } else {
        // Create new stats
        await supabase
          .from('user_stats')
          .insert({
            wallet_address: walletAddress,
            total_games: 1,
            total_score: score,
            best_score: score
          })
      }

      // Get updated leaderboard position
      const { data: leaderboard } = await supabase
        .from('user_stats')
        .select('wallet_address, best_score')
        .order('best_score', { ascending: false })
        .limit(100)

      const position = leaderboard ? leaderboard.findIndex(user => user.wallet_address === walletAddress) + 1 : 0

      return {
        score,
        leaderboard_position: position,
        session_completed: true
      }
    } catch (error) {
      console.error('💥 Error ending game:', error)
      throw error
    }
  }

  // Get leaderboard
  static async getLeaderboard(limit = 100) {
    try {
      console.log('🏆 Getting leaderboard...')
      const { data, error } = await supabase
        .from('user_stats')
        .select('wallet_address, best_score, total_games, created_at')
        .order('best_score', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('❌ Leaderboard error:', error)
        throw error
      }

      console.log('✅ Leaderboard data:', data)

      return data.map((user, index) => ({
        rank: index + 1,
        wallet_address: user.wallet_address,
        score: user.best_score,
        games_played: user.total_games,
        joined_date: user.created_at
      }))
    } catch (error) {
      console.error('💥 Error getting leaderboard:', error)
      throw error
    }
  }

  // Get user profile
  static async getUserProfile(walletAddress: string) {
    try {
      const [lives, stats, recentGames] = await Promise.all([
        this.getUserLives(walletAddress),
        supabase
          .from('user_stats')
          .select('*')
          .eq('wallet_address', walletAddress)
          .single(),
        supabase
          .from('game_sessions')
          .select('*')
          .eq('wallet_address', walletAddress)
          .order('started_at', { ascending: false })
          .limit(10)
      ])

      return {
        wallet_address: walletAddress,
        lives: lives,
        stats: stats.data || { total_games: 0, total_score: 0, best_score: 0 },
        recent_games: recentGames.data || []
      }
    } catch (error) {
      console.error('💥 Error getting user profile:', error)
      throw error
    }
  }
} 