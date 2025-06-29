/**
 * GameFi Web3 Play-to-Earn SDK
 * 
 * A modular SDK that transforms any HTML5/JavaScript game into a Web3 GameFi experience
 * with lives management, leaderboards, and automated lottery systems.
 * 
 * @version 1.0.0
 * @author GameFi Platform Team
 */

export interface GameFiConfig {
  // Core configuration
  gameId: string
  gameName: string
  apiEndpoint: string
  
  // Wallet integration
  walletConnectOptions?: {
    projectId?: string
    chains?: number[]
    autoConnect?: boolean
  }
  
  // Game mechanics
  livesConfig?: {
    maxLives?: number
    enableLivesSystem?: boolean
    showLivesUI?: boolean
  }
  
  // Leaderboard settings
  leaderboardConfig?: {
    enableLeaderboards?: boolean
    showLeaderboardUI?: boolean
    autoSubmitScores?: boolean
  }
  
  // Anti-cheat settings
  antiCheatConfig?: {
    enableValidation?: boolean
    requireServerValidation?: boolean
    enableMoveTracking?: boolean
  }
  
  // UI customization
  uiConfig?: {
    theme?: 'light' | 'dark' | 'auto'
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    showBuyLivesButton?: boolean
    showLeaderboardButton?: boolean
  }
  
  // Events and callbacks
  onGameStart?: () => void
  onGameEnd?: (score: number, gameData?: any) => void
  onLivesChanged?: (lives: number) => void
  onWalletConnected?: (wallet: string) => void
  onWalletDisconnected?: () => void
  onError?: (error: string) => void
}

export interface GameSession {
  sessionId: number
  gameId: string
  walletAddress: string
  startTime: Date
  seed?: string
  moves: any[]
}

export interface UserData {
  walletAddress: string
  totalLives: number
  lastLifeRefresh: Date
  gamesPlayedToday: number
  highScore: number
  totalGamesPlayed: number
}

export interface LeaderboardEntry {
  rank: number
  walletAddress: string
  score: number
  timestamp: Date
}

/**
 * Main GameFi SDK class
 */
export class GameFiSDK {
  private config: GameFiConfig
  private walletAddress: string | null = null
  private currentSession: GameSession | null = null
  private userData: UserData | null = null
  private isInitialized = false
  
  constructor(config: GameFiConfig) {
    this.config = {
      // Default configuration
      livesConfig: {
        maxLives: 5,
        enableLivesSystem: true,
        showLivesUI: true
      },
      leaderboardConfig: {
        enableLeaderboards: true,
        showLeaderboardUI: true,
        autoSubmitScores: true
      },
      antiCheatConfig: {
        enableValidation: true,
        requireServerValidation: false,
        enableMoveTracking: false
      },
      uiConfig: {
        theme: 'auto',
        position: 'top-right',
        showBuyLivesButton: true,
        showLeaderboardButton: true
      },
      ...config
    }
  }

  /**
   * Initialize the SDK
   */
  async initialize(): Promise<void> {
    try {
      // Load game configuration from server
      await this.loadGameConfig()
      
      // Initialize wallet connection
      await this.initializeWallet()
      
      // Create UI elements if enabled
      if (this.config.uiConfig?.showBuyLivesButton !== false || 
          this.config.uiConfig?.showLeaderboardButton !== false) {
        this.createUI()
        this.setupEventListeners()
      }
      
      this.isInitialized = true
      console.log(`GameFi SDK initialized for ${this.config.gameName}`)
    } catch (error) {
      console.error('Failed to initialize GameFi SDK:', error)
      this.config.onError?.(`Initialization failed: ${error}`)
      throw error
    }
  }

