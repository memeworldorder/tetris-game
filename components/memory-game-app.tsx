"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Heart,
  Star,
  Sun,
  Moon,
  Cloud,
  Flower2,
  Zap,
  Music,
  Umbrella,
  Gift,
  Cake,
  Plane,
  Trophy,
  Sparkles,
  Share2,
  Volume2,
  VolumeX,
  Menu,
  X,
  ChevronLeft,
  Clock,
  Wallet,
  Plus,
  RefreshCw,
  type LucideIcon,
} from "lucide-react"
import { LeaderboardModal } from "./components/leaderboard-modal"
import { ChallengesModal } from "./components/challenges-modal"
import { ShareModal } from "./components/share-modal"
import { soundManager } from "./lib/sound-manager"
import { CardIcon } from "./components/card-icon"
import { WalletModal } from "./components/wallet-modal"
import { StoreModal } from "./components/store-modal"
import { type WalletInfo, walletConnector } from "./lib/wallet-connect"

// Define a card type that can use either an icon or an image
type MemoryCard = {
  id: number
  icon?: LucideIcon
  imageSrc?: string
  isMatched: boolean
  color: string
}

type LevelConfig = {
  rows: number
  cols: number
  pairsCount: number
  timeLimit: number
  timeBonus: number
  basePoints: number
  lives: number
}

// Update the LEVEL_CONFIGS to remove extra lives for higher levels - all levels now have 3 lives
const LEVEL_CONFIGS: LevelConfig[] = [
  // Level 1 - Beginner
  {
    rows: 2,
    cols: 3,
    pairsCount: 3,
    timeLimit: 39,
    timeBonus: 8,
    basePoints: 100,
    lives: 3,
  },
  // Level 2 - Easy
  {
    rows: 3,
    cols: 4,
    pairsCount: 6,
    timeLimit: 59,
    timeBonus: 7,
    basePoints: 200,
    lives: 3,
  },
  // Level 3 - Medium
  {
    rows: 4,
    cols: 4,
    pairsCount: 8,
    timeLimit: 78,
    timeBonus: 12,
    basePoints: 300,
    lives: 3,
  },
  // Level 4 - Challenging
  {
    rows: 4,
    cols: 5,
    pairsCount: 10,
    timeLimit: 98,
    timeBonus: 5,
    basePoints: 400,
    lives: 3,
  },
  // Level 5 - Hard
  {
    rows: 5,
    cols: 6,
    pairsCount: 15,
    timeLimit: 117,
    timeBonus: 4,
    basePoints: 500,
    lives: 3,
  },
  // Level 6 - Expert
  {
    rows: 6,
    cols: 6,
    pairsCount: 18,
    timeLimit: 130,
    timeBonus: 3,
    basePoints: 600,
    lives: 3,
  },
  // Level 7 - Master
  {
    rows: 6,
    cols: 7,
    pairsCount: 21,
    timeLimit: 150,
    timeBonus: 3,
    basePoints: 700,
    lives: 3,
  },
  // Level 8 - Champion
  {
    rows: 7,
    cols: 7,
    pairsCount: 24,
    timeLimit: 170,
    timeBonus: 2,
    basePoints: 800,
    lives: 3,
  },
  // Level 9 - Legend
  {
    rows: 7,
    cols: 8,
    pairsCount: 28,
    timeLimit: 190,
    timeBonus: 2,
    basePoints: 900,
    lives: 3,
  },
  // Level 10 - MWOR God
  {
    rows: 8,
    cols: 8,
    pairsCount: 32,
    timeLimit: 210,
    timeBonus: 1,
    basePoints: 1000,
    lives: 3,
  },
]

// Updated crypto assets with the new images
const CRYPTO_ASSETS = [
  {
    imageSrc:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Upscaled_A_vector_illustration_features_a_cryptocurrency_co-gPSqUpv3QCMYZL6wlfYBsLRgFgBjYD.png",
    color: "text-blue-400",
  },
  {
    imageSrc:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Upscaled_Solana_Coin-yuVpw2RHPst41gtQBvBVIE4Tx2mXAs.png",
    color: "text-amber-400",
  },
  {
    imageSrc:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Upscaled_A_2D_digital_illustration_showcases_a_glowing_gree-B9ljq6gMi3f5wwUroldancDlnAEiGH.png",
    color: "text-green-400",
  },
  {
    imageSrc:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Upscaled_A_2D_vector_illustration_features_a_stylized_carto-zN1DKtWfzuOjWHApjypXxnopiIazqm.png",
    color: "text-yellow-400",
  },
  {
    imageSrc: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/character-Ymp0bIUwDNv5nNKlLWjef7dVfac2Zs.png",
    color: "text-purple-400",
  },
  {
    imageSrc: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/rocket-AAU734EwDs3L3voBuBtaMfsitixI7y.png",
    color: "text-red-400",
  },
  {
    imageSrc: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/duck-8EArBpdKUOIXIczYpxqZBbshTRIKyZ.png",
    color: "text-cyan-400",
  },
]

// Additional generated crypto assets
const ADDITIONAL_CRYPTO_ASSETS = [
  { imageSrc: "/placeholder-htg4a.png", color: "text-orange-400" },
  { imageSrc: "/ethereum-coin.png", color: "text-indigo-400" },
  { imageSrc: "/placeholder.svg?height=200&width=200", color: "text-yellow-500" },
  { imageSrc: "/placeholder.svg?height=200&width=200", color: "text-pink-400" },
  { imageSrc: "/placeholder.svg?height=200&width=200", color: "text-blue-500" },
]

// Fallback icons if we run out of crypto assets
const FALLBACK_ICONS = [
  { icon: Heart, color: "text-rose-400" },
  { icon: Star, color: "text-amber-400" },
  { icon: Sun, color: "text-yellow-400" },
  { icon: Moon, color: "text-purple-400" },
  { icon: Cloud, color: "text-sky-400" },
  { icon: Flower2, color: "text-emerald-400" },
  { icon: Zap, color: "text-yellow-500" },
  { icon: Music, color: "text-blue-400" },
  { icon: Umbrella, color: "text-indigo-400" },
  { icon: Gift, color: "text-pink-400" },
  { icon: Cake, color: "text-orange-400" },
  { icon: Plane, color: "text-cyan-400" },
]

