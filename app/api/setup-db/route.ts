import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-client'

// API endpoint to set up database tables automatically
export async function POST(request: NextRequest) {
  try {
    console.log('🗄️  Setting up database tables...')

    // Create user_lives table
    const { error: userLivesError } = await supabaseAdmin.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS public.user_lives (
          id SERIAL PRIMARY KEY,
          wallet_address TEXT UNIQUE NOT NULL,
          free_today INTEGER DEFAULT 5,
          bonus_today INTEGER DEFAULT 0,
          paid_bank INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })

    // Create game_sessions table
    const { error: gameSessionsError } = await supabaseAdmin.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS public.game_sessions (
          id SERIAL PRIMARY KEY,
          wallet_address TEXT NOT NULL,
          score INTEGER DEFAULT 0,
          game_type TEXT DEFAULT 'tetris',
          status TEXT DEFAULT 'active',
          started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          ended_at TIMESTAMP WITH TIME ZONE,
          game_data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })

    // Create user_stats table
    const { error: userStatsError } = await supabaseAdmin.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS public.user_stats (
          id SERIAL PRIMARY KEY,
          wallet_address TEXT UNIQUE NOT NULL,
          total_games INTEGER DEFAULT 0,
          total_score INTEGER DEFAULT 0,
          best_score INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })

    // Create transactions table
    const { error: transactionsError } = await supabaseAdmin.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS public.transactions (
          id SERIAL PRIMARY KEY,
          wallet_address TEXT NOT NULL,
          type TEXT NOT NULL,
          amount_sol DECIMAL(10,9) DEFAULT 0,
          lives_purchased INTEGER DEFAULT 0,
          tx_signature TEXT,
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })

    // Set up RLS policies
    await supabaseAdmin.rpc('exec_sql', {
      query: `
        ALTER TABLE public.user_lives ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Allow all operations" ON public.user_lives;
        DROP POLICY IF EXISTS "Allow all operations" ON public.game_sessions;
        DROP POLICY IF EXISTS "Allow all operations" ON public.user_stats;
        DROP POLICY IF EXISTS "Allow all operations" ON public.transactions;
        
        CREATE POLICY "Allow all operations" ON public.user_lives FOR ALL USING (true);
        CREATE POLICY "Allow all operations" ON public.game_sessions FOR ALL USING (true);
        CREATE POLICY "Allow all operations" ON public.user_stats FOR ALL USING (true);
        CREATE POLICY "Allow all operations" ON public.transactions FOR ALL USING (true);
      `
    })

    // Insert test data
    const { error: insertError1 } = await supabaseAdmin
      .from('user_lives')
      .upsert([
        {
          wallet_address: 'FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai',
          free_today: 5,
          bonus_today: 0,
          paid_bank: 0
        }
      ], { onConflict: 'wallet_address' })

    const { error: insertError2 } = await supabaseAdmin
      .from('user_stats')
      .upsert([
        {
          wallet_address: 'FK5mv4UcFN4Ts5EmhvE6NnXwuxZ4SpCchRvUuBABhai',
          total_games: 0,
          total_score: 0,
          best_score: 0
        }
      ], { onConflict: 'wallet_address' })

    // Check if tables exist
    const { data: tables, error: tableCheckError } = await supabaseAdmin
      .from('user_lives')
      .select('*')
      .limit(1)

    return NextResponse.json({
      success: true,
      message: 'Database setup complete!',
      tables_created: [
        'user_lives',
        'game_sessions', 
        'user_stats',
        'transactions'
      ],
      test_data_inserted: true,
      table_check: tables ? 'Tables accessible' : 'Tables created but may be empty',
      errors: {
        userLives: userLivesError,
        gameSessions: gameSessionsError,
        userStats: userStatsError,
        transactions: transactionsError,
        insert1: insertError1,
        insert2: insertError2,
        tableCheck: tableCheckError
      }
    })

  } catch (error) {
    console.error('Database setup error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to set up database',
      details: (error as Error).message
    }, { status: 500 })
  }
} 