import { type NextRequest, NextResponse } from "next/server"
import { GameFiAPI } from "@/lib/supabase-client"

export async function POST(request: NextRequest) {
  try {
    const { wallet } = await request.json()

    if (!wallet) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
    }

    console.log(`🎮 SUPABASE: Using life for ${wallet}`)
    
    try {
      const updatedLives = await GameFiAPI.useLife(wallet)
      console.log('✅ SUPABASE: Life used successfully')
      
      return NextResponse.json({
        success: true,
        lives: updatedLives,
        message: 'Life used successfully',
        source: 'supabase'
      })
      
    } catch (error) {
      console.error("❌ SUPABASE: Error using life:", error)
      
      if ((error as Error).message === 'No lives available') {
        return NextResponse.json({ 
          error: "No lives available",
          source: 'supabase'
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        error: "Database error", 
        details: (error as Error).message,
        source: 'supabase'
      }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in use life API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
