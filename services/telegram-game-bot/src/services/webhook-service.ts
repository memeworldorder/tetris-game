import axios, { AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import Database from '@/models/database';
import config from '@/config/config';
import { WebhookEvent, WebhookEventType, WebhookStatus } from '@/models/types';

export class WebhookService {
  private db = Database;
  private static instance: WebhookService;
  private retryAttempts = 3;
  private retryDelay = 1000; // 1 second

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  async sendWebhook(
    eventType: keyof typeof config.webhooks.endpoints,
    data: any,
    customUrl?: string
  ): Promise<boolean> {
    if (!config.webhooks.enabled) {
      console.log(`Webhooks disabled, skipping ${eventType} event`);
      return true;
    }

    const webhookUrl = customUrl || config.webhooks.endpoints[eventType];
    if (!webhookUrl) {
      console.log(`No webhook URL configured for ${eventType} event`);
      return true;
    }

    const webhookEvent: Omit<WebhookEvent, 'id' | 'created_at'> = {
      event_type: this.mapEventType(eventType),
      game_id: data.game?.id,
      player_id: data.player?.id || data.playerId,
      data: data,
      webhook_url: webhookUrl,
      status: WebhookStatus.PENDING,
      attempts: 0
    };

    const eventId = await this.createWebhookEvent(webhookEvent);
    
    try {
      const success = await this.sendWebhookRequest(eventId, webhookUrl, data);
      return success;
    } catch (error) {
      console.error(`Failed to send webhook for ${eventType}:`, error);
      return false;
    }
  }

  async sendWebhookRequest(eventId: string, url: string, data: any): Promise<boolean> {
    const payload = {
      event_id: eventId,
      timestamp: new Date().toISOString(),
      signature: this.generateSignature(data),
      data: data
    };

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        await this.updateWebhookAttempt(eventId, attempt);

        const response: AxiosResponse = await axios.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': payload.signature,
            'X-Webhook-Event': payload.data.game?.type || 'unknown',
            'User-Agent': 'TelegramGameBot-Webhook/1.0'
          },
          timeout: 10000, // 10 second timeout
          validateStatus: (status) => status >= 200 && status < 300
        });

        await this.markWebhookSuccess(eventId, response.status, response.data);
        console.log(`Webhook sent successfully to ${url} on attempt ${attempt}`);
        return true;

      } catch (error: any) {
        const errorMessage = error.response?.data || error.message;
        const statusCode = error.response?.status;

        console.error(`Webhook attempt ${attempt} failed for ${url}:`, errorMessage);

        if (attempt === this.retryAttempts) {
          await this.markWebhookFailed(eventId, statusCode, errorMessage);
          return false;
        }

        // Wait before retry
        await this.delay(this.retryDelay * attempt);
      }
    }

    return false;
  }

  async retryFailedWebhooks(): Promise<void> {
    try {
      const failedWebhooks = await this.getFailedWebhooks();
      
      for (const webhook of failedWebhooks) {
        if (webhook.attempts < this.retryAttempts) {
          console.log(`Retrying webhook ${webhook.id}`);
          
          await this.updateWebhookStatus(webhook.id, WebhookStatus.RETRYING);
          
          const success = await this.sendWebhookRequest(
            webhook.id,
            webhook.webhook_url,
            webhook.data
          );

          if (!success) {
            console.error(`Retry failed for webhook ${webhook.id}`);
          }
        }
      }
    } catch (error) {
      console.error('Error retrying failed webhooks:', error);
    }
  }

  async getWebhookStats(): Promise<{
    total: number;
    pending: number;
    success: number;
    failed: number;
    retrying: number;
  }> {
    const result = await this.db.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM webhook_events 
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY status
    `);

    const stats = {
      total: 0,
      pending: 0,
      success: 0,
      failed: 0,
      retrying: 0
    };

    for (const row of result.rows) {
      const status = row.status.toLowerCase();
      const count = parseInt(row.count);
      
      stats.total += count;
      
      switch (status) {
        case 'pending':
          stats.pending = count;
          break;
        case 'success':
          stats.success = count;
          break;
        case 'failed':
          stats.failed = count;
          break;
        case 'retrying':
          stats.retrying = count;
          break;
      }
    }

    return stats;
  }

  async cleanupOldWebhooks(daysToKeep: number = 7): Promise<number> {
    if (typeof daysToKeep !== 'number' || daysToKeep <= 0) {
      throw new Error('Invalid daysToKeep value. It must be a positive number.');
    }
    const result = await this.db.query(
      `DELETE FROM webhook_events WHERE created_at < NOW() - INTERVAL $1 || ' days'`,
      [daysToKeep.toString()]
    );

    return result.rowCount || 0;
  }

  private async createWebhookEvent(webhookEvent: Omit<WebhookEvent, 'id' | 'created_at'>): Promise<string> {
    const eventId = uuidv4();
    const now = new Date();

    await this.db.query(`
      INSERT INTO webhook_events (
        id, event_type, game_id, player_id, data, webhook_url,
        status, attempts, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      eventId,
      webhookEvent.event_type,
      webhookEvent.game_id,
      webhookEvent.player_id,
      JSON.stringify(webhookEvent.data),
      webhookEvent.webhook_url,
      webhookEvent.status,
      webhookEvent.attempts,
      now
    ]);

    return eventId;
  }

  private async updateWebhookAttempt(eventId: string, attempt: number): Promise<void> {
    await this.db.query(`
      UPDATE webhook_events 
      SET attempts = $1, last_attempt = $2
      WHERE id = $3
    `, [attempt, new Date(), eventId]);
  }

  private async markWebhookSuccess(eventId: string, statusCode: number, responseBody: any): Promise<void> {
    await this.db.query(`
      UPDATE webhook_events 
      SET status = $1, response_status = $2, response_body = $3
      WHERE id = $4
    `, [WebhookStatus.SUCCESS, statusCode, JSON.stringify(responseBody), eventId]);
  }

  private async markWebhookFailed(eventId: string, statusCode?: number, errorMessage?: string): Promise<void> {
    await this.db.query(`
      UPDATE webhook_events 
      SET status = $1, response_status = $2, error_message = $3
      WHERE id = $4
    `, [WebhookStatus.FAILED, statusCode, errorMessage, eventId]);
  }

  private async updateWebhookStatus(eventId: string, status: WebhookStatus): Promise<void> {
    await this.db.query(`
      UPDATE webhook_events 
      SET status = $1
      WHERE id = $2
    `, [status, eventId]);
  }

  private async getFailedWebhooks(): Promise<WebhookEvent[]> {
    const result = await this.db.query(`
      SELECT * FROM webhook_events 
      WHERE status = $1 
      AND created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at ASC
      LIMIT 100
    `, [WebhookStatus.FAILED]);

    return result.rows.map((row: any) => ({
      id: row.id,
      event_type: row.event_type,
      game_id: row.game_id,
      player_id: row.player_id,
      data: JSON.parse(row.data),
      webhook_url: row.webhook_url,
      status: row.status,
      attempts: row.attempts,
      last_attempt: row.last_attempt,
      created_at: row.created_at,
      response_status: row.response_status,
      response_body: row.response_body,
      error_message: row.error_message
    }));
  }

  private mapEventType(eventType: string): WebhookEventType {
    const mapping: Record<string, WebhookEventType> = {
      gameStart: WebhookEventType.GAME_START,
      gameEnd: WebhookEventType.GAME_END,
      playerJoin: WebhookEventType.PLAYER_JOIN,
      numberSelected: WebhookEventType.NUMBER_SELECTED,
      winnerSelected: WebhookEventType.WINNER_SELECTED,
      gameCancelled: WebhookEventType.GAME_CANCELLED
    };

    return mapping[eventType] || WebhookEventType.GAME_START;
  }

  private generateSignature(data: any): string {
    const crypto = require('crypto');
    const payload = JSON.stringify(data);
    const secret = config.webhooks.secret;
    
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      // Test database connectivity for webhook events
      await this.db.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Webhook service health check failed:', error);
      return false;
    }
  }
}

export default WebhookService;