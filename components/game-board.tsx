"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause } from "lucide-react"
import NextPiecePreview from "./next-piece-preview"
import MobileControls from "./mobile-controls"
import { useIsMobile } from "@/hooks/use-mobile"
import { vibrateForAction } from "@/utils/vibration"
import { vrfTetrisEngine, numberToTetrominoType, type VRFGameSession, type PieceGenerationResult } from "@/lib/vrf-game-engine"

// Tetromino shapes
const TETROMINOES = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "bg-gradient-to-br from-cyan-400 to-cyan-600",
    borderColor: "border-cyan-300",
    shadowColor: "shadow-cyan-500/30",
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "bg-gradient-to-br from-blue-400 to-blue-600",
    borderColor: "border-blue-300",
    shadowColor: "shadow-blue-500/30",
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "bg-gradient-to-br from-orange-400 to-orange-600",
    borderColor: "border-orange-300",
    shadowColor: "shadow-orange-500/30",
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: "bg-gradient-to-br from-yellow-400 to-yellow-600",
    borderColor: "border-yellow-300",
    shadowColor: "shadow-yellow-500/30",
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: "bg-gradient-to-br from-green-400 to-green-600",
    borderColor: "border-green-300",
    shadowColor: "shadow-green-500/30",
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: "bg-gradient-to-br from-purple-400 to-purple-600",
    borderColor: "border-purple-300",
    shadowColor: "shadow-purple-500/30",
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: "bg-gradient-to-br from-red-400 to-red-600",
    borderColor: "border-red-300",
    shadowColor: "shadow-red-500/30",
  },
}

// Board dimensions
const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20

type TetrominoType = keyof typeof TETROMINOES
type Cell = null | {
  color: string
  borderColor: string
  shadowColor: string
}
type Board = Cell[][]

interface GameBoardProps {
  level: number
  onGameOver: () => void
  onLinesCleared: (lines: number) => void
  isFullscreen?: boolean
  walletAddress?: string
}

