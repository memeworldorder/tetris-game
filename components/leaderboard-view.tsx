"use client"

import { Trophy, Medal, Award } from "lucide-react"
import { topPlayers } from "@/data/leaderboard"

export default function LeaderboardView() {
  return (
    <div className="min-h-[calc(100vh-80px)] p-4 pb-20">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200 mb-2">
            Leaderboard
          </h1>
          <p className="text-gray-400">Top players this week</p>
        </div>

        <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] overflow-hidden">
          <div className="p-4 border-b border-purple-500/20">
            <h3 className="text-center text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200 font-bold">
              Weekly Champions
            </h3>
          </div>

          <div className="divide-y divide-purple-500/10">
            {topPlayers.map((player, index) => {
              let rankIcon
              let rankColor = "text-gray-300"

              if (player.rank === 1) {
                rankIcon = <Trophy className="h-5 w-5 text-amber-400" />
                rankColor = "text-amber-400"
              } else if (player.rank === 2) {
                rankIcon = <Medal className="h-5 w-5 text-gray-300" />
                rankColor = "text-gray-300"
              } else if (player.rank === 3) {
                rankIcon = <Award className="h-5 w-5 text-amber-600" />
                rankColor = "text-amber-600"
              } else {
                rankIcon = <span className="text-sm font-medium text-gray-400">{player.rank}</span>
              }

              return (
                <div key={player.rank} className="p-4 hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8">{rankIcon}</div>
                      <div>
                        <p className={`font-medium ${rankColor}`}>{player.name}</p>
                        <div className="flex space-x-4 text-xs text-gray-400">
                          <span>Level {player.level}</span>
                          <span>{player.lines} lines</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                        {player.score.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">{player.date}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-6 bg-gray-900/80 backdrop-blur-sm p-4 rounded-xl border border-purple-500/30">
          <h3 className="text-lg font-bold text-amber-400 mb-3">Weekly Rewards</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
              <span className="text-gray-300">🥇 1st Place</span>
              <span className="text-amber-400 font-bold">1,000,000 MWOR</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
              <span className="text-gray-300">🥈 2nd Place</span>
              <span className="text-gray-300 font-bold">500,000 MWOR</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
              <span className="text-gray-300">🥉 3rd Place</span>
              <span className="text-amber-600 font-bold">250,000 MWOR</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
              <span className="text-gray-300">Top 10</span>
              <span className="text-purple-400 font-bold">50,000 MWOR</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
