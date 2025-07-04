# Supabase VRF Edge Functions Implementation Guide

## Overview

This guide details how to implement VRF (Verifiable Random Function) calls through Supabase Edge Functions, moving away from direct blockchain calls in the main application.

## Architecture

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│   Game/Raffle   │────▶│  Supabase Edge Fn   │────▶│   Switchboard   │
│     Service     │     │   (VRF Handler)     │     │      VRF        │
└─────────────────┘     └─────────────────────┘     └─────────────────┘
         │                         │                          
         │                         ▼                          
         │              ┌─────────────────────┐              
         └─────────────▶│   Supabase DB       │              
                        │  (VRF Results)      │              
                        └─────────────────────┘              
```

## Edge Function Implementation

### 1. **VRF Request Handler** (`supabase/functions/vrf-request/index.ts`)

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Connection, PublicKey, Keypair } from "https://esm.sh/@solana/web3.js@1.73.0"
import { 
  AnchorProvider, 
  Program, 
  web3 
} from "https://esm.sh/@project-serum/anchor@0.26.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { purpose, gameId, sessionId, metadata } = await req.json()

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Initialize Solana connection
    const rpcUrl = Deno.env.get('SOLANA_RPC_URL') || 'https://api.mainnet-beta.solana.com'
    const connection = new Connection(rpcUrl)

    // Load VRF authority keypair from environment
    const vrfAuthoritySecret = JSON.parse(Deno.env.get('VRF_AUTHORITY_KEYPAIR')!)
    const vrfAuthority = Keypair.fromSecretKey(new Uint8Array(vrfAuthoritySecret))

    // Switchboard VRF configuration
    const switchboardProgramId = new PublicKey(Deno.env.get('SWITCHBOARD_PROGRAM_ID')!)
    const vrfQueueAccount = new PublicKey(Deno.env.get('VRF_QUEUE_ACCOUNT')!)

    // Create VRF request
    const vrfRequest = await createVrfRequest({
      connection,
      vrfAuthority,
      switchboardProgramId,
      vrfQueueAccount,
      callback: {
        programId: new PublicKey(Deno.env.get('CALLBACK_PROGRAM_ID')!),
        accounts: [],
        ixData: Buffer.from(JSON.stringify({ purpose, gameId, sessionId }))
      }
    })

    // Store VRF request in database
    const { data, error } = await supabase
      .from('vrf_requests')
      .insert({
        request_id: vrfRequest.publicKey.toString(),
        purpose,
        game_id: gameId,
        session_id: sessionId,
        metadata,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    // Return request details
    return new Response(
      JSON.stringify({
        success: true,
        requestId: data.request_id,
        message: 'VRF request submitted successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('VRF request error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

// Helper function to create VRF request
async function createVrfRequest(params: {
  connection: Connection
  vrfAuthority: Keypair
  switchboardProgramId: PublicKey
  vrfQueueAccount: PublicKey
  callback: any
}) {
  // Implementation details for Switchboard VRF request
  // This would include the actual Switchboard SDK calls
  // Simplified for brevity
  
  const vrfAccount = web3.Keypair.generate()
  
  // Create VRF request transaction
  const tx = new web3.Transaction()
  
  // Add VRF request instruction
  // ... actual implementation
  
  // Send transaction
  const signature = await params.connection.sendTransaction(
    tx,
    [params.vrfAuthority, vrfAccount]
  )
  
  await params.connection.confirmTransaction(signature)
  
  return {
    publicKey: vrfAccount.publicKey,
    signature
  }
}
```

### 2. **VRF Callback Handler** (`supabase/functions/vrf-callback/index.ts`)

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyVrfProof } from './vrf-verification'

