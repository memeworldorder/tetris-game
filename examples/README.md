# GameFi SDK Examples

This directory contains practical examples showing how to integrate the GameFi SDK into different types of HTML5/JavaScript games.

## Examples Overview

### `simple-integration.js`
A comprehensive JavaScript example showing:
- Complete SDK initialization and configuration
- Wallet connection and management
- Game session lifecycle (start/end)
- Lives management (claiming daily, purchasing)
- Score submission and leaderboard integration
- Anti-cheat move tracking
- Error handling and user feedback

**Best for**: Developers who want to see a complete integration example with all features.

## Quick Start

### 1. Include the GameFi SDK

**Option A: CDN**
```html
<script src="https://cdn.gamefi.com/sdk/v1.0.0/gamefi-sdk.min.js"></script>
```

**Option B: NPM**
```bash
npm install @gamefi/web3-sdk
```

**Option C: Local Development**
```html
<script src="../lib/gamefi-sdk.js"></script>
```

### 2. Basic Integration

```javascript
// Initialize SDK
const gamefiSDK = new GameFiSDK({
  gameId: 'your-game-id',
  gameName: 'Your Game Name',
  apiEndpoint: 'https://your-gamefi-backend.com'
});

// Initialize when page loads
await gamefiSDK.initialize();

// Start game session
const session = await gamefiSDK.startGameSession();

// End game and submit score
await gamefiSDK.endGameSession(finalScore, gameData);
```

### 3. Required HTML Elements

Your game needs these HTML elements for the SDK to update:

```html
<div id="wallet-status">Not Connected</div>
<div id="lives-display">0</div>
<div id="current-score">0</div>

<button id="connect-wallet-btn">Connect Wallet</button>
<button id="start-game-btn">Start Game</button>
<button id="end-game-btn">End Game</button>
<button id="claim-lives-btn">Claim Daily Lives</button>
<button id="buy-lives-btn">Buy Lives</button>
<button id="leaderboard-btn">Leaderboard</button>

<div id="error-display" style="display: none;"></div>
```

## Integration Patterns

### Pattern 1: Arcade Game
For fast-paced games like shooters, runners, or arcade games:

```javascript
// Track high-frequency actions efficiently
let moveBuffer = [];
function trackGameMove(moveData) {
  moveBuffer.push(moveData);
  
  // Only send every 10th move to avoid performance issues
  if (moveBuffer.length >= 10) {
    gamefiSDK.trackMove({
      type: 'batch_moves',
      moves: moveBuffer,
      timestamp: Date.now()
    });
    moveBuffer = [];
  }
}
```

### Pattern 2: Puzzle Game
For turn-based or puzzle games:

```javascript
// Track each move for detailed validation
function makeMove(fromPos, toPos) {
  // Execute game logic
  const moveResult = executePuzzleMove(fromPos, toPos);
  
  // Track for anti-cheat
  gamefiSDK.trackMove({
    type: 'puzzle_move',
    from: fromPos,
    to: toPos,
    boardState: getBoardState(),
    moveNumber: getCurrentMoveNumber(),
    result: moveResult
  });
}
```

### Pattern 3: RPG/Strategy Game
For longer games with complex state:

```javascript
// Track significant events only
function onLevelComplete(level, xpGained, itemsFound) {
  gamefiSDK.trackMove({
    type: 'level_complete',
    level: level,
    xp_gained: xpGained,
    items_found: itemsFound,
    playtime: getSessionPlaytime(),
    character_stats: getCharacterStats()
  });
}
```

## Configuration Examples

### Minimal Configuration
```javascript
const gamefiSDK = new GameFiSDK({
  gameId: 'my-game',
  gameName: 'My Game',
  apiEndpoint: 'https://api.mygame.com'
});
```

