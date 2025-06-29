"use client"
import { X } from "lucide-react"
import Leaderboard from "./leaderboard"

interface LeaderboardModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function LeaderboardModal({ isOpen, onClose }: LeaderboardModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900/95 rounded-xl border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.3)] w-full max-w-md max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-purple-500/20">
          <h3 className="text-xl font-bold text-amber-400">Leaderboard</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-800 transition-colors" aria-label="Close">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-4rem)]">
          <Leaderboard />
        </div>
      </div>
    </div>
  )
}
