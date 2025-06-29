interface NextPiecePreviewProps {
  nextPiece: {
    shape: number[][]
    color: string
    borderColor: string
    shadowColor: string
  } | null
}

export default function NextPiecePreview({ nextPiece }: NextPiecePreviewProps) {
  if (!nextPiece) return null

  // Create a 4x4 grid to display the next piece
  const grid = Array(4)
    .fill(null)
    .map(() => Array(4).fill(null))

  // Center the piece in the grid
  const offsetY = nextPiece.shape.length === 2 ? 1 : 0
  const offsetX = nextPiece.shape[0].length === 2 ? 1 : 0

  // Place the piece in the grid
  nextPiece.shape.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell !== 0) {
        grid[y + offsetY][x + offsetX] = {
          color: nextPiece.color,
          borderColor: nextPiece.borderColor,
          shadowColor: nextPiece.shadowColor,
        }
      }
    })
  })

  return (
    <div className="bg-gray-800/80 p-2 rounded-lg border border-purple-500/30">
      <div className="text-xs text-gray-400 mb-1 text-center">Next</div>
      <div className="grid grid-cols-4 gap-px bg-gray-900/50 p-px rounded">
        {grid.flat().map((cell, index) => (
          <div
            key={index}
            className={`w-4 h-4 ${
              cell ? `${cell.color} border ${cell.borderColor} ${cell.shadowColor}` : "bg-gray-900/80"
            } rounded-sm`}
          />
        ))}
      </div>
    </div>
  )
}