serve(async (req) => {
  // This function is called by Switchboard when VRF is ready
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      requestId, 
      randomness, 
      proof,
      timestamp 
    } = await req.json()

    // Verify the request is from Switchboard
    const isValidCallback = await verifyCallbackSource(req)
    if (!isValidCallback) {
      throw new Error('Invalid callback source')
    }

    // Initialize Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify VRF proof
    const isValidProof = await verifyVrfProof(randomness, proof)
    if (!isValidProof) {
      throw new Error('Invalid VRF proof')
    }

    // Update VRF request with result
    const { data: vrfRequest, error: fetchError } = await supabase
      .from('vrf_requests')
      .select('*')
      .eq('request_id', requestId)
      .single()

    if (fetchError) throw fetchError

    // Store VRF result
    const { data: vrfResult, error: insertError } = await supabase
      .from('vrf_results')
      .insert({
        request_id: requestId,
        randomness,
        proof,
        purpose: vrfRequest.purpose,
        game_id: vrfRequest.game_id,
        session_id: vrfRequest.session_id,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Update request status
    await supabase
      .from('vrf_requests')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('request_id', requestId)

    // Process based on purpose
    await processVrfResult(vrfRequest.purpose, vrfResult, supabase)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'VRF callback processed successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('VRF callback error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function processVrfResult(purpose: string, vrfResult: any, supabase: any) {
  switch (purpose) {
    case 'raffle_draw':
      // Process raffle winner selection
      await processRaffleDrawing(vrfResult, supabase)
      break
      
    case 'game_seed':
      // Process game randomness seed
      await processGameSeed(vrfResult, supabase)
      break
      
    default:
      console.log('Unknown VRF purpose:', purpose)
  }
}

async function processRaffleDrawing(vrfResult: any, supabase: any) {
  // Convert randomness to winner selection
  const { data: raffleData } = await supabase
    .from('raffle_entries')
    .select('*')
    .eq('raffle_id', vrfResult.metadata.raffle_id)
    .order('entry_number')

  // Use VRF randomness to select winners
  const totalTickets = raffleData.reduce((sum, entry) => sum + entry.tickets, 0)
  const winnerIndex = BigInt(vrfResult.randomness) % BigInt(totalTickets)
  
  // Find winner
  let currentSum = 0
  let winner = null
  
  for (const entry of raffleData) {
    currentSum += entry.tickets
    if (currentSum > winnerIndex) {
      winner = entry
      break
    }
  }

  // Store winner
  await supabase
    .from('raffle_winners')
    .insert({
      raffle_id: vrfResult.metadata.raffle_id,
      winner_address: winner.wallet_address,
      vrf_result_id: vrfResult.id,
      prize_amount: vrfResult.metadata.prize_amount
    })
}
```

### 3. **VRF Status Check** (`supabase/functions/vrf-status/index.ts`)

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const requestId = url.searchParams.get('requestId')

    if (!requestId) {
      throw new Error('Request ID is required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get request status
    const { data: request, error: requestError } = await supabase
      .from('vrf_requests')
      .select('*')
      .eq('request_id', requestId)
      .single()

    if (requestError) throw requestError

    // Get result if completed
    let result = null
    if (request.status === 'completed') {
      const { data: vrfResult } = await supabase
        .from('vrf_results')
        .select('*')
        .eq('request_id', requestId)
        .single()
      
      result = vrfResult
    }

    return new Response(
      JSON.stringify({
        success: true,
        request,
        result
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('VRF status error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
```

## Database Schema for VRF

```sql
-- VRF Requests table
CREATE TABLE vrf_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT UNIQUE NOT NULL,
  purpose TEXT NOT NULL, -- 'raffle_draw', 'game_seed', etc
  game_id TEXT,
  session_id TEXT,
  metadata JSONB,
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- VRF Results table
CREATE TABLE vrf_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT REFERENCES vrf_requests(request_id),
  randomness TEXT NOT NULL,
  proof TEXT NOT NULL,
  purpose TEXT NOT NULL,
  game_id TEXT,
  session_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vrf_requests_status ON vrf_requests(status);
CREATE INDEX idx_vrf_requests_purpose ON vrf_requests(purpose);
CREATE INDEX idx_vrf_results_request_id ON vrf_results(request_id);
```

## Client SDK Integration

```typescript
// gamefi-sdk/src/vrf-client.ts
export class VrfClient {
  private supabaseUrl: string
  private supabaseAnonKey: string

  constructor(config: { supabaseUrl: string; supabaseAnonKey: string }) {
    this.supabaseUrl = config.supabaseUrl
    this.supabaseAnonKey = config.supabaseAnonKey
  }

  async requestRandomness(params: {
    purpose: string
    gameId?: string
    sessionId?: string
    metadata?: any
  }): Promise<{ requestId: string }> {
    const response = await fetch(`${this.supabaseUrl}/functions/v1/vrf-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.supabaseAnonKey}`
      },
      body: JSON.stringify(params)
    })

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error || 'VRF request failed')
    }

    return { requestId: data.requestId }
  }

  async getRandomness(requestId: string): Promise<{
    status: string
    randomness?: string
    proof?: string
  }> {
    const response = await fetch(
      `${this.supabaseUrl}/functions/v1/vrf-status?requestId=${requestId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.supabaseAnonKey}`
        }
      }
    )

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error || 'Failed to get VRF status')
    }

    return {
      status: data.request.status,
      randomness: data.result?.randomness,
      proof: data.result?.proof
    }
  }

  async waitForRandomness(requestId: string, timeoutMs = 30000): Promise<{
    randomness: string
    proof: string
  }> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeoutMs) {
      const result = await this.getRandomness(requestId)
      
      if (result.status === 'completed' && result.randomness) {
        return {
          randomness: result.randomness,
          proof: result.proof!
        }
      }
      
      if (result.status === 'failed') {
        throw new Error('VRF request failed')
      }
      
      // Wait 2 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    throw new Error('VRF request timeout')
  }
}
```

## Usage Examples

### 1. **Raffle Drawing**

```typescript
// In raffle-engine service
const vrfClient = new VrfClient({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY
})

async function drawRaffleWinner(raffleId: string) {
  // Request VRF
  const { requestId } = await vrfClient.requestRandomness({
    purpose: 'raffle_draw',
    metadata: {
      raffle_id: raffleId,
      prize_amount: 1000
    }
  })

  // Wait for result
  const { randomness } = await vrfClient.waitForRandomness(requestId)

  // Winner is selected automatically by the callback function
  // Just need to fetch the result
  const winner = await getRaffleWinner(raffleId)
  return winner
}
```

### 2. **Game Seed Generation**

```typescript
// In game service
async function generateGameSeed(gameId: string, sessionId: string) {
  const { requestId } = await vrfClient.requestRandomness({
    purpose: 'game_seed',
    gameId,
    sessionId
  })

  const { randomness } = await vrfClient.waitForRandomness(requestId)
  
  // Use randomness as game seed
  return {
    seed: randomness,
    requestId // Store for verification
  }
}
```

## Environment Configuration

```env
# Supabase Edge Function Environment Variables
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SWITCHBOARD_PROGRAM_ID=SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f
VRF_QUEUE_ACCOUNT=xxx
CALLBACK_PROGRAM_ID=xxx

# VRF Authority Keypair (JSON array of bytes)
VRF_AUTHORITY_KEYPAIR=[1,2,3,...]
```

## Deployment

```bash
# Deploy VRF request function
supabase functions deploy vrf-request

# Deploy VRF callback function
supabase functions deploy vrf-callback

# Deploy VRF status function
supabase functions deploy vrf-status

# Set environment variables
supabase secrets set VRF_AUTHORITY_KEYPAIR="[...]"
supabase secrets set SWITCHBOARD_PROGRAM_ID="..."
```

## Security Considerations

1. **Callback Verification**: Always verify that VRF callbacks come from Switchboard
2. **Request Authentication**: Use Supabase RLS to control who can request VRF
3. **Rate Limiting**: Implement rate limiting to prevent VRF spam
4. **Proof Verification**: Always verify VRF proofs before using randomness
5. **Audit Trail**: Keep complete logs of all VRF requests and results

This implementation moves all VRF operations to Supabase Edge Functions, providing a clean separation of concerns and better scalability!