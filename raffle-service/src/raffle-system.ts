// TODO: This file is temporarily copied from the monolith for extraction purposes.
// It exceeds the 150-line guideline; we will refactor it into smaller modules
// once all raffle logic is running inside raffle-service.

/* eslint-disable */

import { supabase } from './supabase'
import * as crypto from 'crypto'
import { GameVRFManager, createVRFManager } from './switchboard-vrf-client'
import { getTelegramBot } from './telegram-bot'
import type { WinnerReveal } from './telegram-bot'

// MWOR Game & Raffle - Ticket Distribution Logic Implementation

// =============================================================================
// TICKET DISTRIBUTION CONFIGURATION
// =============================================================================

interface RaffleConfig {
  leaderboardSlicePercent: number // Top % of wallets that qualify (default: 25%)
  ticketTiers: {
    rank1: number         // 1st place tickets (default: 25)
    ranks2to5: number     // 2-5 place tickets each (default: 15)
    ranks6to10: number    // 6-10 place tickets each (default: 10)  
    remaining: number     // 11%-25% tickets each (default: 1)
  }
  maxTicketsPerWallet: number // Hard cap per wallet per day (default: 25)
  oneScorePerWallet: boolean  // Only highest score counts (default: true)
}

const DEFAULT_RAFFLE_CONFIG: RaffleConfig = {
  leaderboardSlicePercent: 25,
  ticketTiers: {
    rank1: 25,
    ranks2to5: 15,
    ranks6to10: 10,
    remaining: 1
  },
  maxTicketsPerWallet: 25,
  oneScorePerWallet: true
}

// =============================================================================
// LEADERBOARD & QUALIFICATION LOGIC
// =============================================================================

interface DailyScore {
  wallet: string
  score: number
  timestamp: string
  moveHash: string
  seedHash: string
}

interface QualifiedWallet {
  wallet: string
  score: number
  rank: number
  tickets: number
  tier: 'rank1' | 'ranks2to5' | 'ranks6to10' | 'remaining'
}

interface RaffleTicket {
  walletAddress: string
  ticketNumber: number
  tier: string
  score: number
  rank: number
}

interface RaffleQualification {
  walletAddress: string
  rank: number
  score: number
  tickets: number
  merkleProof: string[]
}

class RaffleTicketManager {
  private config: RaffleConfig
  private vrfManager: GameVRFManager

  constructor(config: RaffleConfig = DEFAULT_RAFFLE_CONFIG) {
    this.config = config
    this.vrfManager = createVRFManager()
  }

  // Get today's qualified wallets based on top scores
  async getDailyQualifiedWallets(): Promise<QualifiedWallet[]> {
    const utcMidnight = new Date()
    utcMidnight.setUTCHours(0, 0, 0, 0)

    // Get all scores from today, one per wallet (highest only)
    const { data: todayScores, error } = await supabase
      .from('plays')
      .select('wallet, score, created_at, seed_hash, move_hash')
      .gte('created_at', utcMidnight.toISOString())
      .order('score', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch today's scores: ${error.message}`)
    }

    if (!todayScores || todayScores.length === 0) {
      return []
    }

    // Group by wallet and take highest score per wallet
    const walletBestScores = new Map<string, DailyScore>()
    
    for (const play of todayScores) {
      const existing = walletBestScores.get(play.wallet)
      if (!existing || play.score > existing.score) {
        walletBestScores.set(play.wallet, {
          wallet: play.wallet,
          score: play.score,
          timestamp: play.created_at,
          moveHash: play.move_hash || '',
          seedHash: play.seed_hash
        })
      }
    }

    // Convert to array and sort by score
    const uniqueScores = Array.from(walletBestScores.values())
      .sort((a, b) => b.score - a.score)

    // Calculate qualification threshold (top 25%)
    const totalUniqueWallets = uniqueScores.length
    const qualificationCount = Math.ceil((totalUniqueWallets * this.config.leaderboardSlicePercent) / 100)
    
    // Take top qualificationCount wallets
    const qualifiedScores = uniqueScores.slice(0, qualificationCount)

    // Assign ranks and tickets
    return qualifiedScores.map((score, index) => {
      const rank = index + 1
      const tier = this.determineTier(rank)
      const baseTickets = this.getTicketsForTier(tier)
      const tickets = Math.min(baseTickets, this.config.maxTicketsPerWallet)

      return {
        wallet: score.wallet,
        score: score.score,
        rank,
        tickets,
        tier
      }
    })
  }

