"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import GameBoard from "@/components/game-board"
import LivesDisplay from "@/components/lives-display"
import WalletConnectButton from "@/components/wallet-connect-button"
import PaymentModal from "@/components/payment-modal"
import { useWallet } from "@solana/wallet-adapter-react"
import { useIsMobile } from "@/hooks/use-mobile"
import type { UserData } from "@/types/wallet"

export default function GameView() {
  const { connected, publicKey } = useWallet()
  const isMobile = useIsMobile()
  const gameContainerRef = useRef<HTMLDivElement>(null)

  const [gameStarted, setGameStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lines, setLines] = useState(0)
  const [gameKey, setGameKey] = useState(0)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [gameSessionId, setGameSessionId] = useState<number | null>(null)
  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [viewportHeight, setViewportHeight] = useState(0)

  // Update viewport height on mount and resize
  useEffect(() => {
    const updateViewportHeight = () => {
      setViewportHeight(window.innerHeight)
    }

    updateViewportHeight()
    window.addEventListener("resize", updateViewportHeight)

    return () => {
      window.removeEventListener("resize", updateViewportHeight)
    }
  }, [])

  // Fetch user data when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      fetchUserData()
    } else {
      setUserData(null)
      setIsOfflineMode(false)
    }
  }, [connected, publicKey])

  const fetchUserData = async () => {
    if (!publicKey) return

    setLoading(true)

    try {
      const response = await fetch(`/api/user/lives?wallet=${publicKey}`)

      // Check if response is ok
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const data = await response.json()

      // Check if the response contains a warning (offline mode)
      if (data.warning) {
        setIsOfflineMode(true)
      }

      setUserData(data)
    } catch (error) {
      console.error("Error fetching user data:", error)
      setIsOfflineMode(true)

      // Set default user data to allow gameplay without database
      setUserData({
        walletAddress: publicKey.toString(),
        totalLives: 5,
        lastLifeLost: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  const startGame = async () => {
    if (!connected || !publicKey) {
      return
    }

    // Check if user has lives
    if (!userData || userData.totalLives <= 0) {
      setShowPaymentModal(true)
      return
    }

    setLoading(true)

    try {
      // Use a life
      const response = await fetch("/api/user/use-life", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ walletAddress: publicKey.toString() }),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        if (updatedUser.warning) {
          setIsOfflineMode(true)
        }
        setUserData(updatedUser)
      } else {
        // If API fails, just decrement lives locally
        setUserData((prev) => (prev ? { ...prev, totalLives: Math.max(0, prev.totalLives - 1) } : null))
        setIsOfflineMode(true)
      }

      // Start game session (optional, continue even if it fails)
      try {
        const sessionResponse = await fetch("/api/game/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ walletAddress: publicKey.toString() }),
        })

        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json()
          setGameSessionId(sessionData.sessionId)
        }
      } catch (sessionError) {
        console.warn("Failed to start game session:", sessionError)
        // Continue without session tracking
      }

      // Reset all game state
      setGameOver(false)
      setScore(0)
      setLevel(1)
      setLines(0)

      // Force a new game instance by changing the key
      setGameKey((prevKey) => prevKey + 1)

      setTimeout(() => {
        setGameStarted(true)
      }, 0)
    } catch (error) {
      console.error("Error starting game:", error)
      setIsOfflineMode(true)
    } finally {
      setLoading(false)
    }
  }

  const handleGameOver = useCallback(async () => {
    setGameOver(true)
    setGameStarted(false)

    // End game session (optional)
    if (gameSessionId) {
      try {
        await fetch("/api/game/end", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: gameSessionId,
            score,
            level,
            linesCleared: lines,
          }),
        })
      } catch (error) {
        console.warn("Error ending game session:", error)
        // Continue without session tracking
      }
    }
  }, [gameSessionId, score, level, lines])

  const updateScore = useCallback(
    (linesCleared: number) => {
      const linePoints = [0, 40, 100, 300, 1200]
      setScore((prev) => prev + linePoints[linesCleared] * level)

      const newLines = lines + linesCleared
      setLines(newLines)

      // Level up every 10 lines
      const newLevel = Math.floor(newLines / 10) + 1
      if (newLevel > level) {
        setLevel(newLevel)
      }
    },
    [level, lines],
  )

  const handlePaymentSuccess = () => {
    fetchUserData() // Refresh user data after payment
  }

  // Show wallet connection screen if not connected
  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-300 tracking-tight mb-1 animate-gold-wave">
            MWOR
          </h1>
          <h2 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-2">TETRIS</h2>
          <p className="text-purple-300 text-lg">The Classic Block Puzzle Game</p>
        </div>

        <div className="bg-gray-900/80 backdrop-blur-sm p-6 rounded-2xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)] w-full max-w-sm mb-8">
          <h3 className="text-xl font-bold text-amber-400 mb-4 text-center">Connect Wallet to Play</h3>
          <p className="text-gray-300 text-sm mb-6 text-center">
            Connect your Solana wallet to start playing and track your progress on the blockchain.
          </p>
          <div className="flex justify-center">
            <WalletConnectButton />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
          <div className="bg-gray-900/80 backdrop-blur-sm p-4 rounded-xl border border-purple-500/30">
            <h3 className="text-lg font-bold text-amber-400 mb-2">Blockchain Gaming</h3>
            <p className="text-gray-300 text-sm">
              Your progress and rewards are stored on the Solana blockchain. Play to earn MWOR tokens and compete for
              weekly prizes.
            </p>
          </div>
          <div className="bg-gray-900/80 backdrop-blur-sm p-4 rounded-xl border border-purple-500/30">
            <h3 className="text-lg font-bold text-amber-400 mb-2">Lives System</h3>
            <p className="text-gray-300 text-sm">
              Each game costs 1 life. Lives regenerate every 8 hours or can be purchased instantly with SOL or MWOR
              tokens.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  if (!gameStarted && !gameOver) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-300 tracking-tight mb-1 animate-gold-wave">
            MWOR
          </h1>
          <h2 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-2">TETRIS</h2>
          <p className="text-purple-300 text-lg">The Classic Block Puzzle Game</p>
        </div>

        <div className="bg-gray-900/80 backdrop-blur-sm p-6 rounded-2xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)] w-full max-w-sm mb-8">
          <div className="flex justify-between items-center mb-6">
            <WalletConnectButton />
            {userData && <LivesDisplay currentLives={userData.totalLives} maxLives={5} timeToNextLife={null} />}
          </div>

          {isOfflineMode && (
            <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg mb-4">
              <p className="text-blue-300 text-sm">🔄 Offline Mode</p>
              <p className="text-blue-400 text-xs mt-1">Database unavailable - progress won't be saved</p>
            </div>
          )}

          <Button
            onClick={startGame}
            disabled={loading || !userData || userData.totalLives <= 0}
            className={`w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-bold py-4 rounded-lg text-lg shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.7)] ${
              !userData || userData.totalLives <= 0 ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {userData && userData.totalLives > 0 ? "Start Game" : "No Lives Left"}
          </Button>

          {userData && userData.totalLives <= 0 && !isOfflineMode && (
            <Button
              onClick={() => setShowPaymentModal(true)}
              className="w-full mt-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold py-3 rounded-lg"
            >
              Buy Lives
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
          <div className="bg-gray-900/80 backdrop-blur-sm p-4 rounded-xl border border-purple-500/30">
            <h3 className="text-lg font-bold text-amber-400 mb-2">High Scores</h3>
            <p className="text-gray-300 text-sm">
              The higher the score, the higher the XP reward, and top spots on the board at the end of the week compete
              for 1million MWOR tokens.
            </p>
          </div>
          <div className="bg-gray-900/80 backdrop-blur-sm p-4 rounded-xl border border-purple-500/30">
            <h3 className="text-lg font-bold text-amber-400 mb-2">Lives System</h3>
            <p className="text-gray-300 text-sm">
              Lives regenerate every 8 hours (max 5). Buy instant lives with 0.01 SOL or 100 MWOR tokens.
            </p>
          </div>
        </div>

        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      </div>
    )
  }

  if (gameOver) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="bg-gray-900/80 backdrop-blur-sm p-8 rounded-2xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)] max-w-sm w-full">
          <h2 className="text-3xl font-bold text-amber-400 mb-4 text-center">Game Over</h2>
          <div className="flex flex-col items-center justify-center my-6 p-4 bg-gray-800/50 rounded-lg border border-purple-500/20">
            <p className="text-gray-400 text-sm mb-1">Your Score</p>
            <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
              {score}
            </p>
            <div className="grid grid-cols-2 gap-4 w-full mt-4 text-center">
              <div>
                <p className="text-gray-400 text-xs">Level</p>
                <p className="text-xl font-bold text-white">{level}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Lines</p>
                <p className="text-xl font-bold text-white">{lines}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-center mb-4">
            {userData && <LivesDisplay currentLives={userData.totalLives} maxLives={5} timeToNextLife={null} />}
          </div>

          {isOfflineMode && (
            <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg mb-4">
              <p className="text-blue-300 text-sm">🔄 Offline Mode</p>
              <p className="text-blue-400 text-xs mt-1">Score not saved - database unavailable</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              onClick={startGame}
              disabled={loading || !userData || userData.totalLives <= 0}
              className={`w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-bold py-3 rounded-lg text-lg shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.7)] ${
                !userData || userData.totalLives <= 0 ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {userData && userData.totalLives > 0 ? "Play Again" : "No Lives Left"}
            </Button>

            {userData && userData.totalLives <= 0 && !isOfflineMode && (
              <Button
                onClick={() => setShowPaymentModal(true)}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold py-3 rounded-lg"
              >
                Buy Lives
              </Button>
            )}

            <Button
              onClick={() => {
                setGameStarted(false)
                setGameOver(false)
              }}
              variant="outline"
              className="border-purple-500/50 text-purple-300 hover:bg-purple-900/20"
            >
              Main Menu
            </Button>
          </div>
        </div>

        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      </div>
    )
  }

  // Active gameplay view - optimized for mobile
  return (
    <div
      ref={gameContainerRef}
      className="flex flex-col items-center justify-start w-full"
      style={{
        minHeight: isMobile ? `${viewportHeight - 80}px` : "calc(100vh - 80px)",
        paddingTop: isMobile ? "8px" : "16px",
        paddingBottom: isMobile ? "8px" : "16px",
      }}
    >
      {/* Game header with score and lives - more compact on mobile */}
      <div className={`w-full ${isMobile ? "max-w-none px-4 mb-1" : "max-w-sm px-2 mb-4"} flex justify-between items-center`}>
        <div className="text-center">
          <p className="text-gray-400 text-xs">Score</p>
          <p
            className={`${isMobile ? "text-lg" : "text-xl"} font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400`}
          >
            {score.toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-gray-400 text-xs">Level</p>
          <p className={`${isMobile ? "text-lg" : "text-xl"} font-bold text-white`}>{level}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-400 text-xs">Lines</p>
          <p className={`${isMobile ? "text-lg" : "text-xl"} font-bold text-white`}>{lines}</p>
        </div>
      </div>

      {/* Lives display - more compact on mobile */}
      <div className={isMobile ? "mb-1" : "mb-4"}>
        {userData && <LivesDisplay currentLives={userData.totalLives} maxLives={5} timeToNextLife={null} />}
      </div>

      {/* Offline mode indicator during gameplay */}
      {isOfflineMode && (
        <div className="mb-1">
          <div className="bg-blue-900/20 border border-blue-500/30 px-3 py-1 rounded-lg">
            <p className="text-blue-300 text-xs">🔄 Offline Mode</p>
          </div>
        </div>
      )}

      {/* Game board - dynamically sized, wider on mobile */}
      <div className={`flex-1 flex items-center justify-center w-full ${isMobile ? "px-2" : ""}`}>
        <div className="relative w-full max-w-full">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-cyan-600/20 rounded-2xl blur-xl"></div>
          <div className={`relative bg-gray-900/90 backdrop-blur-sm ${isMobile ? "p-1" : "p-2"} rounded-2xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]`}>
            <GameBoard
              key={gameKey}
              level={level}
              onGameOver={handleGameOver}
              onLinesCleared={updateScore}
              isFullscreen={true}
              walletAddress={publicKey?.toString()}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