  /**
   * Connect wallet
   */
  async connectWallet(): Promise<string> {
    try {
      // Check if wallet is already connected
      if (this.walletAddress) {
        return this.walletAddress
      }

      // Try to connect to Solana wallet
      if (typeof window !== 'undefined' && (window as any).solana) {
        const wallet = (window as any).solana
        
        if (!wallet.isConnected) {
          await wallet.connect()
        }
        
        this.walletAddress = wallet.publicKey.toString()
        
        // Load or create user data
        await this.loadUserData()
        
        if (this.walletAddress) {
          this.config.onWalletConnected?.(this.walletAddress)
        }
        this.updateUI()
        
        return this.walletAddress || ''
      } else {
        throw new Error('Solana wallet not found. Please install Phantom or similar wallet.')
      }
    } catch (error) {
      console.error('Wallet connection failed:', error)
      this.config.onError?.(`Wallet connection failed: ${error}`)
      throw error
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnectWallet(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && (window as any).solana) {
        await (window as any).solana.disconnect()
      }
      
      this.walletAddress = null
      this.userData = null
      this.currentSession = null
      
      this.config.onWalletDisconnected?.()
      this.updateUI()
    } catch (error) {
      console.error('Wallet disconnection failed:', error)
      this.config.onError?.(`Wallet disconnection failed: ${error}`)
    }
  }

  /**
   * Start a new game session
   */
  async startGameSession(): Promise<GameSession> {
    try {
      if (!this.walletAddress) {
        throw new Error('Wallet not connected')
      }

      if (!this.userData || this.userData.totalLives <= 0) {
        throw new Error('No lives available')
      }

      // Start session on server
      const response = await fetch(`${this.config.apiEndpoint}/api/game/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: this.walletAddress,
          gameId: this.config.gameId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start game session')
      }

      const sessionData = await response.json()
      
      this.currentSession = {
        sessionId: sessionData.sessionId,
        gameId: this.config.gameId,
        walletAddress: this.walletAddress,
        startTime: new Date(),
        seed: sessionData.seed,
        moves: []
      }

      // Update user data (life consumed)
      await this.loadUserData()
      
      this.config.onGameStart?.()
      this.updateUI()
      
      return this.currentSession
    } catch (error) {
      console.error('Failed to start game session:', error)
      this.config.onError?.(`Failed to start game: ${error}`)
      throw error
    }
  }

  /**
   * End game session and submit score
   */
  async endGameSession(score: number, gameData?: any): Promise<void> {
    try {
      if (!this.currentSession) {
        throw new Error('No active game session')
      }

      // End session on server
      const response = await fetch(`${this.config.apiEndpoint}/api/endRound`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: this.walletAddress,
          gameId: this.config.gameId,
          score: score,
          gameData: gameData || {},
          sessionId: this.currentSession.sessionId,
          moves: this.currentSession.moves
        })
      })

      if (!response.ok) {
        const error = await response.json()
        console.warn('Score submission failed:', error.error)
      } else {
        const result = await response.json()
        console.log('Score submitted successfully:', result)
      }

      // Clear current session
      this.currentSession = null
      
      // Refresh user data
      await this.loadUserData()
      
      this.config.onGameEnd?.(score, gameData)
      this.updateUI()
      
    } catch (error) {
      console.error('Failed to end game session:', error)
      this.config.onError?.(`Failed to end game: ${error}`)
    }
  }

  /**
   * Get current leaderboard
   */
  async getLeaderboard(period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<LeaderboardEntry[]> {
    try {
      const response = await fetch(
        `${this.config.apiEndpoint}/api/leaderboard?gameId=${this.config.gameId}&period=${period}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard')
      }

      const data = await response.json()
      return data.leaderboard || []
    } catch (error) {
      console.error('Failed to get leaderboard:', error)
      this.config.onError?.(`Failed to get leaderboard: ${error}`)
      return []
    }
  }

  /**
   * Buy lives
   */
  async buyLives(): Promise<void> {
    try {
      if (!this.walletAddress) {
        throw new Error('Wallet not connected')
      }

      // Get payment information
      const response = await fetch(`${this.config.apiEndpoint}/api/buyLife`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: this.walletAddress,
          gameId: this.config.gameId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to get payment info')
      }

      const paymentInfo = await response.json()
      
      // Show payment modal
      this.showPaymentModal(paymentInfo)
      
    } catch (error) {
      console.error('Failed to initiate life purchase:', error)
      this.config.onError?.(`Failed to buy lives: ${error}`)
    }
  }