  // Determine which tier a rank belongs to
  private determineTier(rank: number): 'rank1' | 'ranks2to5' | 'ranks6to10' | 'remaining' {
    if (rank === 1) return 'rank1'
    if (rank >= 2 && rank <= 5) return 'ranks2to5'
    if (rank >= 6 && rank <= 10) return 'ranks6to10'
    return 'remaining'
  }

  // Get ticket count for a tier
  private getTicketsForTier(tier: 'rank1' | 'ranks2to5' | 'ranks6to10' | 'remaining'): number {
    switch (tier) {
      case 'rank1': return this.config.ticketTiers.rank1
      case 'ranks2to5': return this.config.ticketTiers.ranks2to5
      case 'ranks6to10': return this.config.ticketTiers.ranks6to10
      case 'remaining': return this.config.ticketTiers.remaining
      default: return 0
    }
  }

  // Generate all raffle tickets for qualified wallets
  generateRaffleTickets(qualifiedWallets: QualifiedWallet[]): RaffleTicket[] {
    const tickets: RaffleTicket[] = []
    let ticketNumber = 1

    for (const wallet of qualifiedWallets) {
      for (let i = 0; i < wallet.tickets; i++) {
        tickets.push({
          walletAddress: wallet.wallet,
          ticketNumber: ticketNumber++,
          tier: wallet.tier,
          score: wallet.score,
          rank: wallet.rank
        })
      }
    }

    return tickets
  }

  // Calculate total ticket budget for the day
  calculateTicketBudget(qualifiedWallets: QualifiedWallet[]): number {
    const totalTickets = qualifiedWallets.reduce((sum, wallet) => sum + wallet.tickets, 0)
    return totalTickets
  }

  // Update configuration (for DAO governance)
  updateConfig(newConfig: Partial<RaffleConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  getConfig(): RaffleConfig {
    return { ...this.config }
  }

  // Calculate qualification and ticket distribution (top 25% get tickets)
  async calculateQualification(scores: { walletAddress: string, score: number }[]): Promise<RaffleQualification[]> {
    console.log('🎟️ Calculating raffle qualifications...')
    
    // Sort by score descending
    const sortedScores = [...scores].sort((a, b) => b.score - a.score)
    
    // Get top 25%
    const qualificationCutoff = Math.ceil(sortedScores.length * 0.25)
    const qualifiedScores = sortedScores.slice(0, qualificationCutoff)
    
    console.log(`📊 Qualification stats:`, {
      totalPlayers: scores.length,
      qualifiedPlayers: qualifiedScores.length,
      cutoffPercentage: 25,
      minQualifyingScore: qualifiedScores[qualifiedScores.length - 1]?.score || 0
    })

    // Calculate tickets with tiered distribution
    const qualifications: RaffleQualification[] = []
    
    for (let i = 0; i < qualifiedScores.length; i++) {
      const rank = i + 1
      const player = qualifiedScores[i]
      
      // Tiered ticket distribution
      let tickets = 1 // Base tickets for qualified players
      
      if (rank === 1) {
        tickets = 25 // 1st place gets 25 tickets
      } else if (rank >= 2 && rank <= 5) {
        tickets = 15 // 2nd-5th place get 15 tickets
      } else if (rank >= 6 && rank <= 10) {
        tickets = 10 // 6th-10th place get 10 tickets
      }
      // Everyone else gets 1 ticket
      
      qualifications.push({
        walletAddress: player.walletAddress,
        rank,
        score: player.score,
        tickets,
        merkleProof: [] // Will be populated later
      })
    }
    
    console.log('🎫 Ticket distribution:', {
      rank1Tickets: qualifications.find(q => q.rank === 1)?.tickets || 0,
      rank2to5Tickets: qualifications.filter(q => q.rank >= 2 && q.rank <= 5).reduce((sum, q) => sum + q.tickets, 0),
      rank6to10Tickets: qualifications.filter(q => q.rank >= 6 && q.rank <= 10).reduce((sum, q) => sum + q.tickets, 0),
      remainingTickets: qualifications.filter(q => q.rank > 10).reduce((sum, q) => sum + q.tickets, 0),
      totalTickets: qualifications.reduce((sum, q) => sum + q.tickets, 0)
    })
    
    return qualifications
  }

  // Generate Merkle proofs for qualified wallets
  generateMerkleProofs(qualifications: RaffleQualification[]): RaffleQualification[] {
    console.log('🌳 Generating Merkle proofs for qualified wallets...')
    
    // Create leaves for Merkle tree
    const leaves = qualifications.map(q => {
      const data = `${q.walletAddress}:${q.rank}:${q.score}:${q.tickets}`
      return crypto.createHash('sha256').update(data).digest('hex')
    })
    
    // For each qualification, generate its Merkle proof
    const withProofs = qualifications.map((qualification, index) => {
      const proof = this.generateMerkleProof(leaves, index)
      return {
        ...qualification,
        merkleProof: proof
      }
    })
    
    console.log('✅ Merkle proofs generated for', withProofs.length, 'qualified wallets')
    return withProofs
  }

  private generateMerkleProof(leaves: string[], targetIndex: number): string[] {
    const proof: string[] = []
    let currentLevel = [...leaves]
    let currentIndex = targetIndex
    
    while (currentLevel.length > 1) {
      const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1
      
      if (siblingIndex < currentLevel.length) {
        proof.push(currentLevel[siblingIndex])
      }
      
      const nextLevel: string[] = []
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i]
        const right = currentLevel[i + 1] || left
        const hash = crypto.createHash('sha256').update(left + right).digest('hex')
        nextLevel.push(hash)
      }
      
      currentLevel = nextLevel
      currentIndex = Math.floor(currentIndex / 2)
    }
    
