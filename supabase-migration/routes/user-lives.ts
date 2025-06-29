import { NextRequest, NextResponse } from 'next/server'
import { userLives } from '@/lib/supabase-functions'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    
    const data = await userLives(params)
    
    return NextResponse.json({ 
      success: true, 
      data,
      source: 'supabase'
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const data = await userLives(body)
    
    return NextResponse.json({ 
      success: true, 
      data,
      source: 'supabase'
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 })
  }
}