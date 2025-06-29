"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, Settings, Wallet, Gift } from "lucide-react"
import LivesDisplay from "./lives-display"
import { useState, useEffect } from "react"
import { initGameState, getTimeUntilNextLife, updateLivesBasedOnTime } from "@/utils/lives-manager"
import type { GameState } from "@/types/game"

export default function ProfileView() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [timeToNextLife, setTimeToNextLife] = useState<number | null>(null)

  useEffect(() => {
    const initialState = initGameState()
    setGameState(initialState)

    const intervalId = setInterval(() => {
      setGameState((prevState) => {
        if (!prevState) return null
        return updateLivesBasedOnTime(prevState)
      })
    }, 1000)

    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (gameState) {
      setTimeToNextLife(getTimeUntilNextLife(gameState))
    }
  }, [gameState])

  return (
    <div className="min-h-[calc(100vh-80px)] p-4 pb-20">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200 mb-2">
            Profile
          </h1>
          <p className="text-gray-400">Manage your account and settings</p>
        </div>

        {/* User Info Card */}
        <Card className="bg-gray-900/90 backdrop-blur-sm border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] text-white mb-6">
          <CardHeader className="text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 flex items-center justify-center mx-auto mb-4">
              <User className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200">
              Anonymous Player
            </CardTitle>
            <p className="text-gray-400 text-sm">Level 8 • 42 games played</p>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              {gameState && (
                <LivesDisplay
                  currentLives={gameState.lives}
                  maxLives={gameState.maxLives}
                  timeToNextLife={timeToNextLife}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* MWOR Balance */}
        <Card className="bg-gray-900/90 backdrop-blur-sm border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] text-white mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center mr-3">
                  <Wallet className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-gray-300 text-sm">MWOR Balance</p>
                  <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200">
                    12,450
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold"
              >
                Deposit
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 mb-6">
          <Button
            variant="outline"
            className="flex items-center justify-between p-4 h-auto border-purple-500/50 text-purple-300 hover:bg-purple-900/20"
          >
            <div className="flex items-center">
              <Gift className="h-5 w-5 mr-3" />
              <span>Claim Daily Bonus</span>
            </div>
            <span className="text-amber-400 font-bold">+500 MWOR</span>
          </Button>

          <Button
            variant="outline"
            className="flex items-center justify-between p-4 h-auto border-purple-500/50 text-purple-300 hover:bg-purple-900/20"
          >
            <div className="flex items-center">
              <Settings className="h-5 w-5 mr-3" />
              <span>Game Settings</span>
            </div>
          </Button>
        </div>

        {/* Token Info */}
        <div className="bg-gray-900/80 backdrop-blur-sm p-4 rounded-xl border border-purple-500/30">
          <h3 className="text-lg font-bold text-amber-400 mb-3">Token Economics</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">Instant Lives (5000 MWOR)</span>
              <span className="text-white">Refill to 3 lives</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Rewards Distribution</span>
              <span className="text-white">75% rewards / 25% burn</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Weekly Prize Pool</span>
              <span className="text-amber-400 font-bold">1M+ MWOR</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
