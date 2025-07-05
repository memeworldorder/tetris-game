import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { v4 as uuidv4 } from 'uuid';
import Database from '@/models/database';
import RedisService from './redis-service';
import config from '@/config/config';
import { WalletVerification } from '@/models/types';

export class WalletVerificationService {
  private connection: Connection;
  private db = Database;
  private redis = RedisService.getInstance();
  private static instance: WalletVerificationService;

  private constructor() {
    this.connection = new Connection(config.solana.rpcUrl, 'confirmed');
  }

  public static getInstance(): WalletVerificationService {
    if (!WalletVerificationService.instance) {
      WalletVerificationService.instance = new WalletVerificationService();
    }
    return WalletVerificationService.instance;
  }

  async verifyWalletOwnership(
    playerId: string,
    walletAddress: string,
    requiredBalance: number = config.solana.minTokenBalance
  ): Promise<{ verified: boolean; balance: number; verification?: WalletVerification }> {
    try {
      // Validate wallet address
      let walletPubkey: PublicKey;
      try {
        walletPubkey = new PublicKey(walletAddress);
      } catch {
        return { verified: false, balance: 0 };
      }

      // Check cache first
      const cacheKey = `wallet:${walletAddress}:${config.solana.tokenAddress}`;
      const cachedBalance = await this.redis.getTempData(cacheKey);
      if (cachedBalance !== null) {
        const balance = parseFloat(cachedBalance);
        return {
          verified: balance >= requiredBalance,
          balance
        };
      }

      // Get token balance
      const tokenBalance = await this.getTokenBalance(walletAddress, config.solana.tokenAddress);
      
      // Cache the balance
      await this.redis.setTempData(cacheKey, tokenBalance.toString(), config.solana.verificationCacheDuration);

      // Store verification in database
      const verification = await this.storeVerification(
        playerId,
        walletAddress,
        tokenBalance,
        tokenBalance >= requiredBalance
      );

      return {
        verified: tokenBalance >= requiredBalance,
        balance: tokenBalance,
        verification
      };
    } catch (error) {
      console.error('Error verifying wallet:', error);
      return { verified: false, balance: 0 };
    }
  }

  async getTokenBalance(walletAddress: string, tokenAddress: string): Promise<number> {
    try {
      const walletPubkey = new PublicKey(walletAddress);
      const tokenMintPubkey = new PublicKey(tokenAddress);

      // Get the associated token account
      const associatedTokenAddress = await getAssociatedTokenAddress(
        tokenMintPubkey,
        walletPubkey
      );

      // Get token account info
      const tokenAccountInfo = await this.connection.getAccountInfo(associatedTokenAddress);
      
      if (!tokenAccountInfo) {
        return 0; // No token account means 0 balance
      }

      // Parse token account data
      const tokenBalance = await this.connection.getTokenAccountBalance(associatedTokenAddress);
      
      // Convert to number (considering decimals)
      const balance = parseFloat(tokenBalance.value.uiAmount?.toString() || '0');
      
      return balance;
    } catch (error) {
      console.error('Error getting token balance:', error);
      return 0;
    }
  }

  async storeVerification(
    playerId: string,
    walletAddress: string,
    balance: number,
    isVerified: boolean
  ): Promise<WalletVerification> {
    const verificationId = uuidv4();
    const now = new Date();

    // Check if verification already exists
    const existingResult = await this.db.query(
      `SELECT * FROM wallet_verifications 
       WHERE player_id = $1 AND wallet_address = $2 AND token_address = $3`,
      [playerId, walletAddress, config.solana.tokenAddress]
    );

    if (existingResult.rows.length > 0) {
      // Update existing verification
      const updateResult = await this.db.query(
        `UPDATE wallet_verifications 
         SET token_balance = $1, is_verified = $2, last_checked_at = $3, verified_at = $4
         WHERE player_id = $5 AND wallet_address = $6 AND token_address = $7
         RETURNING *`,
        [balance, isVerified, now, isVerified ? now : null, playerId, walletAddress, config.solana.tokenAddress]
      );
      return this.mapRowToVerification(updateResult.rows[0]);
    }

    // Create new verification
    const insertResult = await this.db.query(
      `INSERT INTO wallet_verifications (
        id, player_id, wallet_address, token_address, token_symbol,
        token_balance, is_verified, verified_at, last_checked_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        verificationId,
        playerId,
        walletAddress,
        config.solana.tokenAddress,
        config.solana.tokenSymbol,
        balance,
        isVerified,
        isVerified ? now : null,
        now,
        now
      ]
    );

    return this.mapRowToVerification(insertResult.rows[0]);
  }

  async getPlayerVerification(playerId: string): Promise<WalletVerification | null> {
    const result = await this.db.query(
      `SELECT * FROM wallet_verifications 
       WHERE player_id = $1 AND token_address = $2 AND is_verified = true
       ORDER BY verified_at DESC
       LIMIT 1`,
      [playerId, config.solana.tokenAddress]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToVerification(result.rows[0]);
  }

  async getVerifiedWalletAddress(playerId: string): Promise<string | null> {
    const verification = await this.getPlayerVerification(playerId);
    return verification?.walletAddress || null;
  }

  async isPlayerVerified(playerId: string): Promise<boolean> {
    const verification = await this.getPlayerVerification(playerId);
    
    if (!verification || !verification.isVerified) {
      return false;
    }

    // Check if verification is still fresh (within cache duration)
    const now = new Date();
    const lastChecked = new Date(verification.lastCheckedAt);
    const timeDiff = (now.getTime() - lastChecked.getTime()) / 1000;

    if (timeDiff > config.solana.verificationCacheDuration) {
      // Re-verify if cache expired
      const { verified } = await this.verifyWalletOwnership(
        playerId,
        verification.walletAddress
      );
      return verified;
    }

    return true;
  }

  async removeVerification(playerId: string, walletAddress: string): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM wallet_verifications 
       WHERE player_id = $1 AND wallet_address = $2`,
      [playerId, walletAddress]
    );

    return (result.rowCount || 0) > 0;
  }

  async getVerificationStats(): Promise<{
    totalVerifications: number;
    activeVerifications: number;
    totalBalance: number;
    averageBalance: number;
  }> {
    const result = await this.db.query(`
      SELECT 
        COUNT(*) as total_verifications,
        COUNT(*) FILTER (WHERE is_verified = true) as active_verifications,
        SUM(token_balance) as total_balance,
        AVG(token_balance) as average_balance
      FROM wallet_verifications
      WHERE token_address = $1
    `, [config.solana.tokenAddress]);

    const row = result.rows[0];
    return {
      totalVerifications: parseInt(row.total_verifications) || 0,
      activeVerifications: parseInt(row.active_verifications) || 0,
      totalBalance: parseFloat(row.total_balance) || 0,
      averageBalance: parseFloat(row.average_balance) || 0
    };
  }

  private mapRowToVerification(row: any): WalletVerification {
    return {
      id: row.id,
      playerId: row.player_id,
      walletAddress: row.wallet_address,
      tokenAddress: row.token_address,
      tokenSymbol: row.token_symbol,
      tokenBalance: parseFloat(row.token_balance),
      isVerified: row.is_verified,
      verifiedAt: row.verified_at,
      lastCheckedAt: row.last_checked_at
    };
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const blockHeight = await this.connection.getBlockHeight();
      return blockHeight > 0;
    } catch (error) {
      console.error('Wallet verification service health check failed:', error);
      return false;
    }
  }
}

export default WalletVerificationService;