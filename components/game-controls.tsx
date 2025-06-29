import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, ArrowRight, ArrowDown, ArrowUp, Square } from "lucide-react"

export default function GameControls() {
  return (
    <Card className="w-full bg-gray-900/90 backdrop-blur-sm border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)] text-white">
      <CardHeader className="pb-2 border-b border-purple-500/20">
        <CardTitle className="text-center text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200">
          Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid gap-3 text-sm">
          <div className="flex items-center justify-between bg-gray-800/50 p-2 rounded-lg border border-purple-500/20">
            <div className="flex items-center">
              <div className="w-7 h-7 rounded bg-gray-700 flex items-center justify-center mr-3">
                <ArrowLeft className="h-4 w-4 text-purple-400" />
              </div>
              <span className="text-gray-300">Move Left</span>
            </div>
            <span className="font-medium text-white">← Left</span>
          </div>

          <div className="flex items-center justify-between bg-gray-800/50 p-2 rounded-lg border border-purple-500/20">
            <div className="flex items-center">
              <div className="w-7 h-7 rounded bg-gray-700 flex items-center justify-center mr-3">
                <ArrowRight className="h-4 w-4 text-purple-400" />
              </div>
              <span className="text-gray-300">Move Right</span>
            </div>
            <span className="font-medium text-white">→ Right</span>
          </div>

          <div className="flex items-center justify-between bg-gray-800/50 p-2 rounded-lg border border-purple-500/20">
            <div className="flex items-center">
              <div className="w-7 h-7 rounded bg-gray-700 flex items-center justify-center mr-3">
                <ArrowDown className="h-4 w-4 text-purple-400" />
              </div>
              <span className="text-gray-300">Move Down</span>
            </div>
            <span className="font-medium text-white">↓ Down</span>
          </div>

          <div className="flex items-center justify-between bg-gray-800/50 p-2 rounded-lg border border-purple-500/20">
            <div className="flex items-center">
              <div className="w-7 h-7 rounded bg-gray-700 flex items-center justify-center mr-3">
                <ArrowUp className="h-4 w-4 text-purple-400" />
              </div>
              <span className="text-gray-300">Rotate</span>
            </div>
            <span className="font-medium text-white">↑ Up</span>
          </div>

          <div className="flex items-center justify-between bg-gray-800/50 p-2 rounded-lg border border-purple-500/20">
            <div className="flex items-center">
              <div className="w-7 h-7 rounded bg-gray-700 flex items-center justify-center mr-3">
                <Square className="h-4 w-4 text-purple-400" />
              </div>
              <span className="text-gray-300">Hard Drop</span>
            </div>
            <span className="font-medium text-white">Space</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
