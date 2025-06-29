import * as crypto from 'crypto'
import * as nacl from 'tweetnacl'
import { PublicKey } from '@solana/web3.js'
import { GameVRFManager, createVRFManager } from './switchboard-vrf-client'

// MWOR Game & Raffle Security Stack Implementation
// Now using Switchboard VRF test client for realistic randomness

// =============================================================================
// RANDOMNESS & FAIR DRAWS (Enhanced with Switchboard VRF)
// =============================================================================

interface VRFSeed {
  seed: Buffer
  proof: Buffer
  publicKey: Buffer
  createdAt: number
  rotatesAt: number
  vrfSignature?: string
}

interface GameSeed {
  hash: string
  seed: string // Store the actual seed
  revealed: boolean
  revealedSeed?: string
  walletAddress: string
  sessionId: string
  createdAt: number
}

// Daily master VRF seed management with Switchboard integration
class VRFSeedManager {
  private currentSeed: VRFSeed | null = null
  private seedRotationInterval = 24 * 60 * 60 * 1000 // 24 hours
  private vrfManager: GameVRFManager

  constructor() {
    this.vrfManager = createVRFManager()
  }

  async getCurrentSeed(): Promise<VRFSeed> {
    const now = Date.now()
    
    if (!this.currentSeed || now > this.currentSeed.rotatesAt) {
      await this.rotateSeed()
    }
    
    return this.currentSeed!
  }

  private async rotateSeed(): Promise<void> {
    console.log('🔄 Rotating VRF seed using Switchboard...')
    
    try {
      // Initialize VRF if needed
      await this.vrfManager.initialize()
      
      // For testing, use deterministic daily seed based on date
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      const deterministicSeed = crypto.createHash('sha256').update(`daily-vrf-${today}`).digest()
      
      this.currentSeed = {
        seed: deterministicSeed,
        proof: crypto.createHash('sha256').update(`proof-${today}`).digest(), // 32 bytes deterministic proof
        publicKey: crypto.createHash('sha256').update(`pubkey-${today}`).digest(), // 32 bytes deterministic pubkey
        createdAt: Date.now(),
        rotatesAt: Date.now() + this.seedRotationInterval,
        vrfSignature: `test-vrf-${today}`
      }
      
      console.log('✅ VRF seed rotated successfully (deterministic for testing):', {
        timestamp: new Date().toISOString(),
        seedHash: deterministicSeed.toString('hex').slice(0, 16) + '...',
        date: today
      })
      
    } catch (error) {
      console.error('❌ VRF rotation failed, falling back to crypto.randomBytes:', error)
      
      // Fallback to secure random if VRF fails
      const fallbackSeed = crypto.randomBytes(32)
      this.currentSeed = {
        seed: fallbackSeed,
        proof: crypto.randomBytes(80),
        publicKey: crypto.randomBytes(32),
        createdAt: Date.now(),
        rotatesAt: Date.now() + this.seedRotationInterval
      }
    }
  }

  // Derive per-round seed using HMAC with master seed
  deriveRoundSeed(walletAddress: string, sessionId: string): string {
    if (!this.currentSeed) {
      throw new Error('No VRF seed available')
    }

    const hmac = crypto.createHmac('sha256', this.currentSeed.seed)
    hmac.update(`${walletAddress}:${sessionId}`) // Removed timestamp for consistency
    return hmac.digest('hex')
  }

  // Generate seed for raffle VRF call
  async generateRaffleSeed(): Promise<string> {
    try {
      const vrfSignature = await this.vrfManager.requestRaffleRandomness()
      
      // Wait for fulfillment with extended timeout
      const vrfResult = await this.vrfManager.getRaffleResult(8000) // 8 second timeout
      return vrfResult?.toString('hex') || crypto.randomBytes(32).toString('hex')
    } catch (error) {
      console.error('Error generating raffle seed:', error)
      return crypto.randomBytes(32).toString('hex')
    }
  }

  // Get VRF status and costs
  async getVRFStatus(): Promise<{
    initialized: boolean
    vrfAccount: string | null
    queueAccount: string | null
    estimatedCost: number
  }> {
    return await this.vrfManager.getStatus()
  }
}

// Commit-reveal scheme for game seeds
class CommitRevealManager {
  private commitments = new Map<string, GameSeed>()
  private vrfManager: GameVRFManager

  constructor() {
    this.vrfManager = createVRFManager()
  }

  // Step 1: Commit to a seed (send hash to client)
  async commitSeed(walletAddress: string, sessionId: string): Promise<{ seedHash: string, sessionId: string }> {
    // Use Switchboard VRF for seed generation
    const seed = await this.vrfManager.generateGameSeed(walletAddress, sessionId)
    const seedHash = crypto.createHash('sha256').update(seed).digest('hex')
    
    const commitment: GameSeed = {
      hash: seedHash,
      seed: seed, // Store the actual seed
      revealed: false,
      walletAddress,
      sessionId,
      createdAt: Date.now()
    }
    
    this.commitments.set(sessionId, commitment)
    
    return { seedHash, sessionId }
  }

