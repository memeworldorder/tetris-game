/**
 * GAME INTEGRATION EXAMPLE
 * 
 * This component demonstrates how to integrate Supabase Edge Functions
 * into your Tetris game. It shows the complete game flow from start to finish.
 * 
 * @features
 * - Check user lives before starting
 * - Start game session with edge function
 * - Track game state during play
 * - End game with score submission
 * - Display achievements and results
 * - Handle errors gracefully
 * 
 * @usage
 * <GameIntegrationExample walletAddress="FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai" />
 */

'use client'

import { useState, useEffect } from 'react'
import { gameAPI, gameUtils, type UserLives, type GameSession } from '@/lib/supabase-edge-functions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface GameIntegrationExampleProps {
  walletAddress: string
}

type GameState = 'loading' | 'ready' | 'playing' | 'completed' | 'error'

export function GameIntegrationExample({ walletAddress }: GameIntegrationExampleProps) {
  // Game state management
  const [gameState, setGameState] = useState<GameState>('loading')
  const [userLives, setUserLives] = useState<UserLives | null>(null)
  const [currentSession, setCurrentSession] = useState<string | null>(null)
  const [gameScore, setGameScore] = useState(0)
  const [gameStartTime, setGameStartTime] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [achievements, setAchievements] = useState<string[]>([])
  const [isPersonalBest, setIsPersonalBest] = useState(false)

  /**
   * Load user lives on component mount
   */
  useEffect(() => {
    loadUserLives()
  }, [walletAddress])

  /**
   * Load user's current life count
   */
  const loadUserLives = async () => {
    try {
      setGameState('loading')
      setError(null)
      
      const lives = await gameAPI.getUserLives(walletAddress)
      setUserLives(lives)
      setGameState('ready')
      
      console.log('✅ User lives loaded:', lives)
    } catch (err: any) {
      console.error('❌ Failed to load user lives:', err)
      setError(`Failed to load user data: ${err.message}`)
      setGameState('error')
    }
  }

  /**
   * Start a new game session
   */
  const startGame = async () => {
    if (!userLives || !gameUtils.canPlay(userLives)) {
      setError('No lives available! Wait for daily reset or purchase more lives.')
      return
    }

    try {
      setGameState('loading')
      setError(null)
      
      // Call edge function to start game
      const response = await gameAPI.startGame(walletAddress, 'tetris')
      
      setCurrentSession(response.session_id)
      setUserLives(response.remaining_lives)
      setGameScore(0)
      setGameStartTime(Date.now())
      setGameState('playing')
      
      console.log('🎮 Game started:', response)
      console.log(`Session ID: ${response.session_id}`)
      console.log(`Lives remaining: ${gameUtils.getTotalLives(response.remaining_lives)}`)
      
    } catch (err: any) {
      console.error('❌ Failed to start game:', err)
      setError(`Failed to start game: ${err.message}`)
      setGameState('ready')
    }
  }

  /**
   * Simulate game play (in real game, this would be your Tetris logic)
   */
  const simulateGamePlay = () => {
    if (gameState !== 'playing') return

    // Simulate score increases
    const interval = setInterval(() => {
      setGameScore(prev => prev + Math.floor(Math.random() * 1000))
    }, 1000)

    // Auto-end game after 30 seconds for demo
    setTimeout(() => {
      clearInterval(interval)
      endGame()
    }, 30000)

    return () => clearInterval(interval)
  }

  /**
   * End the current game session
   */
  const endGame = async () => {
    if (!currentSession || !gameStartTime) {
      setError('No active game session')
      return
    }

    try {
      setGameState('loading')
      setError(null)
      
      const gameDuration = Math.floor((Date.now() - gameStartTime) / 1000)
      const linesCleared = Math.floor(gameScore / 1000) // Example calculation
      const levelReached = Math.floor(linesCleared / 10) + 1
      
      // Call edge function to end game
      const response = await gameAPI.endGame({
        sessionId: currentSession,
        walletAddress,
        score: gameScore,
        linesCleared,
        gameDuration,
        levelReached
      })
      
      setAchievements(response.achievements)
      setIsPersonalBest(response.personal_best)
      setGameState('completed')
      
      console.log('🏁 Game completed:', response)
      console.log(`Final score: ${gameUtils.formatScore(response.final_score)}`)
      console.log(`Achievements: ${response.achievements.join(', ')}`)
      
      if (response.personal_best) {
        console.log('🎉 New personal best!')
      }
      
    } catch (err: any) {
      console.error('❌ Failed to end game:', err)
      setError(`Failed to end game: ${err.message}`)
      setGameState('playing')
    }
  }

  /**
   * Reset for new game
   */
  const resetGame = () => {
    setCurrentSession(null)
    setGameScore(0)
    setGameStartTime(null)
    setAchievements([])
    setIsPersonalBest(false)
    setError(null)
    loadUserLives() // Refresh lives
  }

  /**
   * Render loading state
   */
  if (gameState === 'loading') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* User Lives Display */}
      {userLives && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Your Lives</CardTitle>
            <CardDescription>
              Wallet: {gameUtils.formatWalletAddress(walletAddress)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="default">
                🆓 Free: {userLives.free_today}
              </Badge>
              <Badge variant="secondary">
                ⭐ Bonus: {userLives.bonus_today}
              </Badge>
              <Badge variant="outline">
                💰 Paid: {userLives.paid_bank}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Total: {gameUtils.getTotalLives(userLives)} lives
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Game State: Ready */}
      {gameState === 'ready' && (
        <Card>
          <CardHeader>
            <CardTitle>Ready to Play</CardTitle>
            <CardDescription>
              {userLives && gameUtils.canPlay(userLives) 
                ? 'Click Start Game to begin playing Tetris!'
                : 'No lives available. Wait for daily reset or purchase more lives.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={startGame}
              disabled={!userLives || !gameUtils.canPlay(userLives)}
              className="w-full"
            >
              🎮 Start Game
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Game State: Playing */}
      {gameState === 'playing' && (
        <Card>
          <CardHeader>
            <CardTitle>Game in Progress</CardTitle>
            <CardDescription>
              Session: {currentSession?.slice(0, 8)}...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {gameUtils.formatScore(gameScore)}
              </div>
              <p className="text-sm text-muted-foreground">Current Score</p>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={simulateGamePlay} variant="outline" className="flex-1">
                🎯 Simulate Play
              </Button>
              <Button onClick={endGame} variant="destructive" className="flex-1">
                🏁 End Game
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Game State: Completed */}
      {gameState === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏁 Game Complete
              {isPersonalBest && <Badge variant="default">🎉 Personal Best!</Badge>}
            </CardTitle>
            <CardDescription>
              Final Score: {gameUtils.formatScore(gameScore)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Achievements */}
            {achievements.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Achievements Unlocked:</h4>
                <div className="flex flex-wrap gap-1">
                  {achievements.map((achievement) => (
                    <Badge key={achievement} variant="secondary" className="text-xs">
                      {gameUtils.getAchievementName(achievement)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <Button onClick={resetGame} className="w-full">
              🔄 Play Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Game State: Error */}
      {gameState === 'error' && (
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Something went wrong</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadUserLives} className="w-full">
              🔄 Try Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 