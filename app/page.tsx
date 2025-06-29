"use client"

import { useState, useEffect } from "react"
import BottomNavigation from "@/components/bottom-navigation"
import GameView from "@/components/game-view"
import StatsView from "@/components/stats-view"
import LeaderboardView from "@/components/leaderboard-view"
import ProfileView from "@/components/profile-view"
import type { NavigationTab } from "@/types/navigation"

export default function TetrisGame() {
  const [activeTab, setActiveTab] = useState<NavigationTab>("game")
  const [viewportHeight, setViewportHeight] = useState(0)

  // Set viewport height on mount and resize
  useEffect(() => {
    const updateViewportHeight = () => {
      // Set CSS variable for viewport height
      document.documentElement.style.setProperty("--vh", `${window.innerHeight * 0.01}px`)
      setViewportHeight(window.innerHeight)
    }

    updateViewportHeight()
    window.addEventListener("resize", updateViewportHeight)

    return () => {
      window.removeEventListener("resize", updateViewportHeight)
    }
  }, [])

  const renderActiveView = () => {
    switch (activeTab) {
      case "game":
        return <GameView />
      case "stats":
        return <StatsView />
      case "leaderboard":
        return <LeaderboardView />
      case "profile":
        return <ProfileView />
      default:
        return <GameView />
    }
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-950 to-gray-900 overflow-hidden relative"
      style={{ height: `${viewportHeight}px` }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 bg-[url('/geometric-abstraction.png')] opacity-10 bg-repeat"></div>
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-purple-500 rounded-full filter blur-[150px] opacity-20 animate-pulse"></div>
        <div
          className="absolute top-1/3 right-1/4 w-1/3 h-1/3 bg-cyan-500 rounded-full filter blur-[150px] opacity-10 animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 overflow-hidden" style={{ height: `${viewportHeight}px` }}>
        {renderActiveView()}
      </div>

      {/* Bottom navigation */}
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