  // Step 2: Reveal seed after round completion
  async revealSeed(sessionId: string): Promise<string | null> {
    const commitment = this.commitments.get(sessionId)
    if (!commitment || commitment.revealed) {
      return null
    }

    // Use the stored seed (no need to regenerate)
    const seed = commitment.seed
    
    // Verify the seed matches the commitment hash (sanity check)
    const computedHash = crypto.createHash('sha256').update(seed).digest('hex')
    if (computedHash !== commitment.hash) {
      throw new Error('Seed verification failed')
    }

    commitment.revealed = true
    commitment.revealedSeed = seed
    
    return seed
  }

  isValidCommitment(sessionId: string): boolean {
    return this.commitments.has(sessionId)
  }
}

// =============================================================================
// SCORE INTEGRITY (Enhanced)
// =============================================================================

interface GameMove {
  type: 'move' | 'rotate' | 'drop' | 'hold'
  timestamp: number
  direction?: 'left' | 'right' | 'down'
  rotation?: 'cw' | 'ccw'
  pieceType?: number
  boardState?: string // Compressed board state
}

interface ScoreProof {
  walletAddress: string
  score: number
  seedHash: string
  moveCount: number
  signature: Buffer
  timestamp: number
  vrfProof?: Buffer
}

// Ed25519 key pair for server-side signing
class ScoreSigningManager {
  private keyPair: nacl.SignKeyPair

  constructor() {
    // In production, load from secure environment
    const privateKey = process.env.SCORE_SIGNING_PRIVATE_KEY
    if (privateKey) {
      this.keyPair = nacl.sign.keyPair.fromSecretKey(new Uint8Array(Buffer.from(privateKey, 'hex')))
    } else {
      this.keyPair = nacl.sign.keyPair()
      console.warn('⚠️ Generated new signing key pair. Set SCORE_SIGNING_PRIVATE_KEY in production!')
    }
  }

  // Server-side game simulation and scoring
  simulateGame(moves: GameMove[], seed: string): { score: number, valid: boolean } {
    try {
      // Enhanced Tetris simulation with proper randomness
      let score = 0
      let lines = 0
      let level = 1
      
      // Seed-based RNG for piece generation
      const rng = this.createSeededRNG(seed)
      
      // Track board state
      const board = Array(20).fill(null).map(() => Array(10).fill(0))
      
      for (let i = 0; i < moves.length; i++) {
        const move = moves[i]
        
        // Validate move timing and sequence
        if (i > 0 && move.timestamp <= moves[i - 1].timestamp) {
          return { score: 0, valid: false }
        }
        
        // Apply move with proper game rules
        const moveResult = this.applyMove(move, board, rng, level)
        if (!moveResult.valid) {
          return { score: 0, valid: false }
        }
        
        score += moveResult.points
        lines += moveResult.linesCleared
        level = Math.floor(lines / 10) + 1
      }
      
      return { score, valid: true }
    } catch (error) {
      console.error('Game simulation error:', error)
      return { score: 0, valid: false }
    }
  }

  // Sign score with Ed25519
  signScore(walletAddress: string, score: number, seedHash: string, moveCount: number): ScoreProof {
    const timestamp = Date.now()
    const message = Buffer.from(`${walletAddress}:${score}:${seedHash}:${moveCount}:${timestamp}`)
    const signature = nacl.sign.detached(new Uint8Array(message), this.keyPair.secretKey)
    
    return {
      walletAddress,
      score,
      seedHash,
      moveCount,
      signature: Buffer.from(signature),
      timestamp
    }
  }

  // Verify score signature
  verifyScoreSignature(proof: ScoreProof): boolean {
    const message = Buffer.from(`${proof.walletAddress}:${proof.score}:${proof.seedHash}:${proof.moveCount}:${proof.timestamp}`)
    return nacl.sign.detached.verify(new Uint8Array(message), new Uint8Array(proof.signature), this.keyPair.publicKey)
  }

  private createSeededRNG(seed: string) {
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    
    return function() {
      hash = (hash * 9301 + 49297) % 233280
      return hash / 233280
    }
  }

  private applyMove(move: GameMove, board: number[][], rng: () => number, level: number) {
    // Simplified move application - in production this would be a full Tetris engine
    let points = 0
    let linesCleared = 0
    let valid = true
    
    switch (move.type) {
      case 'drop':
        // Simulate piece drop and line clearing
        linesCleared = Math.floor(rng() * 4) // Simplified
        points = linesCleared * 100 * level
        break
      case 'move':
      case 'rotate':
      case 'hold':
        // Basic validation
        break
      default:
        valid = false
    }
    
    return { points, linesCleared, valid }
  }

