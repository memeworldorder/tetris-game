import { type NextRequest, NextResponse } from "next/server"
import { GameFiAPI } from "@/lib/supabase-client"

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Use nextUrl.searchParams instead of new URL(request.url) to avoid dynamic server error
    const walletAddress = request.nextUrl.searchParams.get("wallet")

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
    }

    // Validate wallet address format (basic validation)
    if (walletAddress.length < 32 || walletAddress.length > 44) {
      return NextResponse.json({ error: "Invalid wallet address format" }, { status: 400 })
    }

    console.log(`🚀 Getting user lives for ${walletAddress}`)
    
    try {
      const userData = await GameFiAPI.getUserLives(walletAddress)
      console.log('✅ Successfully retrieved user data')
      
      return NextResponse.json({
        success: true,
        data: userData,
        user: { wallet_address: walletAddress }
      })
      
    } catch (error) {
      console.error("❌ Error fetching user lives:", error)
      return NextResponse.json({ 
        success: false,
        error: "Database error", 
        details: (error as Error).message
      }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in user lives API:", error)
    return NextResponse.json({ 
      success: false,
      error: "Internal server error",
      details: (error as Error).message
    }, { status: 500 })
  }
}
