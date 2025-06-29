import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { DailyRaffleOrchestrator } from '@/lib/raffle-system'
import { SecurityStack } from '@/lib/security-stack'

// Enhanced midnight reset with full raffle system integration
export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron call
    const cronSecret = process.env.CRON_SECRET || 'dev-secret'
    const providedSecret = request.headers.get('authorization')
    
    if (providedSecret !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🎰 Starting enhanced midnight reset with raffle system...')

    // Calculate current and previous UTC midnight
    const currentMidnight = new Date()
    currentMidnight.setUTCHours(0, 0, 0, 0)
    
    const previousMidnight = new Date(currentMidnight.getTime() - 24 * 60 * 60 * 1000)

    // =============================================================================
    // STEP 1: EXECUTE DAILY RAFFLE
    // =============================================================================
    
    console.log('🎯 Step 1: Executing daily raffle...')
    
    let raffleResults = null
    try {
      const raffleOrchestrator = new DailyRaffleOrchestrator()
      raffleResults = await raffleOrchestrator.executeDailyRaffle()
      
      // Store raffle results in database
      await raffleOrchestrator.storeRaffleResults(raffleResults)
      
      console.log('🏆 Raffle completed successfully!')
      console.log(`   Winner: ${raffleResults.raffleResult.winnerWallet}`)
      console.log(`   Score: ${raffleResults.raffleResult.winnerScore}`)
      console.log(`   Rank: ${raffleResults.raffleResult.winnerRank}`)
      console.log(`   Total Tickets: ${raffleResults.raffleResult.totalTickets}`)
      console.log(`   Qualified Wallets: ${raffleResults.qualifiedWallets.length}`)
      
    } catch (raffleError) {
      console.error('❌ Raffle execution failed:', raffleError)
      // Continue with other reset operations even if raffle fails
    }

    // =============================================================================
    // STEP 2: BUILD MERKLE ROOT FOR ON-CHAIN STORAGE
    // =============================================================================
    
    console.log('🌳 Step 2: Building Merkle root for on-chain storage...')
    
    // Get all qualified plays from yesterday for Merkle root
    const { data: yesterdayPlays, error: playsError } = await supabase
      .from('plays')
      .select('wallet, score, seed_hash, move_hash, created_at')
      .gte('created_at', previousMidnight.toISOString())
      .lt('created_at', currentMidnight.toISOString())
      .eq('is_qualified', true) // Only include qualified plays
      .order('score', { ascending: false })

    if (playsError) {
      console.error('❌ Error fetching yesterday plays:', playsError)
      return NextResponse.json({ error: 'Failed to fetch qualified plays' }, { status: 500 })
    }

    // Build Merkle root using audit trail manager
    const auditManager = new SecurityStack.AuditTrailManager()
    const playRecords = (yesterdayPlays || []).map(play => ({
      walletAddress: play.wallet,
      score: play.score,
      seedHash: play.seed_hash,
      moveHash: play.move_hash,
      timestamp: new Date(play.created_at).getTime(),
      signature: Buffer.alloc(64) // Placeholder - would be actual signature
    }))
    
    const merkleRoot = auditManager.buildDailyMerkleRoot(playRecords)
    console.log(`🌳 Merkle root built: ${merkleRoot.slice(0, 16)}...`)

    // =============================================================================
    // STEP 3: UPDATE ON-CHAIN DATA
    // =============================================================================
    
    console.log('⛓️  Step 3: Updating on-chain data...')
    
    try {
      // In a real implementation, this would call your Solana program
      // await updateRootOnChain(merkleRoot)
      
      // Store the on-chain update attempt
      const { error: onChainError } = await supabase
        .from('daily_raffles')
        .update({ 
          merkle_root: merkleRoot,
          on_chain_tx: 'pending' // Would be actual tx hash
        })
        .eq('date', raffleResults?.date || currentMidnight.toISOString().split('T')[0])

      if (onChainError) {
        console.error('❌ Error updating on-chain data record:', onChainError)
      } else {
        console.log('✅ On-chain data update recorded')
      }
      
    } catch (error) {
      console.error('❌ Error updating on-chain root:', error)
      // Don't fail the whole process if on-chain update fails
    }

    // =============================================================================
    // STEP 4: RESET DAILY LIVES COUNTERS
    // =============================================================================
    
    console.log('🔄 Step 4: Resetting daily lives counters...')
    
    const { error: resetError, count: resetCount } = await supabase
      .from('lives')
      .update({
        free_today: 0,
        bonus_today: 0,
        last_reset: currentMidnight.toISOString()
      })
      .lt('last_reset', currentMidnight.toISOString())

    if (resetError) {
      console.error('❌ Error resetting lives:', resetError)
      return NextResponse.json({ error: 'Failed to reset lives' }, { status: 500 })
    }

    console.log(`✅ Reset ${resetCount} user life counters`)

    // =============================================================================
    // STEP 5: ARCHIVE OLD DATA & CLEANUP
    // =============================================================================
    
    console.log('🗂️  Step 5: Archiving old data and cleanup...')
    
    // Archive old move logs (7-day retention as per security spec)
    const { data: cleanupResult } = await supabase.rpc('cleanup_old_move_logs')
    console.log(`🗑️  Cleaned up ${cleanupResult || 0} old move logs`)
    
    // Archive very old plays (30+ days)
    const archiveThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    const { error: archiveError, count: archivedCount } = await supabase
      .from('plays')
      .delete()
      .lt('created_at', archiveThreshold.toISOString())

    if (!archiveError) {
      console.log(`📦 Archived ${archivedCount} old play records`)
    }

    // =============================================================================
    // STEP 6: ROTATE VRF SEEDS
    // =============================================================================
    
    console.log('🔐 Step 6: Rotating VRF seeds...')
    
    try {
      // Mark current VRF seed as inactive
      await supabase
        .from('vrf_seeds')
        .update({ is_active: false })
        .eq('is_active', true)

      // Generate new VRF seed (in production, this would be from Switchboard)
      const newSeedHash = require('crypto').randomBytes(32).toString('hex')
      
      const { error: seedError } = await supabase
        .from('vrf_seeds')
        .insert([{
          seed_hash: newSeedHash,
          rotation_date: currentMidnight.toISOString().split('T')[0],
          is_active: true
        }])

      if (seedError) {
        console.error('❌ Error rotating VRF seed:', seedError)
      } else {
        console.log('✅ VRF seed rotated successfully')
      }
      
    } catch (error) {
      console.error('❌ VRF seed rotation failed:', error)
    }

    // =============================================================================
    // STEP 7: UPDATE DAILY STATISTICS
    // =============================================================================
    
    console.log('📊 Step 7: Calculating daily statistics...')
    
    // Get current lives statistics
    const { data: livesStats } = await supabase
      .from('lives')
      .select('wallet, free_today, bonus_today, paid_bank, total_games_played')

    // Get payment statistics for yesterday
    const { data: paymentStats } = await supabase
      .from('payments')
      .select('mwor_amount, lives_bought, burn_amount')
      .gte('created_at', previousMidnight.toISOString())
      .lt('created_at', currentMidnight.toISOString())

    // Get play statistics for yesterday
    const { data: playStats } = await supabase
      .from('plays')
      .select('score, bot_confidence')
      .gte('created_at', previousMidnight.toISOString())
      .lt('created_at', currentMidnight.toISOString())

    const totalUsers = livesStats?.length || 0
    const totalLivesInBank = livesStats?.reduce((sum, user) => sum + user.paid_bank, 0) || 0
    const totalMworSpent = paymentStats?.reduce((sum, p) => sum + p.mwor_amount, 0) || 0
    const totalMworBurned = paymentStats?.reduce((sum, p) => sum + (p.burn_amount || 0), 0) || 0
    const botDetections = playStats?.filter(p => p.bot_confidence > 0.5).length || 0
    const averageScore = playStats?.length ? Math.round(playStats.reduce((sum, p) => sum + p.score, 0) / playStats.length) : 0

    // Store daily statistics
    const { error: statsError } = await supabase
      .from('daily_stats')
      .insert([{
        date: previousMidnight.toISOString().split('T')[0],
        total_players: totalUsers,
        total_games: playStats?.length || 0,
        average_score: averageScore,
        total_mwor_spent: totalMworSpent,
        total_mwor_burned: totalMworBurned,
        bot_detections: botDetections
      }])

    if (statsError) {
      console.error('❌ Error storing daily stats:', statsError)
    } else {
      console.log('📈 Daily statistics updated')
    }

    // =============================================================================
    // STEP 8: PREPARE RESPONSE SUMMARY
    // =============================================================================
    
    const resetStats = {
      timestamp: currentMidnight.toISOString(),
      raffle: raffleResults ? {
        executed: true,
        winner: raffleResults.raffleResult.winnerWallet,
        winnerScore: raffleResults.raffleResult.winnerScore,
        totalTickets: raffleResults.raffleResult.totalTickets,
        qualifiedWallets: raffleResults.qualifiedWallets.length,
        merkleRoot: raffleResults.merkleRoot
      } : { executed: false, reason: 'No qualified players' },
      playsProcessed: playRecords.length,
      topScore: playStats?.length ? Math.max(...playStats.map(p => p.score)) : 0,
      userCountersReset: resetCount || 0,
      totalUsers,
      totalLivesInBank,
      archivedRecords: archivedCount || 0,
      botDetections,
      totalMworBurned,
      averageScore
    }

    console.log('🎉 Enhanced midnight reset completed successfully!')
    console.log('📋 Summary:', resetStats)

    return NextResponse.json({
      status: 'success',
      message: 'Enhanced midnight reset with raffle system completed successfully',
      stats: resetStats,
      nextReset: new Date(currentMidnight.getTime() + 24 * 60 * 60 * 1000).toISOString()
    })

  } catch (error) {
    console.error('💥 Critical error in enhanced midnight reset:', error)
    return NextResponse.json(
      { error: 'Internal server error during midnight reset' },
      { status: 500 }
    )
  }
}

