# GameFi SDK Integration Guide

## Overview
The GameFi SDK enables any HTML5/JavaScript game to integrate Web3 Play-to-Earn mechanics including lives management, leaderboards, and automated lottery systems with just a few lines of code.

## Quick Start

### 1. Installation

**Option A: NPM/Yarn (Recommended)**
```bash
npm install @gamefi/web3-sdk
# or
yarn add @gamefi/web3-sdk
```

**Option B: CDN**
```html
<script src="https://cdn.gamefi.com/sdk/v1.0.0/gamefi-sdk.min.js"></script>
```

**Option C: Direct Integration**
Download `gamefi-sdk.js` and include it in your project:
```html
<script src="path/to/gamefi-sdk.js"></script>
```

### 2. Basic Integration

```javascript
// Initialize the SDK
const gamefiSDK = new GameFiSDK({
  gameId: 'my-awesome-game',
  gameName: 'My Awesome Game',
  apiEndpoint: 'https://your-gamefi-backend.com'
})

// Initialize the SDK when your game loads
await gamefiSDK.initialize()

// Start a game session when player starts playing
async function startGame() {
  try {
    const session = await gamefiSDK.startGameSession()
    console.log('Game session started:', session.sessionId)
    
    // Your game logic here
    playGame()
  } catch (error) {
    console.error('Failed to start game:', error)
    // Handle error (e.g., no lives available)
  }
}

// End the session when game is over
async function gameOver(finalScore) {
  await gamefiSDK.endGameSession(finalScore, {
    level: currentLevel,
    timeElapsed: gameTimeElapsed,
    // Any other game-specific data
  })
}
```

## Configuration Options

### Basic Configuration
```javascript
const config = {
  // Required
  gameId: 'your-game-id',           // Unique identifier for your game
  gameName: 'Your Game Name',       // Display name
  apiEndpoint: 'https://api.com',   // Your GameFi backend URL
  
  // Optional configurations below...
}
```

### Lives System Configuration
```javascript
const config = {
  // ... basic config
  livesConfig: {
    maxLives: 5,                    // Maximum lives a player can have
    enableLivesSystem: true,        // Enable/disable lives mechanic
    showLivesUI: true              // Show lives in the SDK UI
  }
}
```

### Leaderboard Configuration
```javascript
const config = {
  // ... basic config
  leaderboardConfig: {
    enableLeaderboards: true,       // Enable leaderboard functionality
    showLeaderboardUI: true,        // Show leaderboard button in UI
    autoSubmitScores: true         // Automatically submit scores
  }
}
```

### Anti-Cheat Configuration
```javascript
const config = {
  // ... basic config
  antiCheatConfig: {
    enableValidation: true,         // Enable score validation
    requireServerValidation: false, // Require server-side validation
    enableMoveTracking: true       // Track player moves for validation
  }
}
```

### UI Customization
```javascript
const config = {
  // ... basic config
  uiConfig: {
    theme: 'auto',                  // 'light', 'dark', or 'auto'
    position: 'top-right',          // UI panel position
    showBuyLivesButton: true,       // Show buy lives button
    showLeaderboardButton: true    // Show leaderboard button
  }
}
```

### Event Callbacks
```javascript
const config = {
  // ... basic config
  onGameStart: () => {
    console.log('Game started!')
  },
  onGameEnd: (score, gameData) => {
    console.log('Game ended with score:', score)
  },
  onLivesChanged: (newLivesCount) => {
    console.log('Lives updated:', newLivesCount)
  },
  onWalletConnected: (walletAddress) => {
    console.log('Wallet connected:', walletAddress)
  },
  onWalletDisconnected: () => {
    console.log('Wallet disconnected')
  },
  onError: (error) => {
    console.error('GameFi SDK error:', error)
  }
}
```

## API Reference

### Core Methods

#### `initialize(): Promise<void>`
Initializes the SDK and sets up the UI components.

```javascript
await gamefiSDK.initialize()
```

#### `connectWallet(): Promise<string>`
Prompts user to connect their Solana wallet.

```javascript
const walletAddress = await gamefiSDK.connectWallet()
```

#### `startGameSession(): Promise<GameSession>`
Starts a new game session (consumes one life).

```javascript
const session = await gamefiSDK.startGameSession()
```

#### `endGameSession(score: number, gameData?: any): Promise<void>`
Ends the current game session and submits the score.

