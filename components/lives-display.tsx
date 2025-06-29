import { Heart } from "lucide-react"

interface LivesDisplayProps {
  currentLives: number
  maxLives: number
  timeToNextLife: number | null
}

export default function LivesDisplay({ currentLives, maxLives, timeToNextLife }: LivesDisplayProps) {
  // Format the time remaining until next life
  const formatTimeRemaining = (milliseconds: number) => {
    if (milliseconds <= 0) return "now"

    const minutes = Math.floor(milliseconds / 60000)
    const seconds = Math.floor((milliseconds % 60000) / 1000)

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center space-x-1 mb-1">
        {Array.from({ length: maxLives }).map((_, index) => (
          <Heart
            key={index}
            className={`h-5 w-5 ${
              index < currentLives ? "text-red-500 fill-red-500" : "text-gray-600 stroke-gray-600"
            }`}
          />
        ))}
      </div>
      {currentLives < maxLives && timeToNextLife !== null && (
        <div className="text-xs text-gray-400">Next life in: {formatTimeRemaining(timeToNextLife)}</div>
      )}
      {currentLives === maxLives && <div className="text-xs text-gray-400">Lives full</div>}
    </div>
  )
}
