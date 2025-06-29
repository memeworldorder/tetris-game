#!/usr/bin/env node

/**
 * Supabase Migration Helper
 * This script helps migrate existing API endpoints to use Supabase
 * without complete rewrites
 */

const fs = require('fs')
const path = require('path')

// Configuration for API migration
const MIGRATION_CONFIG = {
  // Map existing API patterns to Supabase equivalents
  patterns: {
    // User-related endpoints
    '/api/user/lives': {
      table: 'user_lives',
      method: 'select',
      filters: ['wallet_address']
    },
    '/api/user/profile': {
      table: 'users',
      method: 'select',
      filters: ['wallet_address']
    },
    '/api/user/stats': {
      table: 'user_game_stats',
      method: 'select',
      filters: ['wallet_address']
    },
    
    // Game endpoints
    '/api/game/start': {
      rpc: 'handle_game_start',
      params: ['wallet_address', 'game_id']
    },
    '/api/game/end': {
      rpc: 'handle_game_end',
      params: ['session_id', 'score', 'moves']
    },
    
    // Leaderboard endpoints
    '/api/leaderboard/daily': {
      view: 'daily_leaderboard',
      method: 'select',
      orderBy: 'score',
      limit: 100
    },
    '/api/leaderboard/weekly': {
      view: 'weekly_leaderboard',
      method: 'select',
      orderBy: 'total_score',
      limit: 100
    },
    
    // Payment endpoints
    '/api/payments/process': {
      rpc: 'process_payment',
      params: ['wallet_address', 'amount', 'signature']
    },
    
    // Community endpoints
    '/api/community/achievements': {
      table: 'user_achievements',
      method: 'select',
      filters: ['wallet_address']
    },
    '/api/community/referrals': {
      table: 'referrals',
      method: 'select',
      filters: ['referrer_wallet', 'referred_wallet']
    }
  }
}

// Generate Supabase client wrapper
function generateSupabaseWrapper(apiPath, config) {
  if (config.rpc) {
    // Generate RPC function call
    return `
export async function ${getFunctionName(apiPath)}(params) {
  const { data, error } = await supabase.rpc('${config.rpc}', {
    ${config.params.map(p => `${p}: params.${p}`).join(',\n    ')}
  })
  
  if (error) throw error
  return data
}`
  } else if (config.table || config.view) {
    // Generate table/view query
    return `
export async function ${getFunctionName(apiPath)}(filters = {}) {
  let query = supabase.from('${config.table || config.view}')
  
  // Apply filters
  ${config.filters ? config.filters.map(f => 
    `if (filters.${f}) query = query.eq('${f}', filters.${f})`
  ).join('\n  ') : ''}
  
  ${config.orderBy ? `query = query.order('${config.orderBy}', { ascending: false })` : ''}
  ${config.limit ? `query = query.limit(${config.limit})` : ''}
  
  const { data, error } = await query${config.method ? `.${config.method}()` : ''}
  
  if (error) throw error
  return data
}`
  }
}

// Generate Next.js API route using Supabase
function generateApiRoute(apiPath, config) {
  const functionName = getFunctionName(apiPath)
  
  return `import { NextRequest, NextResponse } from 'next/server'
import { ${functionName} } from '@/lib/supabase-functions'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    
    const data = await ${functionName}(params)
    
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
    
    const data = await ${functionName}(body)
    
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
}`
}

