import { Trophy } from "lucide-react"
import { topPlayers } from "@/data/leaderboard"

export default function MiniLeaderboard() {
  // Only show top 3 players for the mini leaderboard
  const top3Players = topPlayers.slice(0, 3)

  return (
    <div className="overflow-hidden rounded-lg border border-purple-500/30 bg-gray-800/50">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-purple-500/20">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rank</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Player</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Score</th>
            </tr>
          </thead>
          <tbody>
            {top3Players.map((player) => (
              <tr key={player.rank} className="border-b border-purple-500/10 last:border-0">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    {player.rank === 1 ? (
                      <Trophy className="h-4 w-4 text-amber-400 mr-1" />
                    ) : (
                      <span className="text-sm font-medium text-gray-300">{player.rank}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-white">{player.name}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                    {player.score.toLocaleString()}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
