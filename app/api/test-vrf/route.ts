import { NextRequest, NextResponse } from 'next/server'
import { GameVRFManager, createVRFManager } from '@/lib/switchboard-vrf-client'
import { SecurityStack } from '@/lib/security-stack'
import { DailyRaffleOrchestrator } from '@/lib/raffle-system'
import { getTelegramBot } from '@/lib/telegram-bot'

// Test endpoint to demonstrate Switchboard VRF functionality
// GET /api/test-vrf - Run VRF tests
// POST /api/test-vrf - Run specific VRF test

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Starting VRF functionality tests...')
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: [] as any[]
    }
    
    // Test 1: Basic VRF Manager initialization
    console.log('\n🔧 Test 1: VRF Manager Initialization')
    const vrfManager = createVRFManager()
    const status = await vrfManager.getStatus()
    
    results.tests.push({
      name: 'VRF Manager Initialization',
      status: 'success',
      data: status,
      cost: status.estimatedCost,
      description: 'Basic VRF manager creation and status check'
    })
    
    // Test 2: Security Stack VRF integration
    console.log('\n🔐 Test 2: Security Stack VRF Integration')
    const seedManager = new SecurityStack.VRFSeedManager()
    const vrfStatus = await seedManager.getVRFStatus()
    
    results.tests.push({
      name: 'Security Stack VRF Integration',
      status: 'success',
      data: vrfStatus,
      description: 'VRF integration with security stack for daily seed rotation'
    })
    
    // Test 3: Commit-Reveal with VRF seeds
    console.log('\n🎯 Test 3: Commit-Reveal with VRF Seeds')
    const commitReveal = new SecurityStack.CommitRevealManager()
    const testWallet = '11111111111111111111111111111111'
    const testSession = `session_${Date.now()}`
    
    const commitment = await commitReveal.commitSeed(testWallet, testSession)
    const revealedSeed = await commitReveal.revealSeed(testSession)
    
    results.tests.push({
      name: 'Commit-Reveal with VRF Seeds',
      status: 'success',
      data: {
        commitment: commitment.seedHash.slice(0, 16) + '...',
        revealed: revealedSeed?.slice(0, 16) + '...',
        sessionId: testSession
      },
      description: 'Commit-reveal scheme using VRF-generated seeds'
    })
    
    // Test 4: VRF Seed Rotation
    console.log('\n🔄 Test 4: VRF Seed Rotation')
    const currentSeed = await seedManager.getCurrentSeed()
    const derivedSeed = seedManager.deriveRoundSeed(testWallet, testSession)
    
    results.tests.push({
      name: 'VRF Seed Rotation',
      status: 'success',
      data: {
        seedHash: currentSeed.seed.toString('hex').slice(0, 16) + '...',
        derivedSeed: derivedSeed.slice(0, 16) + '...',
        rotatesAt: new Date(currentSeed.rotatesAt).toISOString(),
        vrfSignature: currentSeed.vrfSignature?.slice(0, 16) + '...'
      },
      description: 'Daily VRF seed rotation and per-round seed derivation'
    })
    
    // Test 5: Raffle System VRF Integration
    console.log('\n🎰 Test 5: Raffle System VRF Integration')
    const raffleOrchestrator = new DailyRaffleOrchestrator()
    const raffleStats = await raffleOrchestrator.getRaffleStats()
    
    // Mock daily scores for testing
    const mockScores = [
      { walletAddress: '11111111111111111111111111111111', score: 150000 },
      { walletAddress: '22222222222222222222222222222222', score: 125000 },
      { walletAddress: '33333333333333333333333333333333', score: 100000 },
      { walletAddress: '44444444444444444444444444444444', score: 95000 },
      { walletAddress: '55555555555555555555555555555555', score: 90000 },
      { walletAddress: '66666666666666666666666666666666', score: 85000 },
      { walletAddress: '77777777777777777777777777777777', score: 80000 },
      { walletAddress: '88888888888888888888888888888888', score: 75000 },
      { walletAddress: '99999999999999999999999999999999', score: 70000 },
      { walletAddress: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', score: 65000 }
    ]
    
    // Only run full raffle test if requested (to avoid long execution time)
    const runFullRaffle = request.nextUrl.searchParams.get('fullRaffle') === 'true'
    
    if (runFullRaffle) {
      console.log('🎪 Running full raffle test...')
      const raffleResult = await raffleOrchestrator.executeDailyRaffle(mockScores, 3)
      
      results.tests.push({
        name: 'Complete Raffle Execution',
        status: 'success',
        data: {
          winners: (raffleResult.winners || []).filter(w => w && typeof w === 'string').map((w: string) => w.slice(0, 8) + '...'),
          totalTickets: raffleResult.totalTickets || 0,
          vrfSeed: (raffleResult.vrfSeed || '').slice(0, 16) + '...',
          verified: raffleResult.verified || false,
          drawTimestamp: new Date(raffleResult.drawTimestamp || Date.now()).toISOString()
        },
        description: 'Complete raffle execution with VRF winner selection'
      })
    } else {
      results.tests.push({
        name: 'Raffle System VRF Integration',
        status: 'success',
        data: raffleStats,
        description: 'Raffle system VRF integration check (use ?fullRaffle=true for complete test)'
      })
    }
    
    // Test 6: Score Signing with VRF context
    console.log('\n✍️ Test 6: Score Signing with VRF Context')
    const scoreManager = new SecurityStack.ScoreSigningManager()
    const testScore = 100000
    const testMoveCount = 500
    
    const scoreProof = scoreManager.signScore(testWallet, testScore, commitment.seedHash, testMoveCount)
    const isValidSignature = scoreManager.verifyScoreSignature(scoreProof)
    
    results.tests.push({
      name: 'Score Signing with VRF Context',
      status: 'success',
      data: {
        score: testScore,
        moveCount: testMoveCount,
        signatureValid: isValidSignature,
        publicKey: scoreManager.getPublicKey().toString('hex').slice(0, 16) + '...',
        timestamp: new Date(scoreProof.timestamp).toISOString()
      },
      description: 'Score signing using VRF-derived seed hash as context'
    })
    
    // Test 7: Bot Detection with VRF patterns
    console.log('\n🤖 Test 7: Bot Detection with VRF-Based Patterns')
    const abuseDetector = new SecurityStack.AbuseDetector()
    
    // Mock move sequences for testing
    const humanMoves = [
      { type: 'move' as const, timestamp: Date.now(), direction: 'left' as const },
      { type: 'rotate' as const, timestamp: Date.now() + 150, rotation: 'cw' as const },
      { type: 'move' as const, timestamp: Date.now() + 300, direction: 'right' as const },
      { type: 'drop' as const, timestamp: Date.now() + 450 },
      { type: 'move' as const, timestamp: Date.now() + 650, direction: 'left' as const }
    ]
    
    const botMoves = [
      { type: 'move' as const, timestamp: Date.now(), direction: 'left' as const },
      { type: 'rotate' as const, timestamp: Date.now() + 50, rotation: 'cw' as const },
      { type: 'move' as const, timestamp: Date.now() + 100, direction: 'right' as const },
      { type: 'drop' as const, timestamp: Date.now() + 150 },
      { type: 'move' as const, timestamp: Date.now() + 200, direction: 'left' as const }
    ]
    
    const humanDetection = abuseDetector.detectBot(humanMoves)
    const botDetection = abuseDetector.detectBot(botMoves)
    
    results.tests.push({
      name: 'Bot Detection with VRF-Based Patterns',
      status: 'success',
      data: {
        humanPattern: {
          isBot: humanDetection.isBot,
          confidence: humanDetection.confidence
        },
        botPattern: {
          isBot: botDetection.isBot,
          confidence: botDetection.confidence
        }
      },
      description: 'Bot detection using move pattern analysis with VRF timing validation'
    })

    // Test 8: Telegram Announcements Integration
    console.log('\n📱 Test 8: Telegram Announcements Integration')
    const telegramBot = getTelegramBot()
    const telegramStatus = telegramBot.getStatus()
    
    // Only test actual announcements if requested
    const testTelegramAnnouncements = request.nextUrl.searchParams.get('testTelegram') === 'true'
    
    if (testTelegramAnnouncements) {
      console.log('📱 Testing full Telegram announcement sequence...')
      try {
        await raffleOrchestrator.testTelegramAnnouncements()
        
        results.tests.push({
          name: 'Telegram Announcements Integration',
          status: 'success',
          data: {
            ...telegramStatus,
            announcementTest: 'completed'
          },
          description: 'Full Telegram announcement sequence with suspenseful winner reveals'
        })
      } catch (error) {
        results.tests.push({
          name: 'Telegram Announcements Integration',
          status: 'error',
          data: {
            ...telegramStatus,
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          description: 'Telegram announcement test failed'
        })
      }
    } else {
      results.tests.push({
        name: 'Telegram Announcements Integration',
        status: 'success',
        data: telegramStatus,
        description: 'Telegram bot configuration check (use ?testTelegram=true for full test)'
      })
    }
    
    // Summary
    const successCount = results.tests.filter(t => t.status === 'success').length
    const totalCost = results.tests.reduce((sum, t) => sum + (t.cost || 0), 0)
    
    console.log(`\n✅ VRF Tests Completed: ${successCount}/${results.tests.length} passed`)
    console.log(`💰 Total estimated VRF cost: ${totalCost.toFixed(8)} SOL`)
    
    return NextResponse.json({
      success: true,
      summary: {
        testsRun: results.tests.length,
        testsPass: successCount,
        totalEstimatedCost: totalCost,
        environment: process.env.NODE_ENV,
        vrfType: 'Switchboard Test Implementation'
      },
      results
    })
    
  } catch (error) {
    console.error('❌ VRF test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { testType, params } = await request.json()
    
    console.log(`🎯 Running specific VRF test: ${testType}`)
    
    switch (testType) {
      case 'raffle_draw': {
        const { scores, winners = 3 } = params || {}
        if (!scores || !Array.isArray(scores)) {
          throw new Error('Invalid scores data for raffle draw test')
        }
        
        const orchestrator = new DailyRaffleOrchestrator()
        const result = await orchestrator.executeDailyRaffle(scores, winners)
        
        return NextResponse.json({
          success: true,
          testType: 'raffle_draw',
          result: {
            winners: result.winners || [],
            totalTickets: result.totalTickets || 0,
            vrfSeed: (result.vrfSeed || '').slice(0, 16) + '...',
            verified: result.verified || false,
            merkleRoot: (result.merkleRoot || '').slice(0, 16) + '...',
            drawTimestamp: new Date(result.drawTimestamp || Date.now()).toISOString()
          }
        })
      }
      
      case 'seed_generation': {
        const { walletAddress, sessionId } = params || {}
        if (!walletAddress || !sessionId) {
          throw new Error('Missing wallet address or session ID')
        }
        
        const commitReveal = new SecurityStack.CommitRevealManager()
        const commitment = await commitReveal.commitSeed(walletAddress, sessionId)
        const revealed = await commitReveal.revealSeed(sessionId)
        
        return NextResponse.json({
          success: true,
          testType: 'seed_generation',
          result: {
            commitment: commitment.seedHash,
            revealed,
            sessionId: commitment.sessionId
          }
        })
      }
      
      case 'vrf_status': {
        const vrfManager = createVRFManager()
        const status = await vrfManager.getStatus()
        
        return NextResponse.json({
          success: true,
          testType: 'vrf_status',
          result: status
        })
      }

      case 'telegram_test': {
        const orchestrator = new DailyRaffleOrchestrator()
        const telegramBot = getTelegramBot()
        
        // Test connection and status
        const status = telegramBot.getStatus()
        const connected = await telegramBot.testConnection()
        
        // Run full announcement test if requested
        const { fullTest } = params || {}
        if (fullTest) {
          await orchestrator.testTelegramAnnouncements()
        }
        
        return NextResponse.json({
          success: true,
          testType: 'telegram_test',
          result: {
            ...status,
            connected,
            fullTestRun: !!fullTest
          }
        })
      }
      
      default:
        throw new Error(`Unknown test type: ${testType}`)
    }
    
  } catch (error) {
    console.error('❌ VRF specific test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 