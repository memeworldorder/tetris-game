import { NextRequest, NextResponse } from 'next/server'
import { 
  supabase, 
  isUsingTestDatabase, 
  getDatabaseType, 
  checkDatabaseHealth,
  initializeTestData 
} from '@/lib/supabase'
import { resetTestDatabase, getTestTableData } from '@/lib/test-database'

// Mock data insertion function
async function insertMockData() {
  if (!isUsingTestDatabase()) {
    throw new Error('Mock data can only be inserted into test database')
  }

  console.log('🌱 Inserting mock data for testing...')
  
  // Mock wallets for testing
  const mockWallets = [
    '11111111111111111111111111111111',
    '22222222222222222222222222222222', 
    '33333333333333333333333333333333',
    '44444444444444444444444444444444',
    '55555555555555555555555555555555',
    '66666666666666666666666666666666',
    '77777777777777777777777777777777',
    '88888888888888888888888888888888',
    '99999999999999999999999999999999',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  ]
  
  // Insert mock plays data with realistic scores
  const mockPlays = mockWallets.map((wallet, index) => ({
    wallet,
    score: 150000 - (index * 8000), // Descending scores
    seed_hash: `mock_seed_${index}_${Date.now()}`,
    move_hash: `mock_moves_${index}_${Date.now()}`,
    signature: `mock_sig_${index}_${Date.now()}`
  }))
  
  await supabase.from('plays').insert(mockPlays)
  
  // Insert mock lives data
  const mockLives = mockWallets.map((wallet, index) => ({
    wallet_address: wallet,
    free_today: Math.floor(Math.random() * 3) + 1, // 1-3 free lives
    bonus_today: Math.floor(Math.random() * 5), // 0-4 bonus lives
    paid_bank: Math.floor(Math.random() * 10), // 0-9 paid lives
    last_claim: new Date(Date.now() - Math.random() * 86400000).toISOString() // Random time in last 24h
  }))
  
  await supabase.from('lives').insert(mockLives)

  // Insert some mock VRF seeds
  const mockVRFSeeds = [
    {
      date: new Date().toISOString().split('T')[0],
      seed: 'mock_vrf_seed_' + Date.now(),
      proof: 'mock_vrf_proof_' + Date.now(),
      vrf_signature: 'mock_vrf_signature_' + Date.now()
    }
  ]
  
  await supabase.from('vrf_seeds').insert(mockVRFSeeds)

  console.log('✅ Mock data inserted successfully')
}

// Database initialization and health check endpoint
// GET /api/init-db - Check database status and initialize if needed
// POST /api/init-db - Force initialize/reset test database

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking database status...')
    
    // Check database health
    const health = await checkDatabaseHealth()
    const dbType = getDatabaseType()
    const isTestDb = isUsingTestDatabase()
    
    console.log(`📊 Database Status:`, {
      type: dbType,
      healthy: health.healthy,
      isTestDatabase: isTestDb
    })
    
    let initializationResult = null
    
    // Check test database status
    if (isTestDb && health.healthy) {
      try {
        // Check if we have any data
        const { data: livesData } = await supabase.from('lives').select('*').limit(1)
        const { data: playsData } = await supabase.from('plays').select('*').limit(1)
        
        if (!livesData?.length && !playsData?.length) {
          console.log('📊 Test database is empty and ready for real data')
          initializationResult = 'empty-ready'
        } else {
          initializationResult = 'has-data'
        }
      } catch (error) {
        console.error('Failed to check database status:', error)
        initializationResult = 'check-failed'
      }
    }
    
    // Get sample data for verification
    let sampleData = {}
    if (health.healthy) {
      try {
        const { data: lives } = await supabase.from('lives').select('*').limit(3)
        const { data: plays } = await supabase.from('plays').select('*').limit(3)
        
        sampleData = {
          livesCount: lives?.length || 0,
          playsCount: plays?.length || 0,
          sampleLives: lives?.map((l: any) => ({ 
            wallet: l.wallet_address?.slice(0, 8) + '...', 
            lives: l.free_today + l.bonus_today + l.paid_bank 
          })) || [],
          samplePlays: plays?.map((p: any) => ({ 
            wallet: p.wallet?.slice(0, 8) + '...', 
            score: p.score 
          })) || []
        }
      } catch (error) {
        console.error('Failed to fetch sample data:', error)
      }
    }
    
    return NextResponse.json({
      success: true,
      database: {
        type: dbType,
        healthy: health.healthy,
        isTestDatabase: isTestDb,
        error: health.error,
        initialization: initializationResult
      },
      sampleData,
      instructions: {
        testVRF: 'Visit /api/test-vrf to test VRF functionality',
        resetDb: 'POST to /api/init-db with {"action": "reset"} to clear all data',
        clearData: 'POST to /api/init-db with {"action": "clear"} to clear database',
        gameData: 'Connect wallets and play games to populate with real user data'
      }
    })
    
  } catch (error) {
    console.error('❌ Database initialization error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      database: {
        type: getDatabaseType(),
        healthy: false,
        isTestDatabase: isUsingTestDatabase()
      }
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action = 'init' } = await request.json().catch(() => ({ action: 'init' }))
    
    if (!isUsingTestDatabase()) {
      return NextResponse.json({
        success: false,
        error: 'Database operations only available for test database',
        database: {
          type: getDatabaseType(),
          isTestDatabase: false
        }
      }, { status: 400 })
    }
    
    console.log(`🔧 Performing database action: ${action}`)
    
    let result: any = {}
    
    switch (action) {
      case 'reset':
        // Reset test database to empty state
        resetTestDatabase()
        await initializeTestData() // This now just logs ready message
        result = {
          action: 'reset',
          message: 'Test database reset to empty state - ready for real data'
        }
        break
        
      case 'init':
        // Initialize empty database structure
        await initializeTestData() // This now just logs ready message
        result = {
          action: 'init',
          message: 'Test database initialized empty - ready for real data'
        }
        break

      case 'mock_data':
        // Insert mock data for testing
        await insertMockData()
        result = {
          action: 'mock_data',
          message: 'Mock data inserted for testing purposes'
        }
        break
        
      case 'clear':
        // Clear all data
        resetTestDatabase()
        result = {
          action: 'clear',
          message: 'Test database cleared (no data)'
        }
        break
        
      case 'status':
        // Get detailed status
        const tables = ['lives', 'plays', 'payments', 'vrf_seeds', 'daily_raffles']
        const tableCounts: any = {}
        
        for (const table of tables) {
          const data = getTestTableData(table)
          tableCounts[table] = data.length
        }
        
        result = {
          action: 'status',
          tableCounts,
          totalRecords: Object.values(tableCounts).reduce((sum: number, count: any) => sum + count, 0)
        }
        break
        
      default:
        throw new Error(`Unknown action: ${action}`)
    }
    
    // Get updated health status
    const health = await checkDatabaseHealth()
    
    return NextResponse.json({
      success: true,
      result,
      database: {
        type: getDatabaseType(),
        healthy: health.healthy,
        isTestDatabase: isUsingTestDatabase()
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Database operation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      database: {
        type: getDatabaseType(),
        isTestDatabase: isUsingTestDatabase()
      }
    }, { status: 500 })
  }
} 