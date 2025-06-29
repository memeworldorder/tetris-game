"use client"

import { Gamepad2, BarChart3, Trophy, User } from "lucide-react"
import type { NavigationTab } from "@/types/navigation"

interface BottomNavigationProps {
  activeTab: NavigationTab
  onTabChange: (tab: NavigationTab) => void
}

export default function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    { id: "game" as NavigationTab, label: "Game", icon: Gamepad2 },
    { id: "stats" as NavigationTab, label: "Stats", icon: BarChart3 },
    { id: "leaderboard" as NavigationTab, label: "Leaderboard", icon: Trophy },
    { id: "profile" as NavigationTab, label: "Profile", icon: User },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm border-t border-purple-500/30 z-50">
      <div className="flex items-center justify-around py-1 px-2 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all ${
                isActive ? "text-amber-400 bg-purple-500/20" : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-amber-400" : ""}`} />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