// Helper to generate function names
function getFunctionName(apiPath) {
  return apiPath
    .replace('/api/', '')
    .split('/')
    .map((part, index) => 
      index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join('')
}

// Generate migration report
function generateMigrationReport() {
  const report = {
    totalEndpoints: Object.keys(MIGRATION_CONFIG.patterns).length,
    byType: {
      rpc: 0,
      table: 0,
      view: 0
    },
    endpoints: []
  }
  
  Object.entries(MIGRATION_CONFIG.patterns).forEach(([path, config]) => {
    if (config.rpc) report.byType.rpc++
    else if (config.table) report.byType.table++
    else if (config.view) report.byType.view++
    
    report.endpoints.push({
      path,
      type: config.rpc ? 'RPC Function' : config.view ? 'View' : 'Table',
      target: config.rpc || config.table || config.view
    })
  })
  
  return report
}

// Main migration function
async function migrate() {
  console.log('🚀 Supabase Migration Helper\n')
  
  // Generate migration report
  const report = generateMigrationReport()
  console.log('📊 Migration Analysis:')
  console.log(`   Total Endpoints: ${report.totalEndpoints}`)
  console.log(`   RPC Functions: ${report.byType.rpc}`)
  console.log(`   Table Queries: ${report.byType.table}`)
  console.log(`   View Queries: ${report.byType.view}\n`)
  
  // Create output directories
  const outputDir = path.join(process.cwd(), 'supabase-migration')
  const functionsDir = path.join(outputDir, 'functions')
  const routesDir = path.join(outputDir, 'routes')
  
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })
  if (!fs.existsSync(functionsDir)) fs.mkdirSync(functionsDir, { recursive: true })
  if (!fs.existsSync(routesDir)) fs.mkdirSync(routesDir, { recursive: true })
  
  // Generate Supabase functions file
  let functionsContent = `import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

`
  
  // Generate files for each endpoint
  Object.entries(MIGRATION_CONFIG.patterns).forEach(([apiPath, config]) => {
    // Add function to the main functions file
    functionsContent += generateSupabaseWrapper(apiPath, config) + '\n'
    
    // Generate individual route file
    const routePath = apiPath.replace('/api/', '').replace(/\//g, '-') + '.ts'
    const routeContent = generateApiRoute(apiPath, config)
    
    fs.writeFileSync(
      path.join(routesDir, routePath),
      routeContent
    )
  })
  
  // Write the functions file
  fs.writeFileSync(
    path.join(functionsDir, 'index.ts'),
    functionsContent
  )
  
  // Generate migration guide
  const guideContent = `# Supabase Migration Guide

## Generated Files

### 1. Supabase Functions (/supabase-migration/functions/index.ts)
Contains all the Supabase client functions that replace your database queries.

### 2. API Routes (/supabase-migration/routes/)
Updated API route handlers that use the Supabase functions.

## Migration Steps

1. **Database Setup**
   - Import your existing PostgreSQL schema to Supabase
   - Create any required RPC functions
   - Set up Row Level Security policies

2. **Environment Variables**
   Add to your .env.local:
   \`\`\`
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   \`\`\`

3. **Gradual Migration**
   - Copy generated functions to your lib/ directory
   - Replace API routes one by one
   - Test each endpoint thoroughly

## Endpoint Mapping

${report.endpoints.map(ep => 
  `- **${ep.path}** → ${ep.type}: \`${ep.target}\``
).join('\n')}

## Required Database Functions

Create these RPC functions in Supabase:

\`\`\`sql
-- Example: handle_game_start
CREATE OR REPLACE FUNCTION handle_game_start(
  wallet_address TEXT,
  game_id UUID
) RETURNS JSON AS $$
BEGIN
  -- Your game start logic here
  RETURN json_build_object('session_id', gen_random_uuid());
END;
$$ LANGUAGE plpgsql;

-- Example: handle_game_end
CREATE OR REPLACE FUNCTION handle_game_end(
  session_id UUID,
  score INTEGER,
  moves JSONB
) RETURNS JSON AS $$
BEGIN
  -- Your game end logic here
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
\`\`\`

## Benefits
- ✅ No complete rewrite needed
- ✅ Gradual migration possible
- ✅ Keep existing business logic
- ✅ Add Supabase features incrementally
`
  
  fs.writeFileSync(
    path.join(outputDir, 'MIGRATION_GUIDE.md'),
    guideContent
  )
  
  console.log('✅ Migration files generated successfully!\n')
  console.log('📁 Output directory: ./supabase-migration/')
  console.log('📄 Check MIGRATION_GUIDE.md for next steps\n')
}

// Run migration
migrate().catch(console.error) 