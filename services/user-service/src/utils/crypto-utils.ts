import { PublicKey } from '@solana/web3.js'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-here'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

interface JWTPayload {
  userId: number
  wallet: string
  username?: string
}

export function verifySignature(message: string, signature: string, walletAddress: string): boolean {
  try {
    // Decode the signature from base58
    const signatureUint8 = bs58.decode(signature)
    
    // Convert message to Uint8Array
    const messageUint8 = new TextEncoder().encode(message)
    
    // Get the public key from wallet address
    const publicKey = new PublicKey(walletAddress)
    
    // Verify the signature using tweetnacl
    return nacl.sign.detached.verify(
      messageUint8,
      signatureUint8,
      publicKey.toBytes()
    )
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

export function generateJWT(payload: JWTPayload): string {
  try {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
  } catch (error) {
    console.error('JWT generation error:', error)
    throw new Error('Failed to generate JWT token')
  }
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    console.error('JWT verification error:', error)
    return null
  }
}

export function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

export function generateLoginMessage(wallet: string, nonce: string, timestamp: number): string {
  return `Sign this message to authenticate with GameFi Platform:

Wallet: ${wallet}
Nonce: ${nonce}
Timestamp: ${timestamp}

This request will not trigger a blockchain transaction or cost any gas fees.`
} 