const createCards = (level: number): MemoryCard[] => {
  const config = LEVEL_CONFIGS[level]
  const pairsCount = config.pairsCount

  // Combine all asset types
  let allCardTypes = [...CRYPTO_ASSETS]

  // If we need more card types than the provided crypto assets, add generated ones
  if (pairsCount > CRYPTO_ASSETS.length) {
    const neededAdditional = Math.min(pairsCount - CRYPTO_ASSETS.length, ADDITIONAL_CRYPTO_ASSETS.length)
    allCardTypes = [...allCardTypes, ...ADDITIONAL_CRYPTO_ASSETS.slice(0, neededAdditional)]
  }

  // If we still need more, add fallback icons
  if (pairsCount > allCardTypes.length) {
    const neededFallbacks = pairsCount - allCardTypes.length
    allCardTypes = [...allCardTypes, ...FALLBACK_ICONS.slice(0, neededFallbacks)]
  }

  // Ensure we only use the number of card types we need
  allCardTypes = allCardTypes.slice(0, pairsCount)

  const cards: MemoryCard[] = []

  allCardTypes.forEach(({ icon, imageSrc, color }, index) => {
    cards.push(
      { id: index * 2, icon, imageSrc, color, isMatched: false },
      { id: index * 2 + 1, icon, imageSrc, color, isMatched: false },
    )
  })

  // Advanced shuffling algorithm to prevent clustering
  const shuffleWithAntiClustering = (array: MemoryCard[]): MemoryCard[] => {
    const shuffled = [...array]
    const { rows, cols } = config
    const totalCards = rows * cols

    // First, do a basic Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    // Function to check if two cards are the same type
    const isSameType = (card1: MemoryCard, card2: MemoryCard): boolean => {
      return (
        (card1.imageSrc && card2.imageSrc && card1.imageSrc === card2.imageSrc) ||
        (card1.icon && card2.icon && card1.icon === card2.icon)
      )
    }

    // Function to get adjacent positions in the grid
    const getAdjacentPositions = (index: number): number[] => {
      const row = Math.floor(index / cols)
      const col = index % cols
      const adjacent: number[] = []

      // Check all 8 directions (including diagonals)
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue // Skip the current position
          const newRow = row + dr
          const newCol = col + dc
          if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
            adjacent.push(newRow * cols + newCol)
          }
        }
      }
      return adjacent
    }

    // Anti-clustering optimization - try to separate matching pairs
    let maxAttempts = 100
    let improved = true

    while (improved && maxAttempts > 0) {
      improved = false
      maxAttempts--

      for (let i = 0; i < totalCards; i++) {
        const adjacentPositions = getAdjacentPositions(i)
        const currentCard = shuffled[i]

        // Count how many adjacent cards are the same type
        let adjacentSameType = 0
        for (const adjPos of adjacentPositions) {
          if (adjPos < shuffled.length && isSameType(currentCard, shuffled[adjPos])) {
            adjacentSameType++
          }
        }

        // If there are too many same-type cards adjacent, try to swap
        if (adjacentSameType > 0) {
          // Find a better position for this card
          for (let j = i + 1; j < totalCards; j++) {
            if (j >= shuffled.length) break

            const testCard = shuffled[j]
            if (isSameType(currentCard, testCard)) continue // Don't swap with same type

            // Check if swapping would improve the situation
            const jAdjacentPositions = getAdjacentPositions(j)

            let currentAdjSameAtI = 0
            let currentAdjSameAtJ = 0
            let newAdjSameAtI = 0
            let newAdjSameAtJ = 0

            // Count current adjacent same types
            for (const adjPos of adjacentPositions) {
              if (adjPos < shuffled.length && adjPos !== j && isSameType(currentCard, shuffled[adjPos])) {
                currentAdjSameAtI++
              }
              if (adjPos < shuffled.length && adjPos !== j && isSameType(testCard, shuffled[adjPos])) {
                newAdjSameAtI++
              }
            }

            for (const adjPos of jAdjacentPositions) {
              if (adjPos < shuffled.length && adjPos !== i && isSameType(testCard, shuffled[adjPos])) {
                currentAdjSameAtJ++
              }
              if (adjPos < shuffled.length && adjPos !== i && isSameType(currentCard, shuffled[adjPos])) {
                newAdjSameAtJ++
              }
            }

            // If swapping reduces clustering, do it
            const currentClustering = currentAdjSameAtI + currentAdjSameAtJ
            const newClustering = newAdjSameAtI + newAdjSameAtJ

            if (newClustering < currentClustering) {
              ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
              improved = true
              break
            }
          }
        }
      }
    }

    // Final randomization pass to add more entropy
    for (let i = 0; i < 10; i++) {
      const pos1 = Math.floor(Math.random() * totalCards)
      const pos2 = Math.floor(Math.random() * totalCards)

      if (pos1 < shuffled.length && pos2 < shuffled.length && pos1 !== pos2) {
        // Only swap if it doesn't create immediate adjacency of same types
        const adjacent1 = getAdjacentPositions(pos1)
        const adjacent2 = getAdjacentPositions(pos2)

        let wouldCreateClustering = false

        // Check if swapping would create clustering
        for (const adjPos of adjacent1) {
          if (adjPos < shuffled.length && adjPos !== pos2 && isSameType(shuffled[pos2], shuffled[adjPos])) {
            wouldCreateClustering = true
            break
          }
        }

        if (!wouldCreateClustering) {
          for (const adjPos of adjacent2) {
            if (adjPos < shuffled.length && adjPos !== pos1 && isSameType(shuffled[pos1], shuffled[adjPos])) {
              wouldCreateClustering = true
              break
            }
          }
        }

        if (!wouldCreateClustering) {
          ;[shuffled[pos1], shuffled[pos2]] = [shuffled[pos2], shuffled[pos1]]
        }
      }
    }

    return shuffled.slice(0, totalCards)
  }

  return shuffleWithAntiClustering(cards)
}

type GameState = "menu" | "playing" | "levelComplete" | "gameOver"

// Check if we're in a Telegram WebApp environment
const isTelegramWebApp = () => {
  return typeof window !== "undefined" && "Telegram" in window && "WebApp" in (window as any).Telegram
}

// Check if we're on a mobile device
const isMobileDevice = () => {
  if (typeof window === "undefined") return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// Hook to get viewport dimensions
const useViewport = () => {
  const [viewport, setViewport] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    updateViewport()
    window.addEventListener("resize", updateViewport)
    window.addEventListener("orientationchange", updateViewport)

    return () => {
      window.removeEventListener("resize", updateViewport)
      window.removeEventListener("orientationchange", updateViewport)
    }
  }, [])

  return viewport
}