```javascript
await gamefiSDK.endGameSession(1000, {
  level: 5,
  timeElapsed: 120,
  specialItems: ['powerup1', 'bonus2']
})
```

#### `getLeaderboard(period?: string): Promise<LeaderboardEntry[]>`
Fetches the current leaderboard.

```javascript
const dailyLeaderboard = await gamefiSDK.getLeaderboard('daily')
const weeklyLeaderboard = await gamefiSDK.getLeaderboard('weekly')
```

#### `buyLives(): Promise<void>`
Opens the buy lives interface.

```javascript
await gamefiSDK.buyLives()
```

### Utility Methods

#### `getUserData(): UserData | null`
Gets current user information including lives count.

```javascript
const user = gamefiSDK.getUserData()
if (user && user.totalLives > 0) {
  // Player has lives available
}
```

#### `isReady(): boolean`
Checks if the SDK is initialized and ready to use.

```javascript
if (gamefiSDK.isReady()) {
  // SDK is ready
}
```

## Integration Examples

### Example 1: Simple Arcade Game

```javascript
// Initialize SDK
const gamefiSDK = new GameFiSDK({
  gameId: 'space-invaders',
  gameName: 'Space Invaders',
  apiEndpoint: 'https://api.mygame.com',
  onGameStart: () => {
    document.getElementById('game-status').textContent = 'Game Started!'
  },
  onGameEnd: (score) => {
    document.getElementById('final-score').textContent = `Final Score: ${score}`
  },
  onLivesChanged: (lives) => {
    document.getElementById('lives-display').textContent = `Lives: ${lives}`
  }
})

// Game initialization
async function initGame() {
  await gamefiSDK.initialize()
  
  // Check if player has lives
  const userData = gamefiSDK.getUserData()
  if (userData && userData.totalLives > 0) {
    document.getElementById('start-button').disabled = false
  }
}

// Start game function
async function startNewGame() {
  try {
    const session = await gamefiSDK.startGameSession()
    
    // Your game logic
    let score = 0
    let gameRunning = true
    
    // Game loop
    const gameLoop = setInterval(() => {
      if (!gameRunning) {
        clearInterval(gameLoop)
        return
      }
      
      // Update game state
      updateGame()
      
      // Check game over condition
      if (isGameOver()) {
        gameRunning = false
        endGame(score)
      }
    }, 16) // 60 FPS
    
  } catch (error) {
    alert('Cannot start game: ' + error.message)
  }
}

// End game function
async function endGame(finalScore) {
  await gamefiSDK.endGameSession(finalScore, {
    enemiesKilled: enemyCount,
    powerupsCollected: powerupCount,
    survivalTime: gameTimeElapsed
  })
  
  // Show game over screen
  showGameOverScreen(finalScore)
}

// Initialize when page loads
window.addEventListener('load', initGame)
```

### Example 2: Puzzle Game with Move Tracking

```javascript
const gamefiSDK = new GameFiSDK({
  gameId: 'match-three',
  gameName: 'Match Three Puzzle',
  apiEndpoint: 'https://api.puzzlegame.com',
  antiCheatConfig: {
    enableValidation: true,
    enableMoveTracking: true
  }
})

let currentSession = null
let moveCount = 0

async function initPuzzleGame() {
  await gamefiSDK.initialize()
}

async function startPuzzle() {
  currentSession = await gamefiSDK.startGameSession()
  moveCount = 0
  setupPuzzleBoard()
}

function makeMove(fromX, fromY, toX, toY) {
  // Track the move for anti-cheat
  gamefiSDK.trackMove({
    type: 'swap',
    from: { x: fromX, y: fromY },
    to: { x: toX, y: toY },
    boardState: getBoardState(),
    moveNumber: ++moveCount
  })
  
  // Execute the move
  executePuzzleMove(fromX, fromY, toX, toY)
}

async function completePuzzle(score) {
  await gamefiSDK.endGameSession(score, {
    totalMoves: moveCount,
    comboCount: getComboCount(),
    timeBonus: getTimeBonus(),
    boardSize: BOARD_SIZE
  })
}
```

### Example 3: Custom UI Integration

