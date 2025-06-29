/**
 * GameFi SDK Test Framework
 * 
 * Simple testing utilities for validating SDK functionality
 * without requiring full blockchain infrastructure.
 */

import { GameFiSDK, GameFiConfig } from './gamefi-sdk'

export interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration: number
}

export class GameFiSDKTester {
  private sdk: GameFiSDK
  private results: TestResult[] = []

  constructor(config: Partial<GameFiConfig>) {
    const defaultConfig: GameFiConfig = {
      gameId: 'test-game',
      gameName: 'Test Game',
      apiEndpoint: 'http://localhost:3000',
      ...config
    }

    this.sdk = new GameFiSDK(defaultConfig)
  }

  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Running GameFi SDK Tests...')
    
    this.results = []
    
    // Core functionality tests
    await this.testInitialization()
    await this.testConfiguration()
    await this.testUserDataMethods()
    await this.testMoveTracking()
    await this.testErrorHandling()
    
    // UI tests (if in browser environment)
    if (typeof window !== 'undefined') {
      await this.testUICreation()
      await this.testUIUpdates()
    }

    this.printResults()
    return this.results
  }

  private async testInitialization(): Promise<void> {
    await this.runTest('SDK Initialization', async () => {
      const initialState = this.sdk.isReady()
      if (initialState) {
        throw new Error('SDK should not be ready before initialization')
      }

      await this.sdk.initialize()
      
      const readyState = this.sdk.isReady()
      if (!readyState) {
        throw new Error('SDK should be ready after initialization')
      }
    })
  }

  private async testConfiguration(): Promise<void> {
    await this.runTest('Configuration Validation', async () => {
      // Test that configuration is properly set
      const userData = this.sdk.getUserData()
      
      // Should be null before wallet connection
      if (userData !== null) {
        throw new Error('User data should be null before wallet connection')
      }
    })
  }

  private async testUserDataMethods(): Promise<void> {
    await this.runTest('User Data Methods', async () => {
      // Test getUserData returns null initially
      const initialData = this.sdk.getUserData()
      if (initialData !== null) {
        throw new Error('Initial user data should be null')
      }

      // Test isReady method
      const isReady = this.sdk.isReady()
      if (!isReady) {
        throw new Error('SDK should be ready after initialization')
      }
    })
  }

  private async testMoveTracking(): Promise<void> {
    await this.runTest('Move Tracking', async () => {
      // Test move tracking without active session
      try {
        this.sdk.trackMove({
          type: 'test_move',
          data: { x: 100, y: 200 },
          timestamp: Date.now()
        })
        // Should not throw error even without session
      } catch (error) {
        throw new Error('Move tracking should not fail without active session')
      }
    })
  }

  private async testErrorHandling(): Promise<void> {
    await this.runTest('Error Handling', async () => {
      // Test methods that require wallet connection
             try {
         await this.sdk.startGameSession()
         throw new Error('Should have thrown error for missing wallet')
       } catch (error) {
         const errorMessage = error instanceof Error ? error.message : String(error)
         if (!errorMessage.includes('Wallet not connected')) {
           throw new Error('Should throw specific wallet error')
         }
       }

       try {
         await this.sdk.endGameSession(100)
         throw new Error('Should have thrown error for no active session')
       } catch (error) {
         const errorMessage = error instanceof Error ? error.message : String(error)
         if (!errorMessage.includes('No active game session')) {
           throw new Error('Should throw specific session error')
         }
       }
    })
  }

  private async testUICreation(): Promise<void> {
    await this.runTest('UI Creation', async () => {
      // Check if UI elements were created (in browser environment)
      if (typeof document === 'undefined') {
        return // Skip in non-browser environment
      }

      // Look for GameFi UI elements
      const uiContainer = document.getElementById('gamefi-sdk-ui')
      if (!uiContainer) {
        // UI might be disabled, check configuration
        console.warn('GameFi UI container not found - may be disabled in config')
      }
    })
  }

  private async testUIUpdates(): Promise<void> {
    await this.runTest('UI Updates', async () => {
      if (typeof document === 'undefined') {
        return // Skip in non-browser environment
      }

      // Test that UI update methods don't throw errors
      try {
        // These are private methods, but we can test they don't crash the SDK
        // by calling public methods that use them
        this.sdk.getUserData() // Should trigger UI updates internally
      } catch (error) {
        throw new Error('UI update methods should not throw errors')
      }
    })
  }

  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now()
    
    try {
      await testFn()
      const duration = Date.now() - startTime
      
      this.results.push({
        name,
        passed: true,
        duration
      })
      
      console.log(`✅ ${name} (${duration}ms)`)
      
         } catch (error) {
       const duration = Date.now() - startTime
       const errorMessage = error instanceof Error ? error.message : String(error)
       
       this.results.push({
         name,
         passed: false,
         error: errorMessage,
         duration
       })
       
       console.log(`❌ ${name} (${duration}ms): ${errorMessage}`)
     }
  }

  private printResults(): void {
    const passed = this.results.filter(r => r.passed).length
    const total = this.results.length
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0)
    
    console.log('\n📊 Test Results Summary:')
    console.log(`${passed}/${total} tests passed (${Math.round((passed/total) * 100)}%)`)
    console.log(`Total time: ${totalTime}ms`)
    
    const failed = this.results.filter(r => !r.passed)
    if (failed.length > 0) {
      console.log('\n❌ Failed Tests:')
      failed.forEach(test => {
        console.log(`  - ${test.name}: ${test.error}`)
      })
    }
  }

  getResults(): TestResult[] {
    return this.results
  }

  getPassedCount(): number {
    return this.results.filter(r => r.passed).length
  }

  getFailedCount(): number {
    return this.results.filter(r => !r.passed).length
  }

  getAllPassed(): boolean {
    return this.results.every(r => r.passed)
  }
}