    return proof
  }
}

// =============================================================================
// MERKLE TREE FOR QUALIFIED WALLETS
// =============================================================================

interface MerkleLeaf {
  wallet: string
  score: number
  tickets: number
  rank: number
  hash: string
}

class QualifiedWalletsMerkleTree {
  private tree: string[] = []
  private leaves: string[] = []
  
  // Build Merkle tree from qualified wallets
  buildTree(qualifications: RaffleQualification[]): string {
    console.log('🏗️ Building qualified wallets Merkle tree...')
    
    // Create leaves
    this.leaves = qualifications.map(q => {
      const data = `${q.walletAddress}:${q.rank}:${q.score}:${q.tickets}`
      return crypto.createHash('sha256').update(data).digest('hex')
    })
    
    // Build tree bottom-up
    let currentLevel = [...this.leaves]
    this.tree = [...currentLevel]
    
    while (currentLevel.length > 1) {
      const nextLevel: string[] = []
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i]
        const right = currentLevel[i + 1] || left
        const hash = crypto.createHash('sha256').update(left + right).digest('hex')
        nextLevel.push(hash)
        this.tree.push(hash)
      }
      currentLevel = nextLevel
    }
    
    const merkleRoot = currentLevel[0] || '0x' + '0'.repeat(64)
    console.log('✅ Merkle tree built. Root:', merkleRoot.slice(0, 16) + '...')
    
    return merkleRoot
  }
  
  // Verify a Merkle proof
  verifyProof(walletAddress: string, rank: number, score: number, tickets: number, proof: string[]): boolean {
    const leafData = `${walletAddress}:${rank}:${score}:${tickets}`
    let hash = crypto.createHash('sha256').update(leafData).digest('hex')
    
    for (const proofElement of proof) {
      hash = crypto.createHash('sha256').update(hash + proofElement).digest('hex')
    }
    
    return this.tree.includes(hash)
  }
  
  getRoot(): string {
    return this.tree[this.tree.length - 1] || '0x' + '0'.repeat(64)
  }
}

// =============================================================================
// VRF-BASED WINNER SELECTION
// =============================================================================

interface RaffleResult {
  winners: string[]
  vrfSeed: string
  vrfSignature: string
  vrfProof?: Buffer
  totalTickets: number
  drawTimestamp: number
  merkleRoot: string
  verified: boolean
}

class RaffleDrawManager {
  private vrfManager: GameVRFManager
  private initialized = false

  constructor() {
    this.vrfManager = createVRFManager()
  }
}