  /**
   * Get current user data
   */
  getUserData(): UserData | null {
    return this.userData
  }

  /**
   * Check if SDK is initialized
   */
  isReady(): boolean {
    return this.isInitialized
  }

  /**
   * Track game move (for anti-cheat)
   */
  trackMove(moveData: any): void {
    if (this.currentSession && this.config.antiCheatConfig?.enableMoveTracking) {
      this.currentSession.moves.push({
        timestamp: Date.now(),
        data: moveData
      })
    }
  }

  /**
   * Claim daily lives
   */
  async claimDailyLives(): Promise<void> {
    try {
      if (!this.walletAddress) {
        throw new Error('Wallet not connected')
      }

      const response = await fetch(`${this.config.apiEndpoint}/api/claimDaily`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: this.walletAddress,
          gameId: this.config.gameId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to claim daily lives')
      }

      const result = await response.json()
      
      // Refresh user data
      await this.loadUserData()
      
      this.updateUI()
      
      // Show success message
      this.showMessage(`Claimed ${result.livesAdded} daily lives!`, 'success')
      
    } catch (error) {
      console.error('Failed to claim daily lives:', error)
      this.config.onError?.(`Failed to claim daily lives: ${error}`)
    }
  }

  // Private methods
  private async loadUserData(): Promise<void> {
    if (!this.walletAddress) return

    try {
      const response = await fetch(
        `${this.config.apiEndpoint}/api/user/lives?wallet=${this.walletAddress}&gameId=${this.config.gameId}`
      )
      
      if (response.ok) {
        this.userData = await response.json()
        if (this.userData) {
          this.config.onLivesChanged?.(this.userData.totalLives)
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error)
    }
  }

  private updateUI(): void {
    if (!this.isInitialized) return

    const walletDisplay = document.getElementById('gamefi-wallet-display')
    const livesCount = document.getElementById('gamefi-lives-count')
    const connectButton = document.getElementById('gamefi-connect-wallet')

    if (walletDisplay) {
      walletDisplay.textContent = this.walletAddress 
        ? `${this.walletAddress.slice(0, 4)}...${this.walletAddress.slice(-4)}` 
        : 'Not connected'
    }

    if (livesCount) {
      livesCount.textContent = (this.userData?.totalLives || 0).toString()
    }

    if (connectButton) {
      connectButton.textContent = this.walletAddress ? 'Disconnect' : 'Connect Wallet'
    }
  }

  private showMessage(message: string, type: 'success' | 'error' = 'success'): void {
    // Create toast notification
    const toast = document.createElement('div')
    toast.className = `gamefi-toast gamefi-toast-${type}`
    toast.textContent = message
    
    document.body.appendChild(toast)
    
    // Remove after 3 seconds
    setTimeout(() => {
      try {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast)
        }
      } catch (error) {
        // Toast already removed or doesn't exist
      }
    }, 3000)
  }

  private async loadGameConfig(): Promise<void> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/api/config?gameId=${this.config.gameId}`)
      if (response.ok) {
        const gameConfig = await response.json()
        // Merge server config with local config if needed
        console.log('Game config loaded:', gameConfig)
      }
    } catch (error) {
      console.warn('Failed to load game config from server:', error)
    }
  }

  private async initializeWallet(): Promise<void> {
    // Auto-connect if previously connected
    if (typeof window !== 'undefined' && (window as any).solana) {
      const wallet = (window as any).solana
      if (wallet.isConnected) {
        this.walletAddress = wallet.publicKey.toString()
        await this.loadUserData()
      }
    }
  }

  private createUI(): void {
    if (typeof window === 'undefined') return

    // Create UI container
    const container = document.createElement('div')
    container.id = 'gamefi-sdk-ui'
    container.className = `gamefi-ui ${this.config.uiConfig?.theme || 'auto'} ${this.config.uiConfig?.position || 'top-right'}`
    
    // Add CSS styles
    this.addStyles()
    
    // Add UI elements
    container.innerHTML = this.getUIHTML()
    
    document.body.appendChild(container)
  }

  private addStyles(): void {
    if (typeof window === 'undefined') return

    const styles = `
      .gamefi-ui {
        position: fixed;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
      }
      .gamefi-ui.top-right { top: 20px; right: 20px; }
      .gamefi-ui.top-left { top: 20px; left: 20px; }
      .gamefi-ui.bottom-right { bottom: 20px; right: 20px; }
      .gamefi-ui.bottom-left { bottom: 20px; left: 20px; }
      
      .gamefi-panel {
        background: rgba(255, 255, 255, 0.95);
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        backdrop-filter: blur(10px);
        min-width: 200px;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .gamefi-ui.dark .gamefi-panel {
        background: rgba(30, 30, 30, 0.95);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .gamefi-button {
        background: #6366f1;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 12px;
        margin: 4px;
        transition: all 0.2s;
      }
      
      .gamefi-button:hover {
        background: #5855eb;
        transform: translateY(-1px);
      }
      
      .gamefi-button:disabled {
        background: #9ca3af;
        cursor: not-allowed;
        transform: none;
      }
      
      .gamefi-lives {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 8px 0;
      }
      
      .gamefi-wallet {
        font-size: 11px;
        opacity: 0.7;
        margin-bottom: 8px;
        font-family: monospace;
      }

      .gamefi-toast {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideDown 0.3s ease-out;
      }

      .gamefi-toast-success {
        background: #10b981;
      }

      .gamefi-toast-error {
        background: #ef4444;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }

      .gamefi-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
      }

      .gamefi-modal-content {
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        max-height: 90%;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      }

      .gamefi-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e5e7eb;
      }

      .gamefi-modal-title {
        font-size: 18px;
        font-weight: 600;
        margin: 0;
      }

      .gamefi-close-button {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #6b7280;
      }

      .gamefi-leaderboard {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .gamefi-leaderboard li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        border-bottom: 1px solid #f3f4f6;
      }

      .gamefi-leaderboard li:last-child {
        border-bottom: none;
      }

      .gamefi-rank {
        font-weight: bold;
        color: #6366f1;
        margin-right: 12px;
      }

      .gamefi-wallet-addr {
        font-family: monospace;
        font-size: 12px;
        color: #6b7280;
      }

      .gamefi-score {
        font-weight: 600;
        color: #111827;
      }
    `
    
    const styleSheet = document.createElement('style')
    styleSheet.textContent = styles
    document.head.appendChild(styleSheet)
  }

  private getUIHTML(): string {
    return `
      <div class="gamefi-panel">
        <div class="gamefi-wallet" id="gamefi-wallet-display">
          ${this.walletAddress ? `${this.walletAddress.slice(0, 4)}...${this.walletAddress.slice(-4)}` : 'Not connected'}
        </div>
        
        ${this.config.livesConfig?.showLivesUI ? `
          <div class="gamefi-lives">
            <span>❤️ <span id="gamefi-lives-count">${this.userData?.totalLives || 0}</span></span>
            ${this.config.uiConfig?.showBuyLivesButton ? '<button class="gamefi-button" id="gamefi-buy-lives">Buy Lives</button>' : ''}
          </div>
        ` : ''}
        
        <div>
          <button class="gamefi-button" id="gamefi-connect-wallet">
            ${this.walletAddress ? 'Disconnect' : 'Connect Wallet'}
          </button>
          
          ${this.config.uiConfig?.showLeaderboardButton ? '<button class="gamefi-button" id="gamefi-leaderboard">Leaderboard</button>' : ''}
        </div>
      </div>
    `
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') return

    // Wallet connect/disconnect
    document.getElementById('gamefi-connect-wallet')?.addEventListener('click', () => {
      if (this.walletAddress) {
        this.disconnectWallet()
      } else {
        this.connectWallet()
      }
    })

    // Buy lives
    document.getElementById('gamefi-buy-lives')?.addEventListener('click', () => {
      this.buyLives()
    })

    // Leaderboard
    document.getElementById('gamefi-leaderboard')?.addEventListener('click', () => {
      this.showLeaderboard()
    })
  }

  private showPaymentModal(paymentInfo: any): void {
    if (typeof window === 'undefined') return

    const modal = document.createElement('div')
    modal.className = 'gamefi-modal'
    modal.innerHTML = `
      <div class="gamefi-modal-content">
        <div class="gamefi-modal-header">
          <h3 class="gamefi-modal-title">Buy Lives</h3>
          <button class="gamefi-close-button" id="close-payment-modal">&times;</button>
        </div>
        <div>
          <p>Choose a lives package:</p>
          <div style="display: grid; gap: 12px; margin: 16px 0;">
            <button class="gamefi-button" style="padding: 16px; font-size: 14px;" data-tier="cheap">
              ${paymentInfo.lives.cheap} Lives - $${paymentInfo.priceUSD.cheap}
            </button>
            <button class="gamefi-button" style="padding: 16px; font-size: 14px;" data-tier="mid">
              ${paymentInfo.lives.mid} Lives - $${paymentInfo.priceUSD.mid}
            </button>
            <button class="gamefi-button" style="padding: 16px; font-size: 14px;" data-tier="high">
              ${paymentInfo.lives.high} Lives - $${paymentInfo.priceUSD.high}
            </button>
          </div>
          <p style="font-size: 12px; color: #6b7280;">
            Payment will be processed using your connected Solana wallet.
          </p>
        </div>
      </div>
    `

    document.body.appendChild(modal)

    // Close modal handlers
    const closeModal = () => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal)
      }
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal()
    })

    document.getElementById('close-payment-modal')?.addEventListener('click', closeModal)

    // Payment tier handlers
    modal.querySelectorAll('[data-tier]').forEach(button => {
      button.addEventListener('click', (e) => {
        const tier = (e.target as HTMLElement).getAttribute('data-tier')
        this.showMessage(`Payment processing for ${tier} tier would happen here (Demo mode)`, 'success')
        closeModal()
      })
    })
  }

  private async showLeaderboard(): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      const leaderboard = await this.getLeaderboard('daily')

      const modal = document.createElement('div')
      modal.className = 'gamefi-modal'
      
      let leaderboardHTML = '<ol class="gamefi-leaderboard">'
      leaderboard.slice(0, 10).forEach((entry, index) => {
        leaderboardHTML += `
          <li>
            <div style="display: flex; align-items: center;">
              <span class="gamefi-rank">#${index + 1}</span>
              <span class="gamefi-wallet-addr">${entry.walletAddress.slice(0, 6)}...${entry.walletAddress.slice(-4)}</span>
            </div>
            <span class="gamefi-score">${entry.score.toLocaleString()}</span>
          </li>
        `
      })
      leaderboardHTML += '</ol>'

      modal.innerHTML = `
        <div class="gamefi-modal-content">
          <div class="gamefi-modal-header">
            <h3 class="gamefi-modal-title">Daily Leaderboard</h3>
            <button class="gamefi-close-button" id="close-leaderboard-modal">&times;</button>
          </div>
          <div>
            ${leaderboard.length > 0 ? leaderboardHTML : '<p>No leaderboard data available</p>'}
          </div>
        </div>
      `

      document.body.appendChild(modal)

      // Close modal handlers
      const closeModal = () => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal)
        }
      }

      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal()
      })

      document.getElementById('close-leaderboard-modal')?.addEventListener('click', closeModal)

    } catch (error) {
      this.showMessage('Failed to load leaderboard', 'error')
    }
  }
}

export default GameFiSDK 