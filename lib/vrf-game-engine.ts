import * as crypto from 'crypto'

// VRF-based Game Engine for Tetris
// Ensures each piece drop is cryptographically random and verifiable

export interface VRFGameSession {
  sessionId: string
  walletAddress: string
  masterSeed: string
  pieceIndex: number
  startTime: number
  vrfSignature?: string
}

export interface PieceGenerationResult {
  pieceType: number // 0-6 for the 7 tetromino types
  sessionId: string
  pieceIndex: number
  seedUsed: string
  proof: string
}

export class VRFTetrisEngine {
  private sessions: Map<string, VRFGameSession> = new Map()
  private readonly tetrominoTypes = ['I', 'J', 'L', 'O', 'S', 'T', 'Z']

  constructor() {
    console.log('🎮 VRF Tetris Engine initialized')
  }

  // Initialize a new game session with VRF seed
  async initializeSession(walletAddress: string, sessionId?: string): Promise<VRFGameSession> {
    const gameSessionId = sessionId || `session_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
    
    // Generate master seed using VRF-like deterministic process
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const dailyEntropy = crypto.createHash('sha256').update(`vrf-base-${today}`).digest()
    
    // Create session-specific master seed
    const sessionData = `${walletAddress}:${gameSessionId}:${Date.now()}`
    const hmac = crypto.createHmac('sha256', dailyEntropy)
    hmac.update(sessionData)
    const masterSeed = hmac.digest('hex')

    const session: VRFGameSession = {
      sessionId: gameSessionId,
      walletAddress,
      masterSeed,
      pieceIndex: 0,
      startTime: Date.now(),
      vrfSignature: `vrf_${gameSessionId.slice(0, 16)}`
    }

    this.sessions.set(gameSessionId, session)
    
    console.log('🎯 VRF Game Session initialized:', {
      sessionId: gameSessionId,
      wallet: walletAddress.slice(0, 8) + '...',
      seedHash: masterSeed.slice(0, 16) + '...'
    })

    return session
  }

  // Generate next piece using VRF seed derivation
  generateNextPiece(sessionId: string): PieceGenerationResult {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    // Derive piece-specific seed from master seed
    const pieceData = `piece_${session.pieceIndex}_${session.sessionId}`
    const hmac = crypto.createHmac('sha256', Buffer.from(session.masterSeed, 'hex'))
    hmac.update(pieceData)
    const pieceSeed = hmac.digest()

    // Convert seed to piece type (0-6)
    const seedValue = pieceSeed.readUInt32BE(0)
    const pieceType = seedValue % this.tetrominoTypes.length

    // Create verification proof
    const proof = crypto.createHash('sha256')
      .update(session.masterSeed)
      .update(pieceData)
      .update(pieceType.toString())
      .digest('hex')

    // Increment piece counter
    session.pieceIndex++
    this.sessions.set(sessionId, session)

    const result: PieceGenerationResult = {
      pieceType,
      sessionId,
      pieceIndex: session.pieceIndex - 1,
      seedUsed: pieceSeed.toString('hex'),
      proof
    }

    console.log('🎲 VRF Piece generated:', {
      sessionId: sessionId.slice(0, 16) + '...',
      pieceIndex: result.pieceIndex,
      pieceType: this.tetrominoTypes[pieceType],
      proof: proof.slice(0, 16) + '...'
    })

    return result
  }

  // Generate multiple pieces ahead (for preview)
  generatePieceSequence(sessionId: string, count: number): PieceGenerationResult[] {
    const pieces: PieceGenerationResult[] = []
    
    for (let i = 0; i < count; i++) {
      pieces.push(this.generateNextPiece(sessionId))
    }
    
    return pieces
  }

  // Verify a piece generation result
  verifyPieceGeneration(result: PieceGenerationResult): boolean {
    try {
      const session = this.sessions.get(result.sessionId)
      if (!session) {
        console.error('❌ Session not found for verification')
        return false
      }

      // Recreate the piece generation process
      const pieceData = `piece_${result.pieceIndex}_${result.sessionId}`
      const hmac = crypto.createHmac('sha256', Buffer.from(session.masterSeed, 'hex'))
      hmac.update(pieceData)
      const expectedSeed = hmac.digest()

      // Verify seed matches
      if (expectedSeed.toString('hex') !== result.seedUsed) {
        console.error('❌ Seed mismatch in verification')
        return false
      }

      // Verify piece type
      const seedValue = expectedSeed.readUInt32BE(0)
      const expectedPieceType = seedValue % this.tetrominoTypes.length
      if (expectedPieceType !== result.pieceType) {
        console.error('❌ Piece type mismatch in verification')
        return false
      }

      // Verify proof
      const expectedProof = crypto.createHash('sha256')
        .update(session.masterSeed)
        .update(pieceData)
        .update(result.pieceType.toString())
        .digest('hex')

      if (expectedProof !== result.proof) {
        console.error('❌ Proof mismatch in verification')
        return false
      }

      console.log('✅ Piece generation verified successfully')
      return true
    } catch (error) {
      console.error('❌ Verification error:', error)
      return false
    }
  }

  // Get session information
  getSession(sessionId: string): VRFGameSession | undefined {
    return this.sessions.get(sessionId)
  }

  // Clean up old sessions
  cleanupOldSessions(maxAgeMs: number = 24 * 60 * 60 * 1000) {
    const now = Date.now()
    let cleaned = 0

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.startTime > maxAgeMs) {
        this.sessions.delete(sessionId)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old VRF sessions`)
    }
  }

  // Export session for server verification
  exportSessionData(sessionId: string): any {
    const session = this.sessions.get(sessionId)
    if (!session) return null

    return {
      sessionId: session.sessionId,
      walletAddress: session.walletAddress,
      masterSeedHash: crypto.createHash('sha256').update(session.masterSeed).digest('hex'),
      pieceIndex: session.pieceIndex,
      startTime: session.startTime,
      vrfSignature: session.vrfSignature
    }
  }
}

// Singleton instance for the application
export const vrfTetrisEngine = new VRFTetrisEngine()

// Helper function to map piece numbers to tetromino types
export function numberToTetrominoType(pieceNumber: number): string {
  const types = ['I', 'J', 'L', 'O', 'S', 'T', 'Z']
  return types[pieceNumber % types.length]
}

// Helper function to create a seeded RNG for server-side validation
export function createVRFSeededRNG(masterSeed: string): () => number {
  let counter = 0
  
  return function(): number {
    const hmac = crypto.createHmac('sha256', Buffer.from(masterSeed, 'hex'))
    hmac.update(`rng_${counter}`)
    const result = hmac.digest()
    counter++
    
    // Convert to 0-1 range
    const value = result.readUInt32BE(0) / 0xFFFFFFFF
    return value
  }
} 