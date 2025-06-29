"use client"

import { useEffect, useRef } from "react"
import { ArrowLeft, ArrowRight, ArrowDown, RotateCcw, ChevronDown } from "lucide-react"
import { vibrateForAction } from "@/utils/vibration"

interface MobileControlsProps {
  onMoveLeft: () => void
  onMoveRight: () => void
  onMoveDown: () => void
  onRotate: () => void
  onHardDrop: () => void
}

export default function MobileControls({
  onMoveLeft,
  onMoveRight,
  onMoveDown,
  onRotate,
  onHardDrop,
}: MobileControlsProps) {
  const gameAreaRef = useRef<HTMLDivElement>(null)

  // Handle swipe gestures
  useEffect(() => {
    if (!gameAreaRef.current) return

    let touchStartX = 0
    let touchStartY = 0
    let touchEndX = 0
    let touchEndY = 0

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
    }

    const handleTouchMove = (e: TouchEvent) => {
      // Prevent scrolling when swiping inside game area
      e.preventDefault()
    }

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].clientX
      touchEndY = e.changedTouches[0].clientY

      const diffX = touchStartX - touchEndX
      const diffY = touchStartY - touchEndY

      // Detect horizontal swipe
      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 10) {
          // Swipe left
          vibrateForAction("move")
          onMoveLeft()
        } else if (diffX < -10) {
          // Swipe right
          vibrateForAction("move")
          onMoveRight()
        }
      } else {
        // Detect vertical swipe
        if (diffY > 10) {
          // Swipe up - rotate
          vibrateForAction("rotate")
          onRotate()
        } else if (diffY < -10) {
          // Swipe down - soft drop
          vibrateForAction("move")
          onMoveDown()
        }
      }
    }

    const gameArea = gameAreaRef.current

    gameArea.addEventListener("touchstart", handleTouchStart)
    gameArea.addEventListener("touchmove", handleTouchMove, { passive: false })
    gameArea.addEventListener("touchend", handleTouchEnd)

    return () => {
      gameArea.removeEventListener("touchstart", handleTouchStart)
      gameArea.removeEventListener("touchmove", handleTouchMove)
      gameArea.removeEventListener("touchend", handleTouchEnd)
    }
  }, [onMoveLeft, onMoveRight, onMoveDown, onRotate])

  // Handlers with vibration
  const handleMoveLeft = () => {
    vibrateForAction("move")
    onMoveLeft()
  }

  const handleMoveRight = () => {
    vibrateForAction("move")
    onMoveRight()
  }

  const handleMoveDown = () => {
    vibrateForAction("move")
    onMoveDown()
  }

  const handleRotate = () => {
    vibrateForAction("rotate")
    onRotate()
  }

  const handleHardDrop = () => {
    vibrateForAction("hardDrop")
    onHardDrop()
  }

  return (
    <div className="w-full">
      <div
        ref={gameAreaRef}
        className="w-full h-6 mb-1 bg-gray-800/30 rounded-lg border border-purple-500/20 flex items-center justify-center text-gray-400 text-xs"
      >
        Swipe area
      </div>

      <div className="grid grid-cols-3 gap-1">
        <button
          onTouchStart={handleMoveLeft}
          className="flex items-center justify-center p-2 bg-gray-800/50 rounded-lg border border-purple-500/20 active:bg-gray-700/70 touch-manipulation"
        >
          <ArrowLeft className="h-4 w-4 text-purple-400" />
        </button>

        <button
          onTouchStart={handleMoveDown}
          className="flex items-center justify-center p-2 bg-gray-800/50 rounded-lg border border-purple-500/20 active:bg-gray-700/70 touch-manipulation"
        >
          <ArrowDown className="h-4 w-4 text-purple-400" />
        </button>

        <button
          onTouchStart={handleMoveRight}
          className="flex items-center justify-center p-2 bg-gray-800/50 rounded-lg border border-purple-500/20 active:bg-gray-700/70 touch-manipulation"
        >
          <ArrowRight className="h-4 w-4 text-purple-400" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1 mt-1">
        <button
          onTouchStart={handleRotate}
          className="flex items-center justify-center p-2 bg-gray-800/50 rounded-lg border border-purple-500/20 active:bg-gray-700/70 touch-manipulation"
        >
          <RotateCcw className="h-4 w-4 text-cyan-400" />
          <span className="ml-1 text-xs text-gray-300">Rotate</span>
        </button>

        <button
          onTouchStart={handleHardDrop}
          className="flex items-center justify-center p-2 bg-gray-800/50 rounded-lg border border-purple-500/20 active:bg-gray-700/70 touch-manipulation"
        >
          <ChevronDown className="h-4 w-4 text-cyan-400" />
          <span className="ml-1 text-xs text-gray-300">Drop</span>
        </button>
      </div>
    </div>
  )
}
