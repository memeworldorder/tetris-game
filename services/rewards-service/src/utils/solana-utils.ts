import { Connection, PublicKey } from '@solana/web3.js'
import crypto from 'crypto'

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
const MWOR_MINT = process.env.MWOR_MINT || 'MWorUJrXwCDBJrBUeCw4mKoZ2niGBKPZrmqAGuJGbeV'

const connection = new Connection(SOLANA_RPC_URL)

export async function getMworBalance(wallet: string): Promise<number> {
  try {
    const walletPubkey = new PublicKey(wallet)
    const mintPubkey = new PublicKey(MWOR_MINT)
    
    // Get token accounts for this wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPubkey,
      { mint: mintPubkey }
    )
    
    if (tokenAccounts.value.length === 0) {
      return 0
    }
    
    // Sum up all MWOR token account balances
    let totalBalance = 0
    for (const account of tokenAccounts.value) {
      const balance = account.account.data.parsed.info.tokenAmount.uiAmount
      totalBalance += balance
    }
    
    return totalBalance
  } catch (error) {
    console.error('Error fetching MWOR balance:', error)
    throw error
  }
}

export function generateDeviceFingerprint(ip: string, userAgent: string): string {
  const hash = crypto.createHash('sha256')
  hash.update(ip)
  hash.update(userAgent)
  return hash.digest('hex').substring(0, 16)
}

export function calculateBonusLives(mworBalance: number, divisor: number, cap: number): number {
  return Math.min(Math.floor(mworBalance / divisor), cap)
} 