### Full Configuration
```javascript
const gamefiSDK = new GameFiSDK({
  gameId: 'my-advanced-game',
  gameName: 'My Advanced Game',
  apiEndpoint: 'https://api.mygame.com',
  
  livesConfig: {
    maxLives: 10,
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
    requireServerValidation: true,
    enableMoveTracking: true
  },
  
  uiConfig: {
    theme: 'dark',
    position: 'top-left',
    showBuyLivesButton: true,
    showLeaderboardButton: true
  },
  
  // Event callbacks
  onGameStart: () => console.log('Game started!'),
  onGameEnd: (score) => console.log('Game ended:', score),
  onLivesChanged: (lives) => updateLivesDisplay(lives),
  onWalletConnected: (wallet) => console.log('Connected:', wallet),
  onError: (error) => handleGameFiError(error)
});
```

## Error Handling Best Practices

```javascript
// Always wrap SDK calls in try-catch
async function startGame() {
  try {
    await gamefiSDK.startGameSession();
    // Start your game
  } catch (error) {
    if (error.message.includes('No lives available')) {
      showBuyLivesPrompt();
    } else if (error.message.includes('Wallet not connected')) {
      showConnectWalletPrompt();
    } else {
      // Graceful degradation - play offline
      startOfflineGame();
    }
  }
}
```

## Testing and Development

### Development Mode
```javascript
const isDevelopment = window.location.hostname === 'localhost';

const gamefiSDK = new GameFiSDK({
  gameId: isDevelopment ? 'test-game' : 'production-game',
  gameName: 'My Game',
  apiEndpoint: isDevelopment 
    ? 'http://localhost:3000' 
    : 'https://api.mygame.com',
  
  onError: (error) => {
    if (isDevelopment) {
      console.warn('Development GameFi error:', error);
    } else {
      // Production error handling
      reportError(error);
    }
  }
});
```

### Mock Mode for Testing
```javascript
// For unit testing without real wallet/backend
const mockSDK = new GameFiSDK({
  gameId: 'test-game',
  gameName: 'Test Game',
  apiEndpoint: 'http://mock-api.test',
  mockMode: true, // This would simulate all operations
});
```

## Performance Considerations

1. **Initialize Once**: Only call `initialize()` once when your game loads
2. **Batch Move Tracking**: For high-frequency games, batch move tracking
3. **Error Recovery**: Implement graceful fallbacks for network issues
4. **Lazy Loading**: Only load SDK when Web3 features are needed

## Common Issues

### Issue: "Wallet not found"
**Solution**: Check if user has Phantom wallet installed
```javascript
if (typeof window !== 'undefined' && !window.solana) {
  showWalletInstallPrompt();
}
```

### Issue: Score submission fails
**Solution**: Store scores locally and retry
```javascript
async function submitScore(score) {
  try {
    await gamefiSDK.endGameSession(score);
  } catch (error) {
    // Store locally and retry later
    localStorage.setItem('pendingScore', JSON.stringify({
      score,
      timestamp: Date.now()
    }));
    
    // Retry on next successful connection
    retryPendingScores();
  }
}
```

### Issue: Lives system confusion
**Solution**: Clear UI feedback
```javascript
function updateLivesDisplay(lives) {
  const livesElement = document.getElementById('lives-display');
  livesElement.textContent = lives;
  
  if (lives <= 0) {
    showNoLivesMessage();
  }
}
```

## Next Steps

1. Review the `simple-integration.js` example
2. Check the main SDK documentation in `../SDK_INTEGRATION_GUIDE.md`
3. Set up your GameFi backend using the setup guides
4. Test with the development environment
5. Deploy to production

## Support

- Main Documentation: `../SDK_INTEGRATION_GUIDE.md`
- API Documentation: `../PROJECT_ARCHITECTURE.md`
- Setup Guides: `../GAME_API_SETUP.md`
- Discord: [GameFi Community](https://discord.gg/gamefi)
- GitHub Issues: [Report Issues](https://github.com/gamefi-platform/sdk/issues) 