export default function GameBoard({ level, onGameOver, onLinesCleared, isFullscreen = false, walletAddress }: GameBoardProps) {
  const isMobile = useIsMobile()
  const containerRef = useRef<HTMLDivElement>(null)
  const [cellSize, setCellSize] = useState<number>(0)
  const [boardWidth, setBoardWidth] = useState<number>(0)
  const [boardHeight, setBoardHeight] = useState<number>(0)

  // Initialize the board with empty cells
  const [board, setBoard] = useState<Board>(() =>
    Array(BOARD_HEIGHT)
      .fill(null)
      .map(() => Array(BOARD_WIDTH).fill(null)),
  )

  // Game state
  const [currentPiece, setCurrentPiece] = useState<{
    type: TetrominoType
    position: { x: number; y: number }
    shape: number[][]
    color: string
    borderColor: string
    shadowColor: string
    vrfData?: PieceGenerationResult
  } | null>(null)
  const [nextPiece, setNextPiece] = useState<TetrominoType | null>(null)
  const [nextPieceVrfData, setNextPieceVrfData] = useState<PieceGenerationResult | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [ghostPosition, setGhostPosition] = useState<number | null>(null)
  const [vrfSession, setVrfSession] = useState<VRFGameSession | null>(null)

  // Animation state for line clearing
  const [clearingLines, setClearingLines] = useState<number[]>([])
  const [isClearing, setIsClearing] = useState(false)

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null)
  const gameSpeedRef = useRef(1000 - (level - 1) * 100)

  // Calculate optimal cell size based on viewport dimensions
  useEffect(() => {
    const calculateOptimalSize = () => {
      if (!containerRef.current) return

      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // Calculate available space (accounting for UI elements and padding)
      const headerHeight = isMobile ? 80 : 80 // Estimated height for score display and lives
      const controlsHeight = isMobile ? 150 : 0 // Mobile controls height (reduced)
      const bottomNavHeight = 80 // Bottom navigation bar height
      const horizontalPadding = isMobile ? 8 : 32 // Reduced padding on mobile for more space

      // Available space for the game board
      const availableHeight = viewportHeight - headerHeight - controlsHeight - bottomNavHeight - 20 // Reduced extra margin
      const availableWidth = viewportWidth - horizontalPadding * 2

      // Calculate cell size based on available space and board dimensions
      // We need to fit 10 cells horizontally and 20 cells vertically
      const maxCellWidth = Math.floor(availableWidth / BOARD_WIDTH)
      const maxCellHeight = Math.floor(availableHeight / BOARD_HEIGHT)

      // Use the smaller dimension to ensure the board fits
      const optimalCellSize = Math.min(maxCellWidth, maxCellHeight)

      // Ensure cell size is at least 12px and increase max size for mobile
      const maxCellSize = isMobile ? 40 : 32 // Larger cells on mobile
      const finalCellSize = Math.max(12, Math.min(maxCellSize, optimalCellSize))

      // Calculate actual board dimensions
      const actualBoardWidth = finalCellSize * BOARD_WIDTH
      const actualBoardHeight = finalCellSize * BOARD_HEIGHT

      setCellSize(finalCellSize)
      setBoardWidth(actualBoardWidth)
      setBoardHeight(actualBoardHeight)
    }

    // Calculate on mount and when window resizes
    calculateOptimalSize()
    window.addEventListener("resize", calculateOptimalSize)

    return () => {
      window.removeEventListener("resize", calculateOptimalSize)
    }
  }, [isMobile])

  // Check for completed lines
  const checkCompletedLines = useCallback((board: Board) => {
    return board.reduce<number[]>((completedLines, row, y) => {
      if (row.every((cell) => cell !== null)) {
        completedLines.push(y)
      }
      return completedLines
    }, [])
  }, [])

  // Clear completed lines with animation
  const clearLines = useCallback(
    (board: Board, lines: number[]) => {
      if (lines.length === 0) return board

      // Set the clearing state and lines
      setClearingLines(lines)
      setIsClearing(true)

      // Vibrate for line clear
      if (isMobile) {
        vibrateForAction("lineClear", lines.length)
      }

      // Create a copy of the board for animation
      const newBoard = [...board.map((row) => [...row])]

      // After animation delay, actually clear the lines
      setTimeout(() => {
        // Remove completed lines
        const updatedBoard = [...newBoard]
        lines.forEach((line) => {
          updatedBoard.splice(line, 1)
          // Add a new empty line at the top
          updatedBoard.unshift(Array(BOARD_WIDTH).fill(null))
        })

        setBoard(updatedBoard)
        setClearingLines([])
        setIsClearing(false)
      }, 400) // Animation duration

      return newBoard
    },
    [isMobile],
  )

  // Generate a VRF-based tetromino
  const getVRFTetromino = useCallback((): { type: TetrominoType; vrfData: PieceGenerationResult } | null => {
    if (!vrfSession) {
      console.warn('⚠️ No VRF session available, using fallback random')
      const tetrominoes = Object.keys(TETROMINOES) as TetrominoType[]
      const randomType = tetrominoes[Math.floor(Math.random() * tetrominoes.length)]
      // Create minimal VRF data for fallback
      const fallbackVrfData: PieceGenerationResult = {
        pieceType: tetrominoes.indexOf(randomType),
        sessionId: 'fallback',
        pieceIndex: Date.now(),
        seedUsed: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        proof: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      }
      return { type: randomType, vrfData: fallbackVrfData }
    }

    try {
      const vrfResult = vrfTetrisEngine.generateNextPiece(vrfSession.sessionId)
      const tetrominoType = numberToTetrominoType(vrfResult.pieceType) as TetrominoType
      
      console.log('🎲 VRF piece generated:', {
        type: tetrominoType,
        index: vrfResult.pieceIndex,
        proof: vrfResult.proof.slice(0, 16) + '...'
      })
      
      return { type: tetrominoType, vrfData: vrfResult }
    } catch (error) {
      console.error('❌ VRF piece generation failed:', error)
      // Fallback to random
      const tetrominoes = Object.keys(TETROMINOES) as TetrominoType[]
      const randomType = tetrominoes[Math.floor(Math.random() * tetrominoes.length)]
      const fallbackVrfData: PieceGenerationResult = {
        pieceType: tetrominoes.indexOf(randomType),
        sessionId: vrfSession?.sessionId || 'fallback',
        pieceIndex: Date.now(),
        seedUsed: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        proof: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      }
      return { type: randomType, vrfData: fallbackVrfData }
    }
  }, [vrfSession])

  // Create a new piece
  const createNewPiece = useCallback((type: TetrominoType, vrfData?: PieceGenerationResult) => {
    const tetromino = TETROMINOES[type]
    return {
      type,
      position: {
        x: Math.floor(BOARD_WIDTH / 2) - Math.floor(tetromino.shape[0].length / 2),
        y: -1, // Start slightly above the board to prevent immediate collision
      },
      shape: tetromino.shape,
      color: tetromino.color,
      borderColor: tetromino.borderColor,
      shadowColor: tetromino.shadowColor,
      vrfData,
    }
  }, [])

  // Check if the current position is valid
  const isValidPosition = useCallback((piece: typeof currentPiece, board: Board) => {
    if (!piece) return false

    return piece.shape.every((row, y) =>
      row.every((cell, x) => {
        const boardX = piece.position.x + x
        const boardY = piece.position.y + y

        // If the cell is empty (0), it's always valid
        if (cell === 0) return true

        // Check if the cell is outside the board boundaries
        if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
          return false
        }

        // If the cell is above the board, it's valid
        if (boardY < 0) return true

        // Check if the cell overlaps with an existing piece on the board
        return board[boardY][boardX] === null
      }),
    )
  }, [])

  // Calculate ghost piece position
  const calculateGhostPosition = useCallback(() => {
    if (!currentPiece) return null

    let dropDistance = 0
    const canMove = true

    while (canMove) {
      dropDistance++
      const testPiece = {
        ...currentPiece,
        position: {
          x: currentPiece.position.x,
          y: currentPiece.position.y + dropDistance,
        },
      }

      if (!isValidPosition(testPiece, board)) {
        dropDistance--
        break
      }
    }

    return dropDistance
  }, [currentPiece, board, isValidPosition])

  // Create the next piece after a piece is locked
  const createNextPiece = useCallback(
    (currentBoard: Board) => {
      if (!nextPiece || !nextPieceVrfData) return

      const newPiece = createNewPiece(nextPiece, nextPieceVrfData)
      setCurrentPiece(newPiece)
      
      // Generate the next piece using VRF
      const vrfResult = getVRFTetromino()
      if (vrfResult) {
        setNextPiece(vrfResult.type)
        setNextPieceVrfData(vrfResult.vrfData)
      }

      // Update ghost position for new piece
      setGhostPosition(0) // Will be recalculated in the next render

      // Check for game over - only if the new piece immediately collides
      if (!isValidPosition(newPiece, currentBoard)) {
        // Only trigger game over if the piece is actually on the board
        // and not just starting above it
        let pieceOnBoard = false
        newPiece.shape.forEach((row, y) => {
          row.forEach((cell, x) => {
            if (cell !== 0) {
              const boardY = newPiece.position.y + y
              if (boardY >= 0) {
                pieceOnBoard = true
              }
            }
          })
        })

        if (pieceOnBoard) {
          // Vibrate for game over
          if (isMobile) {
            vibrateForAction("gameOver")
          }
          onGameOver()
        }
      }
    },
    [nextPiece, nextPieceVrfData, createNewPiece, getVRFTetromino, isValidPosition, onGameOver, isMobile],
  )

  // Lock the current piece to the board - MOVED UP before movePiece to fix circular dependency
  const lockPiece = useCallback(
    (pieceToLock = currentPiece) => {
      if (!pieceToLock || isClearing) return

      // Create a new board with the current piece locked in place
      const newBoard = [...board.map((row) => [...row])]

      let pieceLocked = false
      pieceToLock.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell !== 0) {
            const boardY = pieceToLock.position.y + y
            const boardX = pieceToLock.position.x + x

            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              newBoard[boardY][boardX] = {
                color: pieceToLock.color,
                borderColor: pieceToLock.borderColor,
                shadowColor: pieceToLock.shadowColor,
              }
              pieceLocked = true
            }
          }
        })
      })

      // Only proceed if we actually locked a piece on the board
      if (pieceLocked) {
        // Vibrate when piece locks
        if (isMobile) {
          vibrateForAction("pieceLock")
        }

        setBoard(newBoard)

        // Check for completed lines
        const completedLines = checkCompletedLines(newBoard)
        if (completedLines.length > 0) {
          // Clear lines with animation
          clearLines(newBoard, completedLines)
          onLinesCleared(completedLines.length)

          // Don't create a new piece yet, wait for animation to complete
          if (completedLines.length > 0) {
            setTimeout(() => {
              createNextPiece(newBoard)
            }, 450) // Slightly longer than animation duration
            return
          }
        }

        // If no lines were cleared, create the next piece immediately
        createNextPiece(newBoard)
      }
    },
    [currentPiece, board, isClearing, checkCompletedLines, clearLines, onLinesCleared, isMobile, createNextPiece],
  )

  // Move the current piece - MOVED DOWN after lockPiece to fix circular dependency
  const movePiece = useCallback(
    (dx: number, dy: number) => {
      if (!currentPiece || isPaused || isClearing) return false

      const newPiece = {
        ...currentPiece,
        position: {
          x: currentPiece.position.x + dx,
          y: currentPiece.position.y + dy,
        },
      }

      if (isValidPosition(newPiece, board)) {
        setCurrentPiece(newPiece)
        // Update ghost position after movement
        setGhostPosition(calculateGhostPosition())
        return true
      }

      // If moving down and position is invalid, lock the piece
      if (dy > 0) {
        lockPiece()
        return false
      }

      return false
    },
    [currentPiece, board, isPaused, isClearing, isValidPosition, calculateGhostPosition, lockPiece],
  )

  // Rotate the current piece
  const rotatePiece = useCallback(() => {
    if (!currentPiece || isClearing) return

    // Create a new rotated shape
    const rotatedShape = currentPiece.shape[0].map((_, index) => currentPiece.shape.map((row) => row[index]).reverse())

    const newPiece = {
      ...currentPiece,
      shape: rotatedShape,
    }

    // Check if the rotated position is valid
    if (isValidPosition(newPiece, board)) {
      setCurrentPiece(newPiece)
      // Update ghost position after rotation
      setGhostPosition(calculateGhostPosition())
    }
  }, [currentPiece, isClearing, board, isValidPosition, calculateGhostPosition])

  // Drop the piece instantly - completely rewritten to avoid state update issues
  const hardDrop = useCallback(() => {
    if (!currentPiece || isPaused || isClearing) return

    // Calculate the maximum drop distance
    let dropDistance = 0

    // Keep checking positions until we find an invalid one
    while (true) {
      const testY = currentPiece.position.y + dropDistance + 1

      const testPiece = {
        ...currentPiece,
        position: {
          x: currentPiece.position.x,
          y: testY,
        },
      }

      // If the next position down is invalid, we've found our maximum drop distance
      if (!isValidPosition(testPiece, board)) {
        break
      }

      // Otherwise, increase the drop distance and continue
      dropDistance++
    }

    // Create a new piece at the final position
    const droppedPiece = {
      ...currentPiece,
      position: {
        x: currentPiece.position.x,
        y: currentPiece.position.y + dropDistance,
      },
    }

    // Update the current piece position
    setCurrentPiece(droppedPiece)

    // Lock the piece at its new position
    // We pass the dropped piece directly to lockPiece to avoid relying on state updates
    lockPiece(droppedPiece)
  }, [currentPiece, board, isPaused, isClearing, isValidPosition, lockPiece])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentPiece || isClearing) return

      switch (e.key) {
        case "ArrowLeft":
          movePiece(-1, 0)
          break
        case "ArrowRight":
          movePiece(1, 0)
          break
        case "ArrowDown":
          movePiece(0, 1)
          break
        case "ArrowUp":
          rotatePiece()
          break
        case " ":
          hardDrop()
          break
        case "p":
          setIsPaused((prev) => !prev)
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [currentPiece, isClearing, movePiece, rotatePiece, hardDrop])

  // Update ghost position when current piece changes
  useEffect(() => {
    if (currentPiece) {
      setGhostPosition(calculateGhostPosition())
    }
  }, [currentPiece, calculateGhostPosition])

  // Initialize VRF session and game state
  useEffect(() => {
    const initializeVRFSession = async () => {
      if (!vrfSession && walletAddress) {
        try {
          const session = await vrfTetrisEngine.initializeSession(walletAddress)
          setVrfSession(session)
          console.log('🎯 VRF session initialized for game board')
        } catch (error) {
          console.error('❌ Failed to initialize VRF session:', error)
        }
      }
    }

    initializeVRFSession()
  }, [walletAddress, vrfSession])

  // Game initialization with VRF
  useEffect(() => {
    // This is a direct initialization that runs once when the component mounts
    if (!isInitialized && vrfSession) {
      // Clear the board first
      setBoard(
        Array(BOARD_HEIGHT)
          .fill(null)
          .map(() => Array(BOARD_WIDTH).fill(null)),
      )

      // Generate initial pieces using VRF
      const firstPiece = getVRFTetromino()
      const secondPiece = getVRFTetromino()

      if (firstPiece && secondPiece) {
        // Create and set the current piece
        const newPiece = createNewPiece(firstPiece.type, firstPiece.vrfData)

        // Ensure the piece is valid before setting it
        if (isValidPosition(newPiece, board)) {
          setCurrentPiece(newPiece)

          // Set the next piece
          setNextPiece(secondPiece.type)
          setNextPieceVrfData(secondPiece.vrfData)

          // Mark as initialized
          setIsInitialized(true)

          // Start the game loop with a direct interval
          const gameSpeed = Math.max(100, 1000 - (level - 1) * 100)
          const intervalId = setInterval(() => {
            // Move the piece down one step
            movePiece(0, 1)
          }, gameSpeed)

          // Store the interval ID
          gameLoopRef.current = intervalId
        }
      }
    }

    // Cleanup function
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
        gameLoopRef.current = null
      }
    }
  }, [isInitialized, board, level, vrfSession, getVRFTetromino, createNewPiece, isValidPosition, movePiece])

  // Handle pause/resume
  useEffect(() => {
    // Skip if not initialized yet
    if (!isInitialized) return

    if (isPaused) {
      // Pause the game by clearing the interval
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
        gameLoopRef.current = null
      }
    } else {
      // Resume the game by creating a new interval
      if (!gameLoopRef.current) {
        const gameSpeed = Math.max(100, 1000 - (level - 1) * 100)
        gameLoopRef.current = setInterval(() => {
          movePiece(0, 1)
        }, gameSpeed)
      }
    }

    // Cleanup
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
        gameLoopRef.current = null
      }
    }
  }, [isPaused, isInitialized, level, movePiece])

  // Handle level changes
  useEffect(() => {
    // Skip if not initialized or paused
    if (!isInitialized || isPaused) return

    // Update game speed when level changes
    const gameSpeed = Math.max(100, 1000 - (level - 1) * 100)

    // Clear existing interval and create a new one with updated speed
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current)
      gameLoopRef.current = setInterval(() => {
        movePiece(0, 1)
      }, gameSpeed)
    }

    // Cleanup
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
        gameLoopRef.current = null
      }
    }
  }, [level, isInitialized, isPaused, movePiece])

  // Render the game board
  const renderBoard = () => {
    // Create a copy of the board to render the current piece
    const displayBoard = board.map((row) => [...row])

    // Add the ghost piece to the display board
    if (currentPiece && ghostPosition !== null && ghostPosition > 0) {
      currentPiece.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell !== 0) {
            const boardY = currentPiece.position.y + y + ghostPosition
            const boardX = currentPiece.position.x + x

            if (
              boardY >= 0 &&
              boardY < BOARD_HEIGHT &&
              boardX >= 0 &&
              boardX < BOARD_WIDTH &&
              displayBoard[boardY][boardX] === null
            ) {
              displayBoard[boardY][boardX] = {
                color: "bg-gray-500/20",
                borderColor: "border-gray-400/30",
                shadowColor: "shadow-none",
              }
            }
          }
        })
      })
    }

    // Add the current piece to the display board
    if (currentPiece) {
      currentPiece.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell !== 0) {
            const boardY = currentPiece.position.y + y
            const boardX = currentPiece.position.x + x

            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              displayBoard[boardY][boardX] = {
                color: currentPiece.color,
                borderColor: currentPiece.borderColor,
                shadowColor: currentPiece.shadowColor,
              }
            }
          }
        })
      })
    }

    return (
      <div className="relative">
        <div className="absolute inset-0 grid grid-cols-10 grid-rows-20 gap-px pointer-events-none">
          {Array(BOARD_HEIGHT * BOARD_WIDTH)
            .fill(null)
            .map((_, i) => (
              <div key={`grid-${i}`} className="border-t border-l border-gray-800/30"></div>
            ))}
        </div>
        <div
          className="grid grid-cols-10 gap-px bg-gray-800/50 p-px rounded-lg"
          style={{
            width: `${boardWidth}px`,
            height: `${boardHeight}px`,
          }}
        >
          {displayBoard.flat().map((cell, index) => {
            const y = Math.floor(index / BOARD_WIDTH)
            const isClearing = clearingLines.includes(y)

            return (
              <div
                key={index}
                className={`${
                  cell ? `${cell.color} border ${cell.borderColor} ${cell.shadowColor}` : "bg-gray-900/80"
                } rounded-sm transition-colors duration-100 ${isClearing ? "animate-line-clear" : ""}`}
                style={{
                  width: `${cellSize}px`,
                  height: `${cellSize}px`,
                }}
              />
            )
          })}
        </div>
      </div>
    )
  }

  // Mobile control handlers
  const handleMoveLeft = useCallback(() => movePiece(-1, 0), [movePiece])
  const handleMoveRight = useCallback(() => movePiece(1, 0), [movePiece])
  const handleMoveDown = useCallback(() => movePiece(0, 1), [movePiece])

  return (
    <div className="flex flex-col items-center gap-4" ref={containerRef}>
      <div className="flex items-center justify-between w-full mb-2">
        <div className="flex items-center">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsPaused((prev) => !prev)}
            className="h-10 w-10 rounded-full border-purple-500/50 bg-gray-800 hover:bg-gray-700"
          >
            {isPaused ? <Play className="h-5 w-5 text-purple-400" /> : <Pause className="h-5 w-5 text-purple-400" />}
          </Button>
        </div>
        <NextPiecePreview nextPiece={nextPiece ? TETROMINOES[nextPiece] : null} />
      </div>

      <div className="relative">
        {renderBoard()}

        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg z-10">
            <div className="text-center p-6">
              <p className="text-2xl font-bold text-white mb-4">PAUSED</p>
              <Button
                onClick={() => setIsPaused(false)}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white"
              >
                Resume
              </Button>
            </div>
          </div>
        )}
      </div>

      {isMobile && (
        <div className="mt-1 w-full">
          <MobileControls
            onMoveLeft={handleMoveLeft}
            onMoveRight={handleMoveRight}
            onMoveDown={handleMoveDown}
            onRotate={rotatePiece}
            onHardDrop={hardDrop}
          />
        </div>
      )}
    </div>
  )
}
