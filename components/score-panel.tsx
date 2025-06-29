import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Zap, LayoutGrid } from "lucide-react"

interface ScorePanelProps {
  score: number
  level: number
  lines: number
}

export default function ScorePanel({ score, level, lines }: ScorePanelProps) {
  return (
    <Card className="w-full bg-gray-900/90 backdrop-blur-sm border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] text-white">
      <CardHeader className="pb-2 border-b border-purple-500/20">
        <CardTitle className="text-center text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200">
          Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid gap-4">
          <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-purple-500/20">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center mr-3">
                <Trophy className="h-4 w-4 text-purple-400" />
              </div>
              <span className="text-gray-300">Score</span>
            </div>
            <span className="text-xl font-bold text-white">{score}</span>
          </div>

          <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-purple-500/20">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center mr-3">
                <Zap className="h-4 w-4 text-cyan-400" />
              </div>
              <span className="text-gray-300">Level</span>
            </div>
            <span className="text-xl font-bold text-white">{level}</span>
          </div>

          <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-purple-500/20">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mr-3">
                <LayoutGrid className="h-4 w-4 text-blue-400" />
              </div>
              <span className="text-gray-300">Lines</span>
            </div>
            <span className="text-xl font-bold text-white">{lines}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
