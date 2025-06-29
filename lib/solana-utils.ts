import { 
  Connection, 
  PublicKey, 
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction
} from '@solana/web3.js'
import { 
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token'
import * as crypto from 'crypto'

// Solana configuration
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com'
const MWOR_MINT = process.env.MWOR_MINT
const MWORGOV_MINT = process.env.MWORGOV_MINT
const PRICE_ORACLE_FEED = process.env.PRICE_ORACLE_FEED
const VRF_QUEUE = process.env.VRF_QUEUE
const TEMP_ADDR_DERIVE_SEED = process.env.TEMP_ADDR_DERIVE_SEED || 'lifebank'

export const connection = new Connection(SOLANA_RPC, 'confirmed')

// Generate PDA for temporary payment addresses
export function generateTempPaymentAddress(wallet: string, nonce: number): PublicKey {
  const seeds = [
    Buffer.from(TEMP_ADDR_DERIVE_SEED),
    Buffer.from(wallet),
    Buffer.from(nonce.toString())
  ]
  
  const [pda] = PublicKey.findProgramAddressSync(
    seeds,
    new PublicKey("11111111111111111111111111111112") // System Program
  )
  
  return pda
}

// Pricing utilities
export interface PriceInfo {
  mworPriceUsd: number
  cheapPriceMwor: number
  midPriceMwor: number
  highPriceMwor: number
  timestamp: number
}

// Mock oracle price fetching (replace with actual Switchboard integration)
export async function fetchMworPrice(): Promise<number> {
  try {
    // This would be replaced with actual Switchboard oracle integration
    // For now, return a mock price
    const mockPrice = 0.00025 // $0.00025 USD per MWOR
    return mockPrice
  } catch (error) {
    console.error('Error fetching MWOR price:', error)
    return 0.00025 // Fallback price
  }
}

// Calculate life prices based on current MWOR price
export async function calculateLifePrices(): Promise<PriceInfo> {
  const mworPriceUsd = await fetchMworPrice()
  
  const cheapUsd = parseFloat(process.env.PAID_LIFE_USD_CHEAP || '0.03')
  const midUsd = parseFloat(process.env.PAID_LIFE_USD_MID || '0.09')
  const highUsd = parseFloat(process.env.PAID_LIFE_USD_HIGH || '0.27')
  
  return {
    mworPriceUsd,
    cheapPriceMwor: Math.floor(cheapUsd / mworPriceUsd),
    midPriceMwor: Math.floor(midUsd / mworPriceUsd),
    highPriceMwor: Math.floor(highUsd / mworPriceUsd),
    timestamp: Date.now()
  }
}

// Wallet balance checking
export async function getMworBalance(walletAddress: string): Promise<number> {
  try {
    if (!MWOR_MINT) throw new Error('MWOR_MINT not configured')
    
    const walletPubkey = new PublicKey(walletAddress)
    const mworMint = new PublicKey(MWOR_MINT)
    
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mworMint,
      walletPubkey
    )
    
    const tokenAccount = await connection.getTokenAccountBalance(associatedTokenAddress)
    return tokenAccount.value.uiAmount || 0
  } catch (error) {
    console.error('Error getting MWOR balance:', error)
    return 0
  }
}

// Calculate bonus lives based on MWOR balance
export function calculateBonusLives(balance: number): number {
  const divisor = parseInt(process.env.BONUS_DIVISOR || '50000')
  const cap = parseInt(process.env.BONUS_CAP || '40')
  
  const bonusLives = Math.floor(balance / divisor)
  return Math.min(bonusLives, cap)
}

// Signature verification utilities
export interface GameMove {
  type: 'move' | 'rotate' | 'drop'
  timestamp: number
  direction?: 'left' | 'right' | 'down'
  rotation?: 'cw' | 'ccw'
}

export function generateSeedHash(seed: string): string {
  return crypto.createHash('sha256').update(seed).digest('hex')
}

export function signScoreProof(wallet: string, score: number, seedHash: string): Buffer {
  const message = `${wallet}:${score}:${seedHash}`
  const hash = crypto.createHash('sha256').update(message).digest()
  
  // In a real implementation, this would use a server-side keypair to sign
  // For now, we'll use a deterministic signature based on the message
  return Buffer.from(hash)
}

// VRF and randomness utilities
export async function requestRandomness(): Promise<string> {
  try {
    // This would integrate with Switchboard VRF
    // For now, return a mock transaction signature
    return crypto.randomBytes(32).toString('hex')
  } catch (error) {
    console.error('Error requesting randomness:', error)
    throw error
  }
}

// Merkle tree utilities for leaderboard
export function buildMerkleRoot(scores: Array<{ wallet: string, score: number }>): string {
  if (scores.length === 0) return crypto.randomBytes(32).toString('hex')
  
  // Simple merkle tree implementation
  let leaves = scores.map(s => 
    crypto.createHash('sha256').update(`${s.wallet}:${s.score}`).digest('hex')
  )
  
  while (leaves.length > 1) {
    const newLeaves: string[] = []
    for (let i = 0; i < leaves.length; i += 2) {
      const left = leaves[i]
      const right = leaves[i + 1] || left
      const combined = crypto.createHash('sha256').update(left + right).digest('hex')
      newLeaves.push(combined)
    }
    leaves = newLeaves
  }
  
  return leaves[0]
}

// Device fingerprinting utilities
export function generateDeviceFingerprint(ip: string, userAgent: string): string {
  const combined = `${ip}:${userAgent}`
  return crypto.createHash('md5').update(combined).digest('hex')
} 