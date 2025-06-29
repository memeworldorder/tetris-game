import { type NextRequest, NextResponse } from "next/server"
import { vrfTetrisEngine, type VRFGameSession, type PieceGenerationResult } from "@/lib/vrf-game-engine"

export async function POST(request: NextRequest) {
  try {
    const { action, walletAddress, sessionId, pieceData } = await request.json()

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
    }

    switch (action) {
      case "initialize":
        try {
          const session = await vrfTetrisEngine.initializeSession(walletAddress, sessionId)
          return NextResponse.json({
            success: true,
            session: {
              sessionId: session.sessionId,
              walletAddress: session.walletAddress,
              masterSeedHash: session.masterSeed.slice(0, 32) + '...', // Don't expose full seed
              pieceIndex: session.pieceIndex,
              startTime: session.startTime,
              vrfSignature: session.vrfSignature
            }
          })
        } catch (error) {
          console.error("Error initializing VRF session:", error)
          return NextResponse.json({ error: "Failed to initialize VRF session" }, { status: 500 })
        }

      case "generatePiece":
        try {
          if (!sessionId) {
            return NextResponse.json({ error: "Session ID required" }, { status: 400 })
          }

          const piece = vrfTetrisEngine.generateNextPiece(sessionId)
          return NextResponse.json({
            success: true,
            piece: {
              pieceType: piece.pieceType,
              sessionId: piece.sessionId,
              pieceIndex: piece.pieceIndex,
              proof: piece.proof
              // Note: seedUsed is kept private for security
            }
          })
        } catch (error) {
          console.error("Error generating VRF piece:", error)
          return NextResponse.json({ error: "Failed to generate piece" }, { status: 500 })
        }

      case "verifyPieces":
        try {
          if (!Array.isArray(pieceData)) {
            return NextResponse.json({ error: "Piece data array required" }, { status: 400 })
          }

          const verificationResults = pieceData.map((piece: PieceGenerationResult) => {
            return {
              pieceIndex: piece.pieceIndex,
              valid: vrfTetrisEngine.verifyPieceGeneration(piece)
            }
          })

          const allValid = verificationResults.every(result => result.valid)

          return NextResponse.json({
            success: true,
            allValid,
            verificationResults,
            totalPieces: pieceData.length
          })
        } catch (error) {
          console.error("Error verifying pieces:", error)
          return NextResponse.json({ error: "Failed to verify pieces" }, { status: 500 })
        }

      case "getSession":
        try {
          if (!sessionId) {
            return NextResponse.json({ error: "Session ID required" }, { status: 400 })
          }

          const sessionData = vrfTetrisEngine.exportSessionData(sessionId)
          if (!sessionData) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 })
          }

          return NextResponse.json({
            success: true,
            session: sessionData
          })
        } catch (error) {
          console.error("Error getting session:", error)
          return NextResponse.json({ error: "Failed to get session" }, { status: 500 })
        }

      case "cleanup":
        try {
          vrfTetrisEngine.cleanupOldSessions()
          return NextResponse.json({
            success: true,
            message: "Old sessions cleaned up"
          })
        } catch (error) {
          console.error("Error cleaning up sessions:", error)
          return NextResponse.json({ error: "Failed to cleanup sessions" }, { status: 500 })
        }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in VRF session API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    const sessionData = vrfTetrisEngine.exportSessionData(sessionId)
    if (!sessionData) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      session: sessionData
    })
  } catch (error) {
    console.error("Error getting VRF session:", error)
    return NextResponse.json({ error: "Failed to get session" }, { status: 500 })
  }
} 