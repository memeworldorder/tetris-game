"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Zap, LayoutGrid, Target, Clock, Star } from "lucide-react"

export default function StatsView() {
  // Mock stats data - in a real app, this would come from a database or state management
  const stats = {
    totalScore: 156780,
    gamesPlayed: 42,
    totalLines: 234,
    highestLevel: 8,
    averageScore: 3733,
    totalPlayTime: "2h 15m",
    bestStreak: 12,
    tetrisCount: 8,
  }

  return (
    <div className="min-h-[calc(100vh-80px)] p-4 pb-20">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200 mb-2">
            Your Stats
          </h1>
          <p className="text-gray-400">Track your Tetris performance</p>
        </div>

        <div className="grid gap-4">
          <Card className="bg-gray-900/90 backdrop-blur-sm border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-center text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200">
                Game Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-purple-500/20">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center mr-3">
                      <Trophy className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-gray-300 text-xs">Total Score</p>
                      <p className="text-lg font-bold text-white">{stats.totalScore.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-purple-500/20">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center mr-3">
                      <Zap className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-gray-300 text-xs">Games Played</p>
                      <p className="text-lg font-bold text-white">{stats.gamesPlayed}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-purple-500/20">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mr-3">
                      <LayoutGrid className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-gray-300 text-xs">Total Lines</p>
                      <p className="text-lg font-bold text-white">{stats.totalLines}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-purple-500/20">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center mr-3">
                      <Target className="h-4 w-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-gray-300 text-xs">Highest Level</p>
                      <p className="text-lg font-bold text-white">{stats.highestLevel}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/90 backdrop-blur-sm border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-center text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200">
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-purple-500/20">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center mr-3">
                      <Star className="h-4 w-4 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-gray-300 text-xs">Average Score</p>
                      <p className="text-lg font-bold text-white">{stats.averageScore.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-purple-500/20">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center mr-3">
                      <Clock className="h-4 w-4 text-pink-400" />
                    </div>
                    <div>
                      <p className="text-gray-300 text-xs">Play Time</p>
                      <p className="text-lg font-bold text-white">{stats.totalPlayTime}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-purple-500/20">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center mr-3">
                      <Zap className="h-4 w-4 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-gray-300 text-xs">Best Streak</p>
                      <p className="text-lg font-bold text-white">{stats.bestStreak}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-purple-500/20">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center mr-3">
                      <Trophy className="h-4 w-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-gray-300 text-xs">Tetris Count</p>
                      <p className="text-lg font-bold text-white">{stats.tetrisCount}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-gray-900/80 backdrop-blur-sm p-4 rounded-xl border border-purple-500/30 mt-4">
            <h3 className="text-lg font-bold text-amber-400 mb-2">Achievements</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
                <span className="text-gray-300">First Tetris</span>
                <span className="text-green-400">✓</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
                <span className="text-gray-300">Level 5 Reached</span>
                <span className="text-green-400">✓</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
                <span className="text-gray-300">100 Lines Cleared</span>
                <span className="text-green-400">✓</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
                <span className="text-gray-300">Level 10 Master</span>
                <span className="text-gray-500">○</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