export default function MemoryGame() {
  const [level, setLevel] = useState(0)
  const [gameState, setGameState] = useState<GameState>("menu")
  const [cards, setCards] = useState<MemoryCard[]>([])
  const [flippedIndexes, setFlippedIndexes] = useState<number[]>([])
  const [matches, setMatches] = useState(0)
  const [isChecking, setIsChecking] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [score, setScore] = useState(0)
  const [gameStartTime, setGameStartTime] = useState<number | null>(null)
  const [totalTimePlayed, setTotalTimePlayed] = useState<number | null>(null)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showChallenges, setShowChallenges] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [isSubmittingScore, setIsSubmittingScore] = useState(false)
  const [comboMultiplier, setComboMultiplier] = useState(1)
  const [maxComboMultiplier, setMaxComboMultiplier] = useState(1)
  const [lastMatchTime, setLastMatchTime] = useState(0)
  const [matchAnimation, setMatchAnimation] = useState<number | null>(null)
  const [lives, setLives] = useState(3) // Added lives state
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("mwor-game-muted") === "true"
    }
    return false
  })
  const [hasDailyChallenge, setHasDailyChallenge] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [isMobile] = useState(() => isMobileDevice())
  const [isTelegram] = useState(() => isTelegramWebApp())
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [showStoreModal, setShowStoreModal] = useState(false)
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null)
  const [isWalletConnecting, setIsWalletConnecting] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const comboTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Get viewport dimensions
  const viewport = useViewport()

  // Calculate dynamic sizes based on viewport - updated for full viewport usage
  const getDynamicSizes = () => {
    const { width, height } = viewport

    // Reserve space for header (60px) and bottom navigation (80px) and some padding
    const headerHeight = 60
    const bottomNavHeight = 80
    const padding = 16
    const availableHeight = height - headerHeight - bottomNavHeight - padding * 2
    const availableWidth = width - padding * 2

    const config = LEVEL_CONFIGS[level]
    const { rows, cols } = config

    // Calculate card size to fill available space
    const cardWidth = Math.floor((availableWidth - (cols - 1) * 8) / cols) // 8px gap between cards
    const cardHeight = Math.floor((availableHeight - (rows - 1) * 8) / rows)
    const cardSize = Math.min(cardWidth, cardHeight, 120) // Max 120px for very large screens

    // Button and text sizes
    const buttonHeight = Math.max(44, Math.min(56, height * 0.07))
    const smallButtonHeight = Math.max(36, Math.min(44, height * 0.055))
    const titleSize = Math.max(18, Math.min(24, width * 0.06))
    const textSize = Math.max(14, Math.min(16, width * 0.04))
    const smallTextSize = Math.max(12, Math.min(14, width * 0.035))

    return {
      cardSize,
      buttonHeight,
      smallButtonHeight,
      titleSize,
      textSize,
      smallTextSize,
      availableWidth,
      availableHeight,
      headerHeight,
      bottomNavHeight,
      gap: Math.max(6, Math.min(8, cardSize * 0.08)),
    }
  }

  const sizes = getDynamicSizes()

  // Initialize Telegram WebApp if available
  useEffect(() => {
    if (isTelegram) {
      const tg = (window as any).Telegram.WebApp

      // Set theme according to Telegram theme
      document.body.classList.add("telegram-theme")

      // Expand the WebApp to fullscreen
      tg.expand()

      // Set the header color to match our theme
      tg.setHeaderColor("#000000")
      tg.setBackgroundColor("#000000")

      // Handle back button
      tg.BackButton.onClick(() => {
        if (gameState === "playing") {
          setGameState("menu")
        }
      })
    }
  }, [isTelegram, gameState])

  // Update Telegram back button visibility
  useEffect(() => {
    if (isTelegram) {
      const tg = (window as any).Telegram.WebApp
      if (gameState === "playing") {
        tg.BackButton.show()
      } else {
        tg.BackButton.hide()
      }
    }
  }, [isTelegram, gameState])

  // Check for daily challenges on mount
  useEffect(() => {
    // Check if there are unclaimed daily challenges
    if (typeof window !== "undefined") {
      const today = new Date().toISOString().split("T")[0]
      const lastChecked = localStorage.getItem("mwor-last-challenge-check")

      if (lastChecked !== today) {
        localStorage.setItem("mwor-last-challenge-check", today)
        setHasDailyChallenge(true)
      }
    }
  }, [])

  // Listen for wallet changes
  useEffect(() => {
    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected wallet
        setWalletInfo(null)
      } else {
        // Account changed, update wallet info
        const info = await walletConnector.getWalletInfo()
        setWalletInfo(info)
      }
    }

    const handleDisconnect = () => {
      setWalletInfo(null)
    }

    walletConnector.onAccountsChanged(handleAccountsChanged)
    walletConnector.onDisconnect(handleDisconnect)

    return () => {
      walletConnector.removeListeners()
    }
  }, [])

  // Connect wallet function
  const connectWallet = async () => {
    try {
      setIsWalletConnecting(true)
      const info = await walletConnector.connect()
      if (info) {
        setWalletInfo(info)
        setShowWalletModal(false)
      }
    } catch (error) {
      console.error("Wallet connection failed:", error)
      // Error will be handled by the WalletModal component
      // Don't close the modal so user can see the error and try again
    } finally {
      setIsWalletConnecting(false)
    }
  }

  // Disconnect wallet function
  const disconnectWallet = () => {
    walletConnector.disconnect()
    setWalletInfo(null)
  }

  // Purchase extra lives
  const purchaseExtraLives = async (amount: number) => {
    if (!walletInfo) {
      setShowWalletModal(true)
      return false
    }

    const result = await walletConnector.purchaseLives(amount)
    if (result.success) {
      // Update lives
      setLives((prev) => prev + amount)
      // Update wallet info
      const updatedInfo = await walletConnector.getWalletInfo()
      setWalletInfo(updatedInfo)
      return true
    }
    return false
  }

  // Purchase retry
  const purchaseRetry = async () => {
    if (!walletInfo) {
      setShowWalletModal(true)
      return false
    }

    const result = await walletConnector.purchaseRetry()
    if (result.success) {
      // Reset the current level
      initializeLevel(level)
      // Update wallet info
      const updatedInfo = await walletConnector.getWalletInfo()
      setWalletInfo(updatedInfo)
      return true
    }
    return false
  }

  // Initialize or reset the game for a specific level
  const initializeLevel = (newLevel: number) => {
    // Clear any existing timer first
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    const levelCards = createCards(newLevel)
    setCards(levelCards)
    setFlippedIndexes([])
    setMatches(0)
    setIsChecking(false)
    setTimeRemaining(LEVEL_CONFIGS[newLevel].timeLimit)
    setLives(LEVEL_CONFIGS[newLevel].lives) // Set lives based on level config
    setGameState("playing")
    setComboMultiplier(1)
    setMatchAnimation(null)

    // Start tracking game time if this is the first level
    if (newLevel === 0) {
      setGameStartTime(Date.now())
      setScore(0)
      setMaxComboMultiplier(1)
    }

    // Play sound
    soundManager.play("click")
  }

  // Calculate score for a match
  const calculateMatchScore = (levelIndex: number, timeRemaining: number) => {
    const config = LEVEL_CONFIGS[levelIndex]
    const basePoints = config.basePoints
    const timeBonus = Math.floor((timeRemaining * config.timeBonus) / config.timeLimit)
    const comboBonus = Math.floor(basePoints * (comboMultiplier - 1) * 0.5)

    return basePoints + timeBonus + comboBonus
  }

  // Show time bonus indicator
  const showTimeBonusIndicator = () => {
    const indicator = document.getElementById("time-bonus-indicator")
    if (indicator) {
      indicator.classList.remove("hidden")
      indicator.classList.add("block")

      setTimeout(() => {
        indicator.classList.remove("block")
        indicator.classList.add("hidden")
      }, 1000)
    }
  }

  // Show score indicator
  const showScoreIndicator = (points: number) => {
    const indicator = document.getElementById("score-indicator")
    if (indicator) {
      // Update the text content
      indicator.textContent = `+${points}`

      // Show the indicator
      indicator.classList.remove("hidden")
      indicator.classList.add("block")

      // Hide after animation
      setTimeout(() => {
        indicator.classList.remove("block")
        indicator.classList.add("hidden")
      }, 1000)
    }
  }

  // Start a new game from level 0
  const startNewGame = () => {
    setLevel(0)
    setScore(0)
    setTotalTimePlayed(null)
    setMaxComboMultiplier(1)
    initializeLevel(0)
  }

  // Handle advancing to the next level
  const advanceToNextLevel = () => {
    // Play sound
    soundManager.play("level-complete")

    const nextLevel = level + 1
    if (nextLevel < LEVEL_CONFIGS.length) {
      setLevel(nextLevel)
      initializeLevel(nextLevel)
    } else {
      // Game completed - all levels finished
      if (gameStartTime) {
        setTotalTimePlayed((Date.now() - gameStartTime) / 1000)
      }
      setGameState("menu")
      setShowLeaderboard(true)
    }
  }

  // Handle submitting score to leaderboard
  const handleSubmitScore = async (playerName: string) => {
    try {
      setIsSubmittingScore(true)

      // If wallet is connected, use wallet address
      const walletAddress = walletInfo?.address || null

      const response = await fetch("/api/leaderboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerName,
          score,
          levelReached: level + 1,
          timeTaken: totalTimePlayed,
          walletAddress,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit score")
      }

      // Score submitted successfully
      return await response.json()
    } catch (error) {
      console.error("Error submitting score:", error)
      throw error
    } finally {
      setIsSubmittingScore(false)
    }
  }

  // Handle claiming challenge rewards
  const handleClaimReward = (points: number, timeBonus?: number) => {
    // Add points to score
    setScore((prevScore) => prevScore + points)

    // Add time bonus if provided and game is in playing state
    if (timeBonus && gameState === "playing") {
      setTimeRemaining((time) => Math.min(time + timeBonus, LEVEL_CONFIGS[level].timeLimit))
      showTimeBonusIndicator()
    }

    // Show score indicator
    showScoreIndicator(points)
  }

  // Toggle sound mute
  const toggleMute = () => {
    const newMuted = soundManager.toggleMute()
    setIsMuted(newMuted)

    // Play click sound if unmuting
    if (!newMuted) {
      soundManager.play("click")
    }
  }

  // Share to Telegram
  const shareToTelegram = () => {
    if (isTelegram) {
      const tg = (window as any).Telegram.WebApp
      tg.switchInlineQuery(`I scored ${score} points in MWOR Match2Earn! Can you beat my score?`, [
        "users",
        "groups",
        "channels",
      ])
    }
  }

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Timer effect - now accurately reflects real seconds with proper cleanup
  useEffect(() => {
    if (gameState === "playing" && timeRemaining > 0) {
      const startTime = Date.now()
      const expectedTime = timeRemaining * 1000 // Convert to milliseconds

      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime
        const newTimeRemaining = Math.max(0, Math.ceil((expectedTime - elapsed) / 1000))

        setTimeRemaining((prevTime) => {
          // Only update if the calculated time is different from current
          if (newTimeRemaining !== prevTime) {
            if (newTimeRemaining <= 0) {
              // Clear the timer when time runs out
              if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
              }

              // Lose a life when time runs out
              setLives((prevLives) => {
                const newLives = prevLives - 1

                // Calculate total time played
                if (gameStartTime) {
                  setTotalTimePlayed((Date.now() - gameStartTime) / 1000)
                }

                if (newLives <= 0) {
                  // Game over if no lives left
                  soundManager.play("game-over")
                  setGameState("gameOver")
                } else {
                  // Restart level with remaining lives
                  soundManager.play("game-over")
                  initializeLevel(level)
                }

                return Math.max(0, newLives)
              })

              return 0
            }
            return newTimeRemaining
          }
          return prevTime
        })
      }, 100) // Check every 100ms for smooth updates, but only update when seconds change
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [gameState, timeRemaining, level, gameStartTime]) // Added timeRemaining to dependencies

  // Separate effect to handle timer cleanup when game state changes
  useEffect(() => {
    if (gameState !== "playing" && timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [gameState])

  // Combo timer effect
  useEffect(() => {
    if (comboMultiplier > 1) {
      // Reset combo after 3 seconds of no matches
      if (comboTimerRef.current) {
        clearTimeout(comboTimerRef.current)
      }

      comboTimerRef.current = setTimeout(() => {
        setComboMultiplier(1)
      }, 3000)
    }

    return () => {
      if (comboTimerRef.current) {
        clearTimeout(comboTimerRef.current)
      }
    }
  }, [comboMultiplier, lastMatchTime])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (comboTimerRef.current) {
        clearTimeout(comboTimerRef.current)
      }
    }
  }, [])

  const handleCardClick = (clickedIndex: number) => {
    // Prevent clicking if not in playing state
    if (gameState !== "playing") return

    // Prevent clicking if already checking or card is already matched
    if (isChecking || cards[clickedIndex].isMatched) return

    // Prevent clicking if card is already flipped
    if (flippedIndexes.includes(clickedIndex)) return

    // Prevent clicking if two cards are already flipped
    if (flippedIndexes.length === 2) return

    // Play card flip sound
    soundManager.play("flip")

    // Add clicked card to flipped cards
    const newFlipped = [...flippedIndexes, clickedIndex]
    setFlippedIndexes(newFlipped)

    // If we now have two cards flipped, check for a match
    if (newFlipped.length === 2) {
      setIsChecking(true)
      const [firstIndex, secondIndex] = newFlipped
      const firstCard = cards[firstIndex]
      const secondCard = cards[secondIndex]

      // Check if cards match - either both have the same image or both have the same icon
      const isMatch =
        (firstCard.imageSrc && secondCard.imageSrc && firstCard.imageSrc === secondCard.imageSrc) ||
        (firstCard.icon && secondCard.icon && firstCard.icon === secondCard.icon)

      if (isMatch) {
        // Match found - play match sound
        setTimeout(() => {
          soundManager.play("match")

          setCards(
            cards.map((card, index) =>
              index === firstIndex || index === secondIndex ? { ...card, isMatched: true } : card,
            ),
          )
          setFlippedIndexes([])

          // Set match animation
          setMatchAnimation(firstIndex)
          setTimeout(() => setMatchAnimation(null), 1000)

          // Increment matches counter
          const newMatches = matches + 1
          setMatches(newMatches)
          setIsChecking(false)

          // Update combo multiplier
          const now = Date.now()
          if (now - lastMatchTime < 3000) {
            const newCombo = Math.min(comboMultiplier + 0.5, 3)
            setComboMultiplier(newCombo)

            // Update max combo
            if (newCombo > maxComboMultiplier) {
              setMaxComboMultiplier(newCombo)

              // Play combo sound if combo is at least 2x
              if (newCombo >= 2) {
                soundManager.play("combo")
              }
            }
          } else {
            setComboMultiplier(1)
          }
          setLastMatchTime(now)

          // Calculate and add points for the match
          const matchPoints = calculateMatchScore(level, timeRemaining)
          setScore((prevScore) => prevScore + matchPoints)

          // Show score indicator
          showScoreIndicator(matchPoints)

          // Add time bonus for correct match
          setTimeRemaining((time) => Math.min(time + LEVEL_CONFIGS[level].timeBonus, LEVEL_CONFIGS[level].timeLimit))
          showTimeBonusIndicator()
          soundManager.play("time-bonus", 0.7)

          // Check for level completion
          if (newMatches === LEVEL_CONFIGS[level].pairsCount) {
            if (timerRef.current) {
              clearInterval(timerRef.current)
              timerRef.current = null
            }

            // Add level completion bonus
            const levelBonus = LEVEL_CONFIGS[level].basePoints * 2
            setScore((prevScore) => prevScore + levelBonus)

            setGameState("levelComplete")
          }
        }, 500)
      } else {
        // No match - reset after delay and play no-match sound
        setTimeout(() => {
          soundManager.play("no-match")
          setFlippedIndexes([])
          setIsChecking(false)
          setComboMultiplier(1) // Reset combo on failed match
        }, 1000)
      }
    }
  }

  // Get current level configuration
  const currentConfig = LEVEL_CONFIGS[level]

  // Calculate grid template based on current level
  const gridTemplateColumns = `repeat(${currentConfig?.cols || 3}, minmax(0, 1fr))`

  // Game stats for challenges
  const gameStats = {
    score,
    level: level + 1,
    matches,
    maxCombo: maxComboMultiplier,
    timeTaken: totalTimePlayed,
  }

  // Mobile menu toggle
  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu)
    soundManager.play("click")
  }

  // Render hearts for lives
  const renderLives = () => {
    return Array(lives)
      .fill(0)
      .map((_, i) => <Heart key={i} className="h-4 w-4 text-red-500 fill-red-500" />)
  }

  // Get level name based on level index
  const getLevelName = (levelIndex: number): string => {
    const levelNames = [
      "Beginner",
      "Easy",
      "Medium",
      "Challenging",
      "Hard",
      "Expert",
      "Master",
      "Champion",
      "Legend",
      "MWOR God",
    ]
    return levelNames[levelIndex] || `Level ${levelIndex + 1}`
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-black via-purple-950 to-black overflow-hidden">
      {/* Fixed Header */}
      <div
        className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-sm border-b border-purple-800/30"
        style={{ height: `${sizes.headerHeight}px` }}
      >
        <div className="flex items-center justify-between h-full px-4">
          <h1 className="font-bold" style={{ fontSize: `${sizes.titleSize}px` }}>
            <span className="text-amber-400 font-extrabold">MWOR</span> <span className="text-white">Match2Earn</span>
          </h1>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWalletModal(true)}
            className="bg-transparent border-amber-700 text-amber-300 hover:bg-amber-900/30 hover:text-amber-200"
            style={{
              height: `${sizes.smallButtonHeight}px`,
              fontSize: `${sizes.smallTextSize}px`,
              padding: `0 ${Math.max(8, sizes.smallButtonHeight * 0.2)}px`,
            }}
          >
            <Wallet
              className="mr-1"
              style={{ width: `${sizes.smallTextSize}px`, height: `${sizes.smallTextSize}px` }}
            />
            {walletInfo ? walletInfo.shortAddress : "Connect"}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col justify-center items-center px-4"
        style={{
          marginTop: `${sizes.headerHeight}px`,
          marginBottom: `${sizes.bottomNavHeight}px`,
          minHeight: `${sizes.availableHeight}px`,
        }}
      >
        {/* Game Stats Bar - Only show during gameplay */}
        {gameState === "playing" && (
          <div className="w-full max-w-lg mb-4">
            <div
              className="flex items-center justify-between bg-black/50 rounded-lg border border-purple-800/30 mb-2"
              style={{
                padding: `${Math.max(4, sizes.gap)}px ${Math.max(8, sizes.gap * 2)}px`,
                fontSize: `${sizes.smallTextSize}px`,
              }}
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <Trophy
                    className="text-amber-400 mr-1"
                    style={{ width: `${sizes.textSize}px`, height: `${sizes.textSize}px` }}
                  />
                  <span className="text-amber-400 font-bold">{score}</span>
                </div>
                <div className="flex items-center">
                  <Star
                    className="text-purple-400 mr-1"
                    style={{ width: `${sizes.textSize}px`, height: `${sizes.textSize}px` }}
                  />
                  <span className="text-purple-300">
                    Level {level + 1} - {getLevelName(level)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <Clock
                    className="text-green-400 mr-1"
                    style={{ width: `${sizes.textSize}px`, height: `${sizes.textSize}px` }}
                  />
                  <span className={`font-mono ${timeRemaining < 10 ? "text-red-400 animate-pulse" : "text-green-400"}`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
                {comboMultiplier > 1 && (
                  <div className="flex items-center">
                    <Zap
                      className="text-yellow-400 mr-1"
                      style={{ width: `${sizes.textSize}px`, height: `${sizes.textSize}px` }}
                    />
                    <span className="text-yellow-400 font-bold">{comboMultiplier.toFixed(1)}x</span>
                  </div>
                )}
              </div>
            </div>

            {/* Lives display with buy more button */}
            <div
              className="flex items-center justify-between"
              style={{
                padding: `0 ${Math.max(8, sizes.gap * 2)}px`,
                fontSize: `${sizes.smallTextSize}px`,
              }}
            >
              <div className="flex items-center">
                <span className="text-red-400 mr-1">Lives:</span>
                <div className="flex items-center gap-1">{renderLives()}</div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStoreModal(true)}
                className="bg-transparent border-amber-700 text-amber-300 hover:bg-amber-900/30"
                style={{
                  height: `${sizes.smallButtonHeight * 0.8}px`,
                  fontSize: `${sizes.smallTextSize * 0.9}px`,
                  padding: `0 ${Math.max(6, sizes.smallButtonHeight * 0.15)}px`,
                }}
              >
                <Plus
                  className="mr-1"
                  style={{ width: `${sizes.smallTextSize}px`, height: `${sizes.smallTextSize}px` }}
                />
                Buy More
              </Button>
            </div>
          </div>
        )}

        {/* Game Content */}
        {gameState === "menu" && !showMobileMenu && (
          <div className="text-center w-full max-w-lg">
            <p className="text-purple-300 text-center mb-6" style={{ fontSize: `${sizes.textSize}px` }}>
              Match crypto pairs. Earn points.
              <br />
              Beat the clock!
            </p>

            <div
              className="rounded-xl bg-black/70 backdrop-blur-sm border border-purple-800/50 mb-6"
              style={{
                padding: `${Math.max(16, viewport.height * 0.025)}px`,
              }}
            >
              <h2 className="font-bold text-amber-400 mb-3" style={{ fontSize: `${sizes.textSize * 1.2}px` }}>
                How to Play
              </h2>
              <ul className="text-purple-300 text-left space-y-1" style={{ fontSize: `${sizes.smallTextSize}px` }}>
                <li>• Match pairs of crypto assets with the same symbol</li>
                <li>• Complete each level before time runs out</li>
                <li>• Each match gives you bonus time and points</li>
                <li>• Quick matches build a combo multiplier for more points</li>
                <li>• You lose a life only when failing to complete a level</li>
                <li>• Buy extra lives (0.001 SOL) or retries (0.002 SOL)</li>
                <li>• Complete daily challenges for bonus rewards</li>
                <li>• Master all 10 levels to become a MWOR God!</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <Button
                onClick={startNewGame}
                className="bg-gradient-to-r from-purple-700 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-500 text-white border-none"
                style={{
                  height: `${sizes.buttonHeight}px`,
                  fontSize: `${sizes.textSize}px`,
                }}
              >
                Start Game
              </Button>
              <Button
                onClick={() => setShowLeaderboard(true)}
                variant="outline"
                className="bg-transparent border-purple-700 text-purple-300 hover:bg-purple-900/30 hover:text-purple-200"
                style={{
                  height: `${sizes.buttonHeight}px`,
                  fontSize: `${sizes.textSize}px`,
                }}
              >
                <Trophy className="mr-2" style={{ width: `${sizes.textSize}px`, height: `${sizes.textSize}px` }} />
                Leaderboard
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setShowChallenges(true)}
                variant="outline"
                className={`bg-transparent border-amber-700 text-amber-300 hover:bg-amber-900/30 hover:text-amber-200 ${
                  hasDailyChallenge ? "animate-pulse-slow" : ""
                }`}
                style={{
                  height: `${sizes.buttonHeight}px`,
                  fontSize: `${sizes.textSize}px`,
                }}
              >
                <Gift className="mr-2" style={{ width: `${sizes.textSize}px`, height: `${sizes.textSize}px` }} />
                Daily Challenges
                {hasDailyChallenge && (
                  <span
                    className="ml-1 bg-amber-500/30 rounded-full"
                    style={{
                      padding: `${Math.max(2, sizes.smallTextSize * 0.1)}px ${Math.max(4, sizes.smallTextSize * 0.2)}px`,
                      fontSize: `${sizes.smallTextSize * 0.8}px`,
                    }}
                  >
                    New
                  </span>
                )}
              </Button>
              <Button
                onClick={() => setShowStoreModal(true)}
                variant="outline"
                className="bg-transparent border-green-700 text-green-300 hover:bg-green-900/30 hover:text-green-200"
                style={{
                  height: `${sizes.buttonHeight}px`,
                  fontSize: `${sizes.textSize}px`,
                }}
              >
                <Plus className="mr-2" style={{ width: `${sizes.textSize}px`, height: `${sizes.textSize}px` }} />
                Buy Lives & Retries
              </Button>
            </div>
          </div>
        )}

        {gameState === "playing" && (
          <div
            className="grid rounded-xl bg-black/70 backdrop-blur-sm border border-purple-800/50"
            style={{
              gridTemplateColumns,
              gap: `${sizes.gap}px`,
              padding: `${Math.max(8, sizes.gap * 2)}px`,
              maxWidth: `${sizes.availableWidth}px`,
            }}
          >
            {cards.map((card, index) => (
              <motion.div
                key={card.id}
                className="relative"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                animate={
                  matchAnimation === index
                    ? {
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0],
                        transition: { duration: 0.5 },
                      }
                    : {}
                }
              >
                <div
                  className="relative perspective-500"
                  style={{
                    width: `${sizes.cardSize}px`,
                    height: `${sizes.cardSize}px`,
                  }}
                >
                  {/* Card back (shown when not flipped) */}
                  <motion.div
                    className="absolute inset-0 w-full h-full backface-hidden"
                    initial={{ rotateY: 0 }}
                    animate={{ rotateY: card.isMatched || flippedIndexes.includes(index) ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card
                      className="absolute inset-0 w-full h-full cursor-pointer transition-all duration-300 bg-purple-950 border-purple-800 hover:border-purple-600 hover:bg-purple-900/80"
                      onClick={() => handleCardClick(index)}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-500/5 to-white/5" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className="rounded-full bg-purple-800/50 flex items-center justify-center"
                          style={{
                            width: `${sizes.cardSize * 0.4}px`,
                            height: `${sizes.cardSize * 0.4}px`,
                          }}
                        >
                          <div
                            className="rounded-full bg-gradient-to-br from-purple-700/70 to-fuchsia-700/70 border border-purple-500/30"
                            style={{
                              width: `${sizes.cardSize * 0.3}px`,
                              height: `${sizes.cardSize * 0.3}px`,
                            }}
                          />
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                  {/* Card front (flipped side) */}
                  <motion.div
                    className="absolute inset-0 w-full h-full backface-hidden"
                    initial={{ rotateY: 180 }}
                    animate={{ rotateY: card.isMatched || flippedIndexes.includes(index) ? 0 : 180 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card
                      className={`absolute inset-0 w-full h-full cursor-pointer transition-all duration-300 ${
                        card.isMatched
                          ? "bg-purple-900/50 border-purple-400/50"
                          : "bg-purple-800/50 border-purple-500/50"
                      }`}
                      onClick={() => handleCardClick(index)}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-500/5 to-white/5" />

                      <div className="absolute inset-0 flex items-center justify-center">
                        <CardIcon
                          icon={card.icon}
                          imageSrc={card.imageSrc}
                          color={card.color}
                          size="md"
                          isMatched={card.isMatched}
                        />
                      </div>

                      {/* Sparkle effect for matched cards */}
                      {card.isMatched && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 pointer-events-none"
                        >
                          <Sparkles
                            className="absolute top-1 right-1 text-amber-400 opacity-70 animate-pulse-slow"
                            style={{
                              width: `${sizes.cardSize * 0.15}px`,
                              height: `${sizes.cardSize * 0.15}px`,
                            }}
                          />
                          <Sparkles
                            className="absolute bottom-1 left-1 text-amber-400 opacity-70 animate-pulse-slow"
                            style={{
                              width: `${sizes.cardSize * 0.1}px`,
                              height: `${sizes.cardSize * 0.1}px`,
                            }}
                          />
                        </motion.div>
                      )}
                    </Card>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {gameState === "levelComplete" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center rounded-xl bg-black/70 backdrop-blur-sm border border-purple-800/50 w-full max-w-lg"
            style={{
              padding: `${Math.max(16, viewport.height * 0.025)}px`,
            }}
          >
            <motion.h2
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="font-bold text-green-300"
              style={{ fontSize: `${sizes.textSize * 1.3}px` }}
            >
              {getLevelName(level)} Level Complete!
            </motion.h2>
            <div style={{ marginBottom: `${Math.max(12, viewport.height * 0.015)}px` }}>
              <p
                className="text-purple-300"
                style={{
                  fontSize: `${sizes.textSize}px`,
                  marginBottom: `${Math.max(8, viewport.height * 0.01)}px`,
                }}
              >
                Great job! You matched all {currentConfig.pairsCount} pairs.
              </p>
              <motion.p
                initial={{ scale: 0.8 }}
                animate={{ scale: [0.8, 1.2, 1] }}
                transition={{ duration: 0.5 }}
                className="font-bold text-amber-400"
                style={{
                  fontSize: `${sizes.textSize * 1.2}px`,
                  marginBottom: `${Math.max(8, viewport.height * 0.01)}px`,
                }}
              >
                Score: {score}
              </motion.p>
              <p className="text-purple-300" style={{ fontSize: `${sizes.textSize}px` }}>
                Lives remaining: {lives}
              </p>
            </div>
            <div className="flex justify-center">
              <Button
                onClick={advanceToNextLevel}
                className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white border-none"
                style={{
                  height: `${sizes.buttonHeight}px`,
                  fontSize: `${sizes.textSize}px`,
                  padding: `0 ${Math.max(16, sizes.buttonHeight * 0.3)}px`,
                }}
              >
                {level + 1 < LEVEL_CONFIGS.length ? (
                  <>
                    Start {getLevelName(level + 1)} Level{" "}
                    <Zap className="ml-1" style={{ width: `${sizes.textSize}px`, height: `${sizes.textSize}px` }} />
                  </>
                ) : (
                  "Complete Game"
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {gameState === "gameOver" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center rounded-xl bg-black/70 backdrop-blur-sm border border-purple-800/50 w-full max-w-lg"
            style={{
              padding: `${Math.max(16, viewport.height * 0.025)}px`,
            }}
          >
            <motion.h2
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="font-bold text-red-300"
              style={{ fontSize: `${sizes.textSize * 1.3}px` }}
            >
              {lives <= 0 ? "Out of Lives!" : "Time's Up!"}
            </motion.h2>
            <div style={{ marginBottom: `${Math.max(12, viewport.height * 0.015)}px` }}>
              <p
                className="text-purple-300"
                style={{
                  fontSize: `${sizes.textSize}px`,
                  marginBottom: `${Math.max(8, viewport.height * 0.01)}px`,
                }}
              >
                You matched {matches} out of {currentConfig.pairsCount} pairs on {getLevelName(level)} level.
              </p>
              <motion.p
                initial={{ scale: 0.8 }}
                animate={{ scale: [0.8, 1.2, 1] }}
                transition={{ duration: 0.5 }}
                className="font-bold text-amber-400"
                style={{ fontSize: `${sizes.textSize * 1.2}px` }}
              >
                Final Score: {score}
              </motion.p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Button
                onClick={() => setShowStoreModal(true)}
                className="bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 text-white border-none"
                style={{
                  height: `${sizes.buttonHeight}px`,
                  fontSize: `${sizes.textSize}px`,
                }}
              >
                <Plus className="mr-2" style={{ width: `${sizes.textSize}px`, height: `${sizes.textSize}px` }} />
                Buy Lives
              </Button>
              <Button
                onClick={() => setShowLeaderboard(true)}
                className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white border-none"
                style={{
                  height: `${sizes.buttonHeight}px`,
                  fontSize: `${sizes.textSize}px`,
                }}
              >
                <Trophy className="mr-2" style={{ width: `${sizes.textSize}px`, height: `${sizes.textSize}px` }} />
                Submit Score
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <Button
                onClick={() => setShowStoreModal(true)}
                className="bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white border-none"
                style={{
                  height: `${sizes.buttonHeight}px`,
                  fontSize: `${sizes.textSize}px`,
                }}
              >
                <RefreshCw className="mr-2" style={{ width: `${sizes.textSize}px`, height: `${sizes.textSize}px` }} />
                Buy Retry
              </Button>

              <Button
                onClick={() => setGameState("menu")}
                variant="outline"
                className="bg-transparent border-purple-700 text-purple-300 hover:bg-purple-900/30 hover:text-purple-200"
                style={{
                  height: `${sizes.buttonHeight}px`,
                  fontSize: `${sizes.textSize}px`,
                }}
              >
                Main Menu
              </Button>
            </div>

            {isTelegram && (
              <Button
                onClick={shareToTelegram}
                className="w-full bg-[#0088cc] hover:bg-[#0099dd] text-white"
                style={{
                  height: `${sizes.buttonHeight}px`,
                  fontSize: `${sizes.textSize}px`,
                }}
              >
                <Share2 className="mr-2" style={{ width: `${sizes.textSize}px`, height: `${sizes.textSize}px` }} />
                Share to Telegram
              </Button>
            )}
          </motion.div>
        )}
      </div>

      {/* Fixed Bottom Navigation */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-sm border-t border-purple-800/30"
        style={{ height: `${sizes.bottomNavHeight}px` }}
      >
        <div className="flex items-center justify-center h-full px-4">
          {gameState === "menu" ? (
            <div className="flex items-center gap-4">
              <Button
                onClick={toggleMute}
                variant="outline"
                className="bg-transparent border-purple-700 text-purple-300 hover:bg-purple-900/30 hover:text-purple-200"
                style={{
                  height: `${sizes.buttonHeight}px`,
                  width: `${sizes.buttonHeight}px`,
                  padding: 0,
                }}
              >
                {isMuted ? (
                  <VolumeX style={{ width: `${sizes.textSize}px`, height: `${sizes.textSize}px` }} />
                ) : (
                  <Volume2 style={{ width: `${sizes.textSize}px`, height: `${sizes.textSize}px` }} />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMobileMenu}
                className="text-white"
                style={{
                  width: `${sizes.buttonHeight}px`,
                  height: `${sizes.buttonHeight}px`,
                }}
              >
                {showMobileMenu ? (
                  <X style={{ width: `${sizes.textSize}px`, height: `${sizes.textSize}px` }} />
                ) : (
                  <Menu style={{ width: `${sizes.textSize}px`, height: `${sizes.textSize}px` }} />
                )}
              </Button>

              {isTelegram ? (
                <Button
                  onClick={shareToTelegram}
                  className="bg-[#0088cc] hover:bg-[#0099dd] text-white"
                  style={{
                    height: `${sizes.buttonHeight}px`,
                    fontSize: `${sizes.textSize}px`,
                    padding: `0 ${Math.max(16, sizes.buttonHeight * 0.3)}px`,
                  }}
                >
                  <Share2 className="mr-2" style={{ width: `${sizes.textSize}px`, height: `${sizes.textSize}px` }} />
                  Share to Telegram
                </Button>
              ) : (
                <Button
                  onClick={() => setShowShareModal(true)}
                  variant="outline"
                  className="bg-transparent border-blue-700 text-blue-300 hover:bg-blue-900/30 hover:text-blue-200"
                  style={{
                    height: `${sizes.buttonHeight}px`,
                    fontSize: `${sizes.textSize}px`,
                    padding: `0 ${Math.max(16, sizes.buttonHeight * 0.3)}px`,
                  }}
                >
                  <Share2 className="mr-2" style={{ width: `${sizes.textSize}px`, height: `${sizes.textSize}px` }} />
                  Share Game
                </Button>
              )}
            </div>
          ) : gameState === "playing" ? (
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setGameState("menu")}
                variant="outline"
                className="bg-transparent border-purple-700 text-purple-300 hover:bg-purple-900/30 hover:text-purple-200"
                style={{
                  height: `${sizes.buttonHeight}px`,
                  fontSize: `${sizes.textSize}px`,
                  padding: `0 ${Math.max(16, sizes.buttonHeight * 0.3)}px`,
                }}
              >
                <ChevronLeft className="mr-1" style={{ width: `${sizes.textSize}px`, height: `${sizes.textSize}px` }} />
                Menu
              </Button>
              <Button
                onClick={toggleMute}
                variant="outline"
                className="bg-transparent border-purple-700 text-purple-300 hover:bg-purple-900/30 hover:text-purple-200"
                style={{
                  height: `${sizes.buttonHeight}px`,
                  width: `${sizes.buttonHeight}px`,
                  padding: 0,
                }}
              >
                {isMuted ? (
                  <VolumeX style={{ width: `${sizes.textSize}px`, height: `${sizes.textSize}px` }} />
                ) : (
                  <Volume2 style={{ width: `${sizes.textSize}px`, height: `${sizes.textSize}px` }} />
                )}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {gameState === "menu" && showMobileMenu && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4 space-y-4">
          <h2 className="font-bold text-amber-400" style={{ fontSize: `${sizes.titleSize * 0.8}px` }}>
            Menu
          </h2>

          <div className="flex flex-col w-full max-w-xs space-y-3">
            <Button
              onClick={() => {
                startNewGame()
                setShowMobileMenu(false)
              }}
              className="bg-gradient-to-r from-purple-700 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-500 text-white border-none"
              style={{
                height: `${sizes.buttonHeight}px`,
                fontSize: `${sizes.textSize}px`,
              }}
            >
              Start Game
            </Button>

            <Button
              onClick={() => {
                setShowLeaderboard(true)
                setShowMobileMenu(false)
              }}
              variant="outline"
              className="bg-transparent border-purple-700 text-purple-300 hover:bg-purple-900/30 hover:text-purple-200"
              style={{
                height: `${sizes.buttonHeight}px`,
                fontSize: `${sizes.textSize}px`,
              }}
            >
              <Trophy className="mr-2" style={{ width: `${sizes.textSize}px`, height: `${sizes.textSize}px` }} />
              Leaderboard
            </Button>

            <Button
              onClick={() => {
                setShowChallenges(true)
                setShowMobileMenu(false)
              }}
              variant="outline"
              className={`bg-transparent border-amber-700 text-amber-300 hover:bg-amber-900/30 hover:text-amber-200 ${
                hasDailyChallenge ? "animate-pulse-slow" : ""
              }`}
              style={{
                height: `${sizes.buttonHeight}px`,
                fontSize: `${sizes.textSize}px`,
              }}
            >
              <Gift className="mr-2" style={{ width: `${sizes.textSize}px`, height: `${sizes.textSize}px` }} />
              Daily Challenges
              {hasDailyChallenge && (
                <span
                  className="ml-2 bg-amber-500/30 rounded-full"
                  style={{
                    padding: `${Math.max(2, sizes.smallTextSize * 0.1)}px ${Math.max(4, sizes.smallTextSize * 0.2)}px`,
                    fontSize: `${sizes.smallTextSize * 0.8}px`,
                  }}
                >
                  New
                </span>
              )}
            </Button>

            <Button
              onClick={() => {
                setShowStoreModal(true)
                setShowMobileMenu(false)
              }}
              variant="outline"
              className="bg-transparent border-green-700 text-green-300 hover:bg-green-900/30 hover:text-green-200"
              style={{
                height: `${sizes.buttonHeight}px`,
                fontSize: `${sizes.textSize}px`,
              }}
            >
              <Plus className="mr-2" style={{ width: `${sizes.textSize}px`, height: `${sizes.textSize}px` }} />
              Buy Lives & Retries
            </Button>
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        finalScore={score}
        levelReached={level + 1}
        timeTaken={totalTimePlayed}
        onSubmitScore={handleSubmitScore}
        isSubmitting={isSubmittingScore}
      />

      {/* Challenges Modal */}
      <ChallengesModal
        isOpen={showChallenges}
        onClose={() => {
          setShowChallenges(false)
          setHasDailyChallenge(false)
        }}
        onClaimReward={handleClaimReward}
        gameStats={gameStats}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        score={score}
        levelReached={level + 1}
      />

      {/* Wallet Modal */}
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        walletInfo={walletInfo}
        onConnect={connectWallet}
        onDisconnect={disconnectWallet}
        isConnecting={isWalletConnecting}
      />

      {/* Store Modal */}
      <StoreModal
        isOpen={showStoreModal}
        onClose={() => setShowStoreModal(false)}
        walletInfo={walletInfo}
        onConnectWallet={() => setShowWalletModal(true)}
        onPurchaseLives={purchaseExtraLives}
        onPurchaseRetry={purchaseRetry}
      />

      {/* Hidden indicators for animations */}
      <div
        id="time-bonus-indicator"
        className="hidden fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-green-400 font-bold animate-fadeOut z-50"
        style={{ fontSize: `${sizes.textSize * 1.5}px` }}
      >
        +Time
      </div>
      <div
        id="score-indicator"
        className="hidden fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-amber-400 font-bold animate-fadeOut z-50"
        style={{ fontSize: `${sizes.textSize * 1.5}px` }}
      >
        +100
      </div>
    </div>
  )
}
