import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { calculateLifePrices } from '@/lib/solana-utils'
import * as crypto from 'crypto'

// Helius webhook verification
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  
  return signature === expectedSignature
}

// Calculate lives from MWOR amount based on current pricing
async function calculateLivesFromAmount(mworAmount: number): Promise<number> {
  const priceInfo = await calculateLifePrices()
  
  // Determine which tier the payment falls into
  if (mworAmount >= priceInfo.highPriceMwor) {
    return Math.floor(mworAmount / priceInfo.highPriceMwor) * 10 // High tier: 10 lives
  } else if (mworAmount >= priceInfo.midPriceMwor) {
    return Math.floor(mworAmount / priceInfo.midPriceMwor) * 3 // Mid tier: 3 lives
  } else if (mworAmount >= priceInfo.cheapPriceMwor) {
    return Math.floor(mworAmount / priceInfo.cheapPriceMwor) * 1 // Cheap tier: 1 life
  }
  
  return 0 // Amount too small
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const webhookSecret = process.env.HELIUS_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('HELIUS_WEBHOOK_SECRET not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    const signature = request.headers.get('x-webhook-signature') || ''
    const payload = await request.text()
    
    if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
      console.error('Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const webhookData = JSON.parse(payload)
    
    // Process each transaction in the webhook
    for (const tx of webhookData) {
      try {
        await processTransaction(tx)
      } catch (error) {
        console.error('Error processing transaction:', tx.signature, error)
        // Continue processing other transactions even if one fails
      }
    }

    return NextResponse.json({ status: 'processed' })

  } catch (error) {
    console.error('Error in Helius webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function processTransaction(tx: any) {
  const signature = tx.signature
  const mworMint = process.env.MWOR_MINT
  
  if (!mworMint) {
    throw new Error('MWOR_MINT not configured')
  }

  // Check if this transaction was already processed
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id')
    .eq('tx_sig', signature)
    .single()

  if (existingPayment) {
    console.log('Transaction already processed:', signature)
    return
  }

  // Extract MWOR transfer information
  let mworTransfer: {
    from: string
    to: string
    amount: number
  } | null = null

  // Look for token transfers in the transaction
  if (tx.tokenTransfers && Array.isArray(tx.tokenTransfers)) {
    for (const transfer of tx.tokenTransfers) {
      if (transfer.mint === mworMint) {
        mworTransfer = {
          from: transfer.fromUserAccount,
          to: transfer.toUserAccount,
          amount: transfer.tokenAmount
        }
        break
      }
    }
  }

  if (!mworTransfer) {
    // Not an MWOR transfer, ignore
    return
  }

  // Check if the destination address is one of our temporary payment addresses
  // This would normally query your temp address store
  // For now, we'll assume any MWOR transfer to a specific pattern is a life purchase
  
  // Look up which wallet this payment is for
  // In a real implementation, you'd check against your temp address store
  const recipientWallet = mworTransfer.from // The sender is the player
  const mworAmount = mworTransfer.amount

  // Calculate lives to award
  const livesToAward = await calculateLivesFromAmount(mworAmount)
  
  if (livesToAward === 0) {
    console.log('Payment amount too small:', mworAmount)
    return
  }

  // Record the payment
  const { error: paymentError } = await supabase
    .from('payments')
    .insert([{
      wallet: recipientWallet,
      tx_sig: signature,
      mwor_amount: mworAmount,
      lives_bought: livesToAward
    }])

  if (paymentError) {
    console.error('Error recording payment:', paymentError)
    throw paymentError
  }

  // Update user's paid_bank
  const { data: livesRecord } = await supabase
    .from('lives')
    .select('*')
    .eq('wallet', recipientWallet)
    .single()

  if (livesRecord) {
    // Update existing record
    const { error: updateError } = await supabase
      .from('lives')
      .update({
        paid_bank: livesRecord.paid_bank + livesToAward
      })
      .eq('wallet', recipientWallet)

    if (updateError) {
      console.error('Error updating lives bank:', updateError)
      throw updateError
    }
  } else {
    // Create new record
    const utcMidnight = new Date()
    utcMidnight.setUTCHours(0, 0, 0, 0)

    const { error: createError } = await supabase
      .from('lives')
      .insert([{
        wallet: recipientWallet,
        free_today: 0,
        bonus_today: 0,
        paid_bank: livesToAward,
        last_reset: utcMidnight.toISOString()
      }])

    if (createError) {
      console.error('Error creating lives record:', createError)
      throw createError
    }
  }

  console.log(`Processed payment: ${signature}, awarded ${livesToAward} lives to ${recipientWallet}`)
} 