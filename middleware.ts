import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Completely disable middleware - just pass through all requests
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Don't run middleware on anything for now
    '/disabled-path-that-never-matches'
  ],
} 