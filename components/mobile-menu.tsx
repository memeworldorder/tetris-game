"use client"

import { useState } from "react"
import { Trophy, HelpCircle } from "lucide-react"
import LeaderboardModal from "./leaderboard-modal"
import HelpModal from "./help-modal"

export default function MobileMenu() {
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  return (
    <>
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-40">
        <button
          onClick={() => setIsLeaderboardOpen(true)}
          className="w-12 h-12 rounded-full bg-purple-600/90 flex items-center justify-center shadow-lg border border-purple-500/50"
          aria-label="Leaderboard"
        >
          <Trophy className="h-6 w-6 text-white" />
        </button>
        <button
          onClick={() => setIsHelpOpen(true)}
          className="w-12 h-12 rounded-full bg-cyan-600/90 flex items-center justify-center shadow-lg border border-cyan-500/50"
          aria-label="Help"
        >
          <HelpCircle className="h-6 w-6 text-white" />
        </button>
      </div>

      <LeaderboardModal isOpen={isLeaderboardOpen} onClose={() => setIsLeaderboardOpen(false)} />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  )
}
