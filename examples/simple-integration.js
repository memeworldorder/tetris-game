/**
 * Simple GameFi SDK Integration Example
 * 
 * This example shows how to integrate GameFi P2E mechanics
 * into a basic HTML5/JavaScript game.
 */

// Initialize the GameFi SDK
const gamefiSDK = new GameFiSDK({
  gameId: 'my-puzzle-game',
  gameName: 'My Puzzle Game',
  apiEndpoint: 'https://your-gamefi-backend.com',
  
  // Configuration options
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
    enableMoveTracking: true
  },
  
  uiConfig: {
    theme: 'dark',
    position: 'top-right',
    showBuyLivesButton: true,
    showLeaderboardButton: true
  },
  
  // Event callbacks
  onGameStart: () => {
    console.log('🎮 Game session started!');
    document.getElementById('game-status').textContent = 'Game Active';
  },
  
  onGameEnd: (score, gameData) => {
    console.log('🏁 Game ended with score:', score);
    document.getElementById('final-score').textContent = score;
    showGameOverScreen();
  },
  
  onLivesChanged: (lives) => {
    console.log('❤️ Lives updated:', lives);
    document.getElementById('lives-display').textContent = lives;
    updateUIState();
  },
  
  onWalletConnected: (wallet) => {
    console.log('🔗 Wallet connected:', wallet);
    document.getElementById('wallet-status').textContent = 
      `Connected: ${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
    updateUIState();
  },
  
  onWalletDisconnected: () => {
    console.log('🔌 Wallet disconnected');
    document.getElementById('wallet-status').textContent = 'Not Connected';
    updateUIState();
  },
  
  onError: (error) => {
    console.error('❌ GameFi SDK Error:', error);
    showErrorMessage(error);
  }
});

// Game state variables
let gameActive = false;
let currentScore = 0;
let gameStartTime = null;

/**
 * Initialize the application
 */
async function initializeApp() {
  try {
    // Initialize GameFi SDK
    await gamefiSDK.initialize();
    console.log('✅ GameFi SDK initialized successfully');
    
    // Set up UI event listeners
    setupEventListeners();
    
    // Update initial UI state
    updateUIState();
    
  } catch (error) {
    console.error('Failed to initialize app:', error);
    showErrorMessage('Failed to initialize GameFi features. Game will run in offline mode.');
  }
}

/**
 * Set up event listeners for UI elements
 */
function setupEventListeners() {
  // Wallet connection
  document.getElementById('connect-wallet-btn').addEventListener('click', async () => {
    try {
      if (gamefiSDK.getUserData()) {
        await gamefiSDK.disconnectWallet();
      } else {
        await gamefiSDK.connectWallet();
      }
    } catch (error) {
      showErrorMessage('Wallet connection failed: ' + error.message);
    }
  });
  
  // Start game
  document.getElementById('start-game-btn').addEventListener('click', startGame);
  
  // End game
  document.getElementById('end-game-btn').addEventListener('click', endGame);
  
  // Claim daily lives
  document.getElementById('claim-lives-btn').addEventListener('click', async () => {
    try {
      await gamefiSDK.claimDailyLives();
    } catch (error) {
      showErrorMessage('Failed to claim daily lives: ' + error.message);
    }
  });
  
  // Buy lives
  document.getElementById('buy-lives-btn').addEventListener('click', async () => {
    try {
      await gamefiSDK.buyLives();
    } catch (error) {
      showErrorMessage('Failed to initiate life purchase: ' + error.message);
    }
  });
  
  // Show leaderboard
  document.getElementById('leaderboard-btn').addEventListener('click', showLeaderboard);
}

/**
 * Start a new game session
 */
async function startGame() {
  try {
    // Check if SDK is ready and user has lives
    if (!gamefiSDK.isReady()) {
      throw new Error('GameFi SDK not initialized');
    }
    
    const userData = gamefiSDK.getUserData();
    if (!userData) {
      throw new Error('Please connect your wallet first');
    }
    
    if (userData.totalLives <= 0) {
      throw new Error('No lives available. Claim daily lives or purchase more.');
    }
    
    // Start GameFi session
    const session = await gamefiSDK.startGameSession();
    console.log('Game session started:', session.sessionId);
    
    // Initialize game state
    gameActive = true;
    currentScore = 0;
    gameStartTime = Date.now();
    
    // Update UI
    updateGameDisplay();
    updateUIState();
    
    // Start your game loop here
    startGameLoop();
    
  } catch (error) {
    showErrorMessage(error.message);
  }
}

/**
 * End the current game session
 */
async function endGame() {
  if (!gameActive) return;
  
  try {
    gameActive = false;
    const gameEndTime = Date.now();
    const gameDuration = gameEndTime - gameStartTime;
    
    // Prepare game data for submission
    const gameData = {
      duration: gameDuration,
      level: getCurrentLevel(),
      moves: getTotalMoves(),
      powerupsUsed: getPowerupsUsed(),
      // Add any other relevant game data
    };
    
    // Submit score to GameFi backend
    await gamefiSDK.endGameSession(currentScore, gameData);
    
    // Update UI
    updateUIState();
    
  } catch (error) {
    console.error('Failed to end game session:', error);
    showErrorMessage('Failed to submit score. Please try again.');
  }
}

/**
 * Main game loop (replace with your game logic)
 */
function startGameLoop() {
  const gameLoop = setInterval(() => {
    if (!gameActive) {
      clearInterval(gameLoop);
      return;
    }
    
    // Your game update logic here
    updateGame();
    
    // Check for game over conditions
    if (isGameOver()) {
      endGame();
    }
  }, 16); // 60 FPS
}

/**
 * Update game state (replace with your game logic)
 */
function updateGame() {
  // Example: increment score over time
  if (gameActive) {
    currentScore += 1;
    updateGameDisplay();
    
    // Track moves for anti-cheat (optional)
    if (Math.random() < 0.1) { // Track 10% of moves
      gamefiSDK.trackMove({
        type: 'auto_increment',
        score: currentScore,
        timestamp: Date.now()
      });
    }
  }
}

/**
 * Player action handler (replace with your game actions)
 */
function handlePlayerAction(actionType, actionData) {
  if (!gameActive) return;
  
  // Example actions
  switch (actionType) {
    case 'click':
      currentScore += 10;
      break;
    case 'powerup':
      currentScore += 50;
      break;
    case 'combo':
      currentScore += actionData.multiplier * 25;
      break;
  }
  
  // Track the move for anti-cheat
  gamefiSDK.trackMove({
    type: actionType,
    data: actionData,
    score: currentScore,
    timestamp: Date.now()
  });
  
  updateGameDisplay();
}

/**
 * Show leaderboard modal
 */
async function showLeaderboard() {
  try {
    const leaderboard = await gamefiSDK.getLeaderboard('daily');
    
    let leaderboardHTML = '<h3>Daily Leaderboard</h3><ol>';
    leaderboard.slice(0, 10).forEach(entry => {
      leaderboardHTML += `
        <li>
          <strong>${entry.walletAddress.slice(0, 6)}...${entry.walletAddress.slice(-4)}</strong>
          <span>${entry.score.toLocaleString()} points</span>
        </li>
      `;
    });
    leaderboardHTML += '</ol>';
    
    // Show in modal (implement your modal logic)
    showModal('Leaderboard', leaderboardHTML);
    
  } catch (error) {
    showErrorMessage('Failed to load leaderboard: ' + error.message);
  }
}

/**
 * Update UI state based on current game and wallet status
 */
function updateUIState() {
  const userData = gamefiSDK.getUserData();
  const isConnected = !!userData;
  const hasLives = isConnected && userData.totalLives > 0;
  
  // Update button states
  document.getElementById('connect-wallet-btn').textContent = 
    isConnected ? 'Disconnect Wallet' : 'Connect Wallet';
  
  document.getElementById('start-game-btn').disabled = !hasLives || gameActive;
  document.getElementById('end-game-btn').disabled = !gameActive;
  document.getElementById('claim-lives-btn').disabled = !isConnected;
  document.getElementById('buy-lives-btn').disabled = !isConnected;
  document.getElementById('leaderboard-btn').disabled = !isConnected;
  
  // Update displays
  if (isConnected) {
    document.getElementById('lives-display').textContent = userData.totalLives;
    document.getElementById('high-score').textContent = userData.highScore?.toLocaleString() || '0';
  }
}

/**
 * Update game display elements
 */
function updateGameDisplay() {
  document.getElementById('current-score').textContent = currentScore.toLocaleString();
  document.getElementById('game-time').textContent = 
    gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) + 's' : '0s';
}

/**
 * Show error message to user
 */
function showErrorMessage(message) {
  // Implement your error display logic
  const errorElement = document.getElementById('error-display');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 5000);
  } else {
    alert(message); // Fallback
  }
}

/**
 * Show game over screen
 */
function showGameOverScreen() {
  // Implement your game over screen
  const finalScore = currentScore;
  const gameDuration = gameStartTime ? Date.now() - gameStartTime : 0;
  
  console.log(`Game Over! Score: ${finalScore}, Duration: ${gameDuration}ms`);
  
  // Show game over modal or screen
  showModal('Game Over', `
    <h3>Game Complete!</h3>
    <p>Final Score: <strong>${finalScore.toLocaleString()}</strong></p>
    <p>Time Played: <strong>${Math.floor(gameDuration / 1000)}s</strong></p>
    <p>Score submitted to leaderboard!</p>
  `);
}

/**
 * Generic modal display function
 */
function showModal(title, content) {
  // Implement your modal logic here
  // This is a simple example using browser alert
  alert(`${title}\n\n${content.replace(/<[^>]*>/g, '')}`);
}

// Game logic helpers (replace with your actual game logic)
function getCurrentLevel() {
  return Math.floor(currentScore / 1000) + 1;
}

function getTotalMoves() {
  return Math.floor(currentScore / 10);
}

function getPowerupsUsed() {
  return Math.floor(currentScore / 500);
}

function isGameOver() {
  // Replace with your game over conditions
  return currentScore >= 10000; // End game at 10k points
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', initializeApp);

// Example HTML structure you'll need:
/*
<div id="game-container">
  <div id="wallet-status">Not Connected</div>
  <div id="lives-display">0</div>
  <div id="current-score">0</div>
  <div id="game-time">0s</div>
  <div id="high-score">0</div>
  
  <button id="connect-wallet-btn">Connect Wallet</button>
  <button id="start-game-btn">Start Game</button>
  <button id="end-game-btn">End Game</button>
  <button id="claim-lives-btn">Claim Daily Lives</button>
  <button id="buy-lives-btn">Buy Lives</button>
  <button id="leaderboard-btn">Leaderboard</button>
  
  <div id="error-display" style="display: none;"></div>
</div>
*/ 