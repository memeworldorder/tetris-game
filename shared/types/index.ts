// Shared types across all microservices

export interface User {
  id: string
  wallet_address: string
  username?: string
  display_name?: string
  created_at: Date
  last_active: Date
}

export interface GameSession {
  id: string
  user_id: string
  game_type: string
  status: 'active' | 'completed' | 'abandoned'
  score?: number
  start_time: Date
  end_time?: Date
  vrf_seed?: string
}

export interface LeaderboardEntry {
  user_id: string
  wallet_address: string
  score: number
  rank: number
  period: 'daily' | 'weekly' | 'monthly'
}

export interface SocialAnnouncement {
  id: string
  type: 'leaderboard_winner' | 'raffle_winner' | 'milestone' | 'new_game'
  title: string
  content: string
  platforms: {
    twitter: boolean
    telegram: boolean
    discord: boolean
  }
  status: 'draft' | 'scheduled' | 'posted' | 'failed'
  created_at: Date
  posted_at?: Date
}

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

export interface ServiceHealthCheck {
  service: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  version: string
  uptime: number
  dependencies: {
    database: boolean
    redis: boolean
    queue: boolean
  }
}