/**
 * Mock implementations for testing
 */
export class MockGameFiSDK extends GameFiSDK {
  private mockWalletAddress: string | null = null
  private mockUserData: any = null

  constructor(config: GameFiConfig) {
    super(config)
  }

  async connectWallet(): Promise<string> {
    // Simulate wallet connection
    await this.sleep(100)
    
    this.mockWalletAddress = '7xKX' + Math.random().toString(36).substr(2, 40)
    this.mockUserData = {
      walletAddress: this.mockWalletAddress,
      totalLives: 5,
      lastLifeRefresh: new Date(),
      gamesPlayedToday: 0,
      highScore: 0,
      totalGamesPlayed: 0
    }

    return this.mockWalletAddress
  }

  async startGameSession() {
    if (!this.mockWalletAddress) {
      throw new Error('Wallet not connected')
    }
    
    if (this.mockUserData.totalLives <= 0) {
      throw new Error('No lives available')
    }

    await this.sleep(50)
    
    this.mockUserData.totalLives--
    
    return {
      sessionId: Date.now(),
      gameId: 'test-game',
      walletAddress: this.mockWalletAddress,
      startTime: new Date(),
      moves: []
    }
  }

  async endGameSession(score: number, gameData?: any): Promise<void> {
    await this.sleep(50)
    
    if (score > this.mockUserData.highScore) {
      this.mockUserData.highScore = score
    }
    
    this.mockUserData.gamesPlayedToday++
    this.mockUserData.totalGamesPlayed++
  }

  getUserData() {
    return this.mockUserData
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Utility function to run quick tests
 */
export async function runQuickTests(): Promise<boolean> {
  const tester = new GameFiSDKTester({
    gameId: 'quick-test',
    gameName: 'Quick Test Game'
  })

  const results = await tester.runAllTests()
  return tester.getAllPassed()
}

/**
 * Integration test runner
 */
export async function runIntegrationTests(apiEndpoint: string): Promise<TestResult[]> {
  console.log('🔗 Running Integration Tests...')
  
  const tester = new GameFiSDKTester({
    gameId: 'integration-test',
    gameName: 'Integration Test Game',
    apiEndpoint
  })

  return await tester.runAllTests()
}

// Export for browser usage
if (typeof window !== 'undefined') {
  const globalWindow = window as any
  globalWindow.GameFiSDKTester = GameFiSDKTester
  globalWindow.MockGameFiSDK = MockGameFiSDK
  globalWindow.runQuickTests = runQuickTests
  globalWindow.runIntegrationTests = runIntegrationTests
} 