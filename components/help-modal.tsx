"use client"

import { X } from "lucide-react"
import { ArrowLeft, ArrowRight, ArrowDown, ArrowUp, Square } from "lucide-react"

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900/95 rounded-xl border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.3)] w-full max-w-md max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-purple-500/20">
          <h3 className="text-xl font-bold text-amber-400">How to Play</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-800 transition-colors" aria-label="Close">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-4rem)]">
          <div className="space-y-4">
            <div>
              <h4 className="text-lg font-semibold text-white mb-2">Game Controls</h4>
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
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-2">Mobile Controls</h4>
              <p className="text-gray-300 mb-3">On mobile devices, you can use:</p>
              <ul className="list-disc pl-5 space-y-2 text-gray-300">
                <li>Swipe left/right to move the piece horizontally</li>
                <li>Swipe down to move the piece down</li>
                <li>Swipe up to rotate the piece</li>
                <li>Use the on-screen buttons for precise control</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-2">Game Rules</h4>
              <ul className="list-disc pl-5 space-y-2 text-gray-300">
                <li>Clear lines by filling them completely with blocks</li>
                <li>Score more points by clearing multiple lines at once</li>
                <li>The game speeds up as you reach higher levels</li>
                <li>Game ends when blocks stack up to the top</li>
                <li>Each game costs 1 life - lives regenerate over time</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