```javascript
// Disable built-in UI and create custom integration
const gamefiSDK = new GameFiSDK({
  gameId: 'custom-rpg',
  gameName: 'Custom RPG',
  apiEndpoint: 'https://api.rpggame.com',
  uiConfig: {
    showBuyLivesButton: false,
    showLeaderboardButton: false
  },
  onLivesChanged: updateCustomLivesUI,
  onWalletConnected: updateCustomWalletUI
})

// Custom UI update functions
function updateCustomLivesUI(lives) {
  document.getElementById('custom-lives').innerHTML = 
    `<span class="heart">❤️</span> ${lives}`
}

function updateCustomWalletUI(wallet) {
  document.getElementById('wallet-display').textContent = 
    `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
}

// Custom buttons
document.getElementById('custom-buy-lives').addEventListener('click', () => {
  gamefiSDK.buyLives()
})

document.getElementById('custom-leaderboard').addEventListener('click', async () => {
  const leaderboard = await gamefiSDK.getLeaderboard('weekly')
  displayCustomLeaderboard(leaderboard)
})
```

## Backend API Requirements

Your GameFi backend needs to implement these endpoints:

### Required Endpoints
- `POST /api/game/start` - Start game session
- `POST /api/endRound` - Submit score and end session
- `POST /api/claimDaily` - Claim daily lives
- `POST /api/buyLife` - Initiate life purchase
- `GET /api/user/lives` - Get user lives data
- `GET /api/leaderboard` - Get leaderboard data

### Optional Endpoints
- `GET /api/config` - Get game configuration
- `POST /api/payments/process` - Process payments

## Error Handling

```javascript
// Wrap SDK calls in try-catch blocks
try {
  await gamefiSDK.startGameSession()
} catch (error) {
  if (error.message.includes('No lives available')) {
    // Show buy lives dialog
    showBuyLivesDialog()
  } else if (error.message.includes('Wallet not connected')) {
    // Show connect wallet dialog
    showConnectWalletDialog()
  } else {
    // Handle other errors
    console.error('Game start failed:', error)
  }
}
```

## Testing

### Development Mode
```javascript
const gamefiSDK = new GameFiSDK({
  gameId: 'test-game',
  gameName: 'Test Game',
  apiEndpoint: 'http://localhost:3000', // Local development server
  onError: (error) => {
    console.log('Development error:', error)
  }
})
```

### Mock Mode (for testing without wallet)
```javascript
// This feature would be implemented for testing
const gamefiSDK = new GameFiSDK({
  gameId: 'test-game',
  gameName: 'Test Game',
  apiEndpoint: 'https://api.mygame.com',
  mockMode: true, // Simulates wallet connection and transactions
})
```

## Best Practices

### 1. Handle SDK States
```javascript
// Always check SDK state before making calls
if (!gamefiSDK.isReady()) {
  await gamefiSDK.initialize()
}

const userData = gamefiSDK.getUserData()
if (!userData) {
  // Prompt user to connect wallet
  await gamefiSDK.connectWallet()
}
```

### 2. Graceful Degradation
```javascript
// Your game should work even if GameFi features fail
async function startGame() {
  let usingGameFi = false
  
  try {
    await gamefiSDK.startGameSession()
    usingGameFi = true
  } catch (error) {
    console.log('Playing in offline mode:', error.message)
    // Continue with regular gameplay
  }
  
  // Start your game loop
  startGameLoop(usingGameFi)
}
```

### 3. Performance Considerations
```javascript
// Don't track every single move in high-frequency games
let moveBuffer = []
let lastMoveTime = 0

function trackGameMove(moveData) {
  const now = Date.now()
  
  // Only track significant moves or every 100ms
  if (now - lastMoveTime > 100) {
    gamefiSDK.trackMove(moveData)
    lastMoveTime = now
  }
}
```

## Troubleshooting

### Common Issues

**1. "Wallet not found" error**
- Ensure user has Phantom or compatible Solana wallet installed
- Provide clear instructions for wallet installation

**2. "No lives available" error**  
- Check if user needs to claim daily lives
- Offer buy lives option
- Show time until next free life

**3. Network connection issues**
- Implement retry logic for API calls
- Cache user data when possible
- Provide offline mode fallback

**4. Score submission failures**
- Store scores locally as backup
- Retry submission on connection restore
- Validate scores client-side before submission

## Support

- Documentation: https://docs.gamefi.com
- Discord: https://discord.gg/gamefi
- Email: support@gamefi.com
- GitHub: https://github.com/gamefi-platform/sdk

## Changelog

### v1.0.0
- Initial SDK release
- Basic lives management
- Leaderboard integration
- Solana wallet support
- Anti-cheat framework 