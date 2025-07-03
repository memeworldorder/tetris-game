import { Redis } from 'ioredis';
import config from '@/config/config';
import { Game, Player } from '@/models/types';

export class RedisService {
  private client: Redis;
  private static instance: RedisService;

  private constructor() {
    this.client = new Redis(config.redis.url, {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      db: config.redis.db
    });

    this.client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
    });
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  // Game caching methods
  async setGame(gameId: string, game: Game, ttl: number = 3600): Promise<void> {
    const key = this.getGameKey(gameId);
    await this.client.setex(key, ttl, JSON.stringify(game));
  }

  async getGame(gameId: string): Promise<Game | null> {
    const key = this.getGameKey(gameId);
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteGame(gameId: string): Promise<void> {
    const key = this.getGameKey(gameId);
    await this.client.del(key);
  }

  async setGameExpiry(gameId: string, ttl: number): Promise<void> {
    const key = this.getGameKey(gameId);
    await this.client.expire(key, ttl);
  }

  // Player session methods
  async setPlayerSession(telegramUserId: number, sessionData: any, ttl: number = 1800): Promise<void> {
    const key = this.getPlayerSessionKey(telegramUserId);
    await this.client.setex(key, ttl, JSON.stringify(sessionData));
  }

  async getPlayerSession(telegramUserId: number): Promise<any | null> {
    const key = this.getPlayerSessionKey(telegramUserId);
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deletePlayerSession(telegramUserId: number): Promise<void> {
    const key = this.getPlayerSessionKey(telegramUserId);
    await this.client.del(key);
  }

  // Game state management
  async addPlayerToGameWaitlist(gameId: string, telegramUserId: number): Promise<void> {
    const key = this.getGameWaitlistKey(gameId);
    await this.client.sadd(key, telegramUserId.toString());
    await this.client.expire(key, 3600); // 1 hour expiry
  }

  async removePlayerFromGameWaitlist(gameId: string, telegramUserId: number): Promise<void> {
    const key = this.getGameWaitlistKey(gameId);
    await this.client.srem(key, telegramUserId.toString());
  }

  async getGameWaitlist(gameId: string): Promise<number[]> {
    const key = this.getGameWaitlistKey(gameId);
    const members = await this.client.smembers(key);
    return members.map(m => parseInt(m));
  }

  async getGameWaitlistCount(gameId: string): Promise<number> {
    const key = this.getGameWaitlistKey(gameId);
    return await this.client.scard(key);
  }

  // Number selection tracking
  async markNumberAsSelected(gameId: string, number: number, playerId: string): Promise<void> {
    const key = this.getGameNumbersKey(gameId);
    await this.client.hset(key, number.toString(), playerId);
    await this.client.expire(key, 3600);
  }

  async getSelectedNumbers(gameId: string): Promise<Record<string, string>> {
    const key = this.getGameNumbersKey(gameId);
    return await this.client.hgetall(key);
  }

  async isNumberSelected(gameId: string, number: number): Promise<boolean> {
    const key = this.getGameNumbersKey(gameId);
    const result = await this.client.hexists(key, number.toString());
    return result === 1;
  }

  async getAvailableNumbers(gameId: string, maxNumber: number): Promise<number[]> {
    const key = this.getGameNumbersKey(gameId);
    const selectedNumbers = await this.client.hkeys(key);
    const selected = new Set(selectedNumbers.map(n => parseInt(n)));
    
    const available: number[] = [];
    for (let i = 1; i <= maxNumber; i++) {
      if (!selected.has(i)) {
        available.push(i);
      }
    }
    return available;
  }

  // Rate limiting
  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);
    
    // Remove expired entries
    await this.client.zremrangebyscore(key, '-inf', windowStart);
    
    // Count current requests
    const currentCount = await this.client.zcard(key);
    
    if (currentCount >= limit) {
      const resetTime = Math.ceil((await this.client.zrange(key, 0, 0, 'WITHSCORES'))[1] as number / 1000) + windowSeconds;
      return {
        allowed: false,
        remaining: 0,
        resetTime
      };
    }
    
    // Add current request
    await this.client.zadd(key, now, `${now}-${Math.random()}`);
    await this.client.expire(key, windowSeconds);
    
    return {
      allowed: true,
      remaining: limit - currentCount - 1,
      resetTime: Math.ceil(now / 1000) + windowSeconds
    };
  }

  // Statistics and analytics
  async incrementGameStat(statKey: string, value: number = 1): Promise<void> {
    const key = this.getStatsKey(statKey);
    await this.client.incrby(key, value);
  }

  async getGameStat(statKey: string): Promise<number> {
    const key = this.getStatsKey(statKey);
    const result = await this.client.get(key);
    return result ? parseInt(result) : 0;
  }

  async setTempData(key: string, data: any, ttl: number): Promise<void> {
    const tempKey = this.getTempKey(key);
    await this.client.setex(tempKey, ttl, JSON.stringify(data));
  }

  async getTempData(key: string): Promise<any | null> {
    const tempKey = this.getTempKey(key);
    const data = await this.client.get(tempKey);
    return data ? JSON.parse(data) : null;
  }

  async deleteTempData(key: string): Promise<void> {
    const tempKey = this.getTempKey(key);
    await this.client.del(tempKey);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  // Cleanup methods
  async clearGameData(gameId: string): Promise<void> {
    const keys = [
      this.getGameKey(gameId),
      this.getGameWaitlistKey(gameId),
      this.getGameNumbersKey(gameId)
    ];
    
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  async close(): Promise<void> {
    await this.client.quit();
  }

  // Private helper methods for key generation
  private getGameKey(gameId: string): string {
    return `game:${gameId}`;
  }

  private getPlayerSessionKey(telegramUserId: number): string {
    return `session:player:${telegramUserId}`;
  }

  private getGameWaitlistKey(gameId: string): string {
    return `waitlist:${gameId}`;
  }

  private getGameNumbersKey(gameId: string): string {
    return `numbers:${gameId}`;
  }

  private getStatsKey(statKey: string): string {
    return `stats:${statKey}`;
  }

  private getTempKey(key: string): string {
    return `temp:${key}`;
  }
}

export default RedisService;