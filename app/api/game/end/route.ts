import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { sessionId, score, level, linesCleared } = await request.json()

    if (!sessionId || score === undefined || level === undefined || linesCleared === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Use Game Engine microservice through API Gateway for MAINNET LIVE
    const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    
    try {
      console.log(`🚀 LIVE API: Ending game session via ${API_GATEWAY_URL}/api/game/end`)
      
      const response = await fetch(`${API_GATEWAY_URL}/api/game/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sessionId, 
          score, 
          level, 
          linesCleared,
          network: 'mainnet-beta'
        })
      })

      if (!response.ok) {
        throw new Error(`Game Engine API failed: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ LIVE API: Game session ended successfully via microservice')
      return NextResponse.json(result)
      
    } catch (error) {
      console.error("❌ LIVE API: Error ending game session via Game Engine:", error)
      return NextResponse.json({ 
        error: "Game Engine unavailable", 
        offline: true
      }, { status: 503 })
    }
  } catch (error) {
    console.error("Error in game end API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
