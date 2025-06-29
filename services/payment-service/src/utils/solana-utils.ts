import { Keypair, PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'
import axios from 'axios'

// Price configuration
const MWOR_MINT = process.env.MWOR_MINT || 'MWorUJrXwCDBJrBUeCw4mKoZ2niGBKPZrmqAGuJGbeV'
const JUPITER_PRICE_API = 'https://price.jup.ag/v4/price'

export interface PriceInfo {
  cheapPriceMwor: number
  midPriceMwor: number
  highPriceMwor: number
  mworPriceUsd: number
}

export async function calculateLifePrices(): Promise<PriceInfo> {
  try {
    // Get MWOR price in USD
    const response = await axios.get(JUPITER_PRICE_API, {
      params: {
        ids: MWOR_MINT
      }
    })
    
    const mworPriceUsd = response.data?.data?.[MWOR_MINT]?.price || 0.001
    
    // Calculate MWOR amounts for each tier
    const cheapUsd = parseFloat(process.env.PAID_LIFE_USD_CHEAP || '0.03')
    const midUsd = parseFloat(process.env.PAID_LIFE_USD_MID || '0.09')
    const highUsd = parseFloat(process.env.PAID_LIFE_USD_HIGH || '0.27')
    
    return {
      cheapPriceMwor: Math.ceil(cheapUsd / mworPriceUsd),
      midPriceMwor: Math.ceil(midUsd / mworPriceUsd),
      highPriceMwor: Math.ceil(highUsd / mworPriceUsd),
      mworPriceUsd
    }
  } catch (error) {
    console.error('Error fetching MWOR price:', error)
    // Fallback prices
    return {
      cheapPriceMwor: 30,
      midPriceMwor: 90,
      highPriceMwor: 270,
      mworPriceUsd: 0.001
    }
  }
}

export function generateTempPaymentAddress(wallet: string, nonce: number): PublicKey {
  // Create a deterministic seed from wallet and nonce
  const seedString = `${wallet}-${nonce}-${process.env.PAYMENT_SEED || 'gamefi-payment'}`
  const seed = Buffer.from(seedString).slice(0, 32)
  
  // Generate keypair from seed
  const keypair = Keypair.fromSeed(seed)
  
  return keypair.publicKey
}

export function verifyPaymentSignature(
  signature: string,
  message: string,
  publicKey: string
): boolean {
  try {
    // This is a placeholder - implement actual signature verification
    // using @solana/web3.js or ethers.js depending on the wallet type
    return true
  } catch (error) {
    console.error('Signature verification failed:', error)
    return false
  }
}

export async function getTransactionDetails(signature: string): Promise<any> {
  // Placeholder for fetching transaction details from Solana
  // In production, this would use Connection.getTransaction()
  return {
    signature,
    amount: 0,
    token: 'MWOR',
    timestamp: Date.now()
  }
} 