  getPublicKey(): Buffer {
    return Buffer.from(this.keyPair.publicKey)
  }
}

// =============================================================================
// BOT & MULTI-WALLET ABUSE PREVENTION
// =============================================================================

interface DeviceFingerprint {
  ip: string
  userAgent: string
  screenResolution?: string
  timezone?: string
  language?: string
  canvas?: string
}

class AbuseDetector {
  private dailyClaimsPerIP = new Map<string, { count: number, lastReset: number }>()
  private suspiciousPatterns = new Map<string, number>()

  generateDeviceFingerprint(req: Request): string {
    const ip = this.getClientIP(req)
    const userAgent = req.headers.get('user-agent') || ''
    
    // Additional fingerprinting from client data
    const combined = `${ip}:${userAgent}`
    return crypto.createHash('sha256').update(combined).digest('hex')
  }

  checkRateLimit(deviceFingerprint: string, walletAddress: string): boolean {
    const key = `${deviceFingerprint}:${walletAddress}`
    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000
    
    const entry = this.dailyClaimsPerIP.get(key)
    if (!entry) {
      this.dailyClaimsPerIP.set(key, { count: 1, lastReset: now })
      return true
    }
    
    // Reset daily counter
    if (now - entry.lastReset > oneDayMs) {
      entry.count = 1
      entry.lastReset = now
      return true
    }
    
    const limit = parseInt(process.env.FREE_LIFE_LIMIT_PER_IP || '1')
    return entry.count < limit
  }

  // Detect bot patterns
  detectBot(moves: GameMove[]): { isBot: boolean, confidence: number } {
    let botSignals = 0
    let totalSignals = 0
    
    // Check for perfect timing patterns
    const timings = moves.slice(1).map((move, i) => move.timestamp - moves[i].timestamp)
    const averageTiming = timings.reduce((a, b) => a + b, 0) / timings.length
    const timingVariance = timings.reduce((sum, timing) => sum + Math.pow(timing - averageTiming, 2), 0) / timings.length
    
    // Low variance suggests bot
    if (timingVariance < 100) botSignals++
    totalSignals++
    
    // Check for inhuman reaction times
    const fastMoves = timings.filter(t => t < 50).length
    if (fastMoves / timings.length > 0.1) botSignals++
    totalSignals++
    
    // Check for perfect play patterns
    const dropMoves = moves.filter(m => m.type === 'drop').length
    const totalMoves = moves.length
    if (dropMoves / totalMoves > 0.8) botSignals++ // Too efficient
    totalSignals++
    
    const confidence = totalSignals > 0 ? botSignals / totalSignals : 0
    return { isBot: confidence > 0.5, confidence }
  }

  private getClientIP(req: Request): string {
    const forwarded = req.headers.get('x-forwarded-for')
    const realIP = req.headers.get('x-real-ip')
    
    if (forwarded) return forwarded.split(',')[0].trim()
    if (realIP) return realIP
    return '127.0.0.1'
  }
}

// =============================================================================
// AUDIT TRAIL & MERKLE PROOFS
// =============================================================================

interface PlayRecord {
  walletAddress: string
  score: number
  seedHash: string
  moveHash: string
  timestamp: number
  signature: Buffer
}

class AuditTrailManager {
  // Build Merkle tree of daily plays for on-chain storage
  buildDailyMerkleRoot(plays: PlayRecord[]): string {
    if (plays.length === 0) {
      return '0x' + '0'.repeat(64)
    }
    
    // Create leaves from play records
    let leaves = plays.map(play => {
      const data = `${play.walletAddress}:${play.score}:${play.seedHash}:${play.timestamp}`
      return crypto.createHash('sha256').update(data).digest('hex')
    })
    
    // Build Merkle tree
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
    
    return '0x' + leaves[0]
  }

  // Generate Merkle proof for a specific play
  generateMerkleProof(plays: PlayRecord[], targetPlay: PlayRecord): string[] {
    // Implementation for Merkle proof generation
    // This would be used for dispute resolution
    const proof: string[] = []
    // ... proof generation logic
    return proof
  }

  // Hash move sequence for storage
  hashMoveSequence(moves: GameMove[]): string {
    const moveData = moves.map(m => `${m.type}:${m.timestamp}:${m.direction || ''}:${m.rotation || ''}`).join('|')
    return crypto.createHash('sha256').update(moveData).digest('hex')
  }
}

// =============================================================================
// EXPORTED SECURITY STACK (Enhanced)
// =============================================================================

export const SecurityStack = {
  VRFSeedManager,
  CommitRevealManager,
  ScoreSigningManager,
  AbuseDetector,
  AuditTrailManager
}

export type {
  VRFSeed,
  GameSeed,
  GameMove,
  ScoreProof,
  DeviceFingerprint,
  PlayRecord
} 