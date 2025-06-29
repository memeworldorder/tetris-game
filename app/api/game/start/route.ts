import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json()

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
    }

    // Use Game Engine microservice through API Gateway for MAINNET LIVE
    const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    
    try {
      const response = await fetch(`${API_GATEWAY_URL}/api/game/session/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          walletAddress,
          gameType: 'tetris',
          network: 'mainnet-beta'
        })
      })

      if (!response.ok) {
        throw new Error(`Game Engine API failed: ${response.status}`)
      }

      const data = await response.json()
      return NextResponse.json({ sessionId: data.sessionId })
    } catch (error) {
      console.error("Error starting LIVE game session:", error)
      return NextResponse.json({ error: "Failed to start live game session" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in game start API:", error)
    return NextResponse.json({ error: "Failed to start game session" }, { status: 500 })
  }
}