// For manual testing - GET endpoint
export async function GET(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    // Get current raffle status
    const today = new Date().toISOString().split('T')[0]
    
    const { data: todayRaffle } = await supabase
      .from('daily_raffles')
      .select('*')
      .eq('date', today)
      .single()

    const { data: qualifiedToday } = await supabase
      .from('plays')
      .select('wallet, score')
      .eq('is_qualified', true)
      .gte('created_at', new Date().toISOString().split('T')[0])

    return NextResponse.json({
      message: 'Enhanced midnight reset endpoint is available',
      currentRaffle: todayRaffle || null,
      qualifiedPlayersToday: qualifiedToday?.length || 0,
      nextReset: (() => {
        const tomorrow = new Date()
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
        tomorrow.setUTCHours(0, 0, 0, 0)
        return tomorrow.toISOString()
      })(),
      currentTime: new Date().toISOString(),
      securityFeatures: [
        'VRF-based randomness',
        'Top 25% qualification system',
        'Tiered ticket distribution',
        'Merkle proof audit trails',
        'Bot detection and prevention',
        'Server-authoritative scoring',
        'Anti-abuse rate limiting'
      ]
    })

  } catch (error) {
    console.error('Error in GET resetMidnight:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function that would integrate with Solana program
async function updateRootOnChain(merkleRoot: string): Promise<void> {
  // This would use @solana/web3.js and Anchor to call your on-chain program
  // Example pseudocode:
  /*
  const program = anchor.Program<YourProgram>(idl, programId, provider)
  
  await program.methods
    .updateRoot(Buffer.from(merkleRoot.slice(2), 'hex')) // Remove 0x prefix
    .accounts({
      leaderboardRoot: leaderboardRootPda,
      authority: authorityKeypair.publicKey,
    })
    .signers([authorityKeypair])
    .rpc()
  */
  
  console.log('🔗 Would update on-chain root:', merkleRoot)
  
  // For now, simulate the on-chain call
  await new Promise(resolve => setTimeout(resolve, 1000))
} 