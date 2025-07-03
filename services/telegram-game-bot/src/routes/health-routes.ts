import { Router, Request, Response } from 'express';
import Database from '@/models/database';
import RedisService from '@/services/redis-service';
import TelegramBotService from '@/services/telegram-bot-service';
import WebhookService from '@/services/webhook-service';

const router = Router();

// Basic health check
router.get('/', async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'telegram-game-bot',
      version: '1.0.0'
    };

    res.status(200).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Detailed health check
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const database = Database;
    const redis = RedisService.getInstance();
    const telegramBot = TelegramBotService.getInstance();
    const webhookService = WebhookService.getInstance();

    const [dbHealth, redisHealth, telegramHealth, webhookHealth] = await Promise.allSettled([
      database.healthCheck(),
      redis.healthCheck(),
      telegramBot.healthCheck(),
      webhookService.healthCheck()
    ]);

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'telegram-game-bot',
      version: '1.0.0',
      dependencies: {
        database: {
          status: dbHealth.status === 'fulfilled' && dbHealth.value ? 'healthy' : 'unhealthy',
          ...(dbHealth.status === 'rejected' && { error: dbHealth.reason?.message })
        },
        redis: {
          status: redisHealth.status === 'fulfilled' && redisHealth.value ? 'healthy' : 'unhealthy',
          ...(redisHealth.status === 'rejected' && { error: redisHealth.reason?.message })
        },
        telegram: {
          status: telegramHealth.status === 'fulfilled' && telegramHealth.value ? 'healthy' : 'unhealthy',
          ...(telegramHealth.status === 'rejected' && { error: telegramHealth.reason?.message })
        },
        webhooks: {
          status: webhookHealth.status === 'fulfilled' && webhookHealth.value ? 'healthy' : 'unhealthy',
          ...(webhookHealth.status === 'rejected' && { error: webhookHealth.reason?.message })
        }
      }
    };

    // Determine overall status
    const allHealthy = Object.values(health.dependencies).every(dep => dep.status === 'healthy');
    if (!allHealthy) {
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);

  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Readiness check (for Kubernetes/Docker)
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const database = Database;
    const redis = RedisService.getInstance();

    const [dbReady, redisReady] = await Promise.all([
      database.healthCheck(),
      redis.healthCheck()
    ]);

    if (dbReady && redisReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        dependencies: {
          database: dbReady,
          redis: redisReady
        }
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Liveness check (for Kubernetes/Docker)
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;