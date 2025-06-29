import { NextRequest, NextResponse } from 'next/server'
import { paymentsProcess } from '@/lib/supabase-functions'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    
    const data = await paymentsProcess(params)
    
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
    
    const data = await paymentsProcess(body)
    
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