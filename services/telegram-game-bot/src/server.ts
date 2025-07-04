import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import config from '@/config/config';
import Database from '@/models/database';
import RedisService from '@/services/redis-service';
import TelegramBotService from '@/services/telegram-bot-service';
import WebhookService from '@/services/webhook-service';

// Routes
import gameRoutes from '@/routes/game-routes';
import adminRoutes from '@/routes/admin-routes';
import healthRoutes from '@/routes/health-routes';
import webhookRoutes from '@/routes/webhook-routes';

class TelegramGameBotServer {
  private app: express.Application;
  private server!: Server;
  private io!: SocketIOServer;
  private database: typeof Database;
  private redis: RedisService;
  private telegramBot: TelegramBotService;
  private webhookService: WebhookService;

  constructor() {
    this.app = express();
    this.database = Database;
    this.redis = RedisService.getInstance();
    this.telegramBot = TelegramBotService.getInstance();
    this.webhookService = WebhookService.getInstance();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.api.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Compression middleware
    this.app.use(compression());

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging in development
    if (config.nodeEnv === 'development') {
      this.app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
      });
    }

    // Rate limiting middleware (basic implementation)
    this.app.use(async (req, res, next) => {
      try {
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        const rateLimit = await this.redis.checkRateLimit(
          `api:${clientIP}`,
          config.api.rateLimit.max,
          config.api.rateLimit.windowMs / 1000
        );

        if (!rateLimit.allowed) {
          return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            resetTime: rateLimit.resetTime
          });
        }

        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': config.api.rateLimit.max.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetTime.toString()
        });

        next();
      } catch (error) {
        console.error('Rate limiting error:', error);
        next(); // Continue on error
      }
    });
  }

  private setupRoutes(): void {
    // Health check route (always first)
    this.app.use('/health', healthRoutes);

    // API routes
    this.app.use('/api/games', gameRoutes);
    this.app.use('/api/admin', adminRoutes);
    this.app.use('/api/webhooks', webhookRoutes);

    // Root route
    this.app.get('/', (req, res) => {
      res.json({
        service: 'Telegram Game Bot',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          games: '/api/games',
          admin: '/api/admin',
          webhooks: '/api/webhooks'
        }
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        availableEndpoints: ['/health', '/api/games', '/api/admin', '/api/webhooks']
      });
    });
  }

  private setupSocketIO(): void {
    this.server = new Server(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.api.corsOrigins,
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Socket.IO for real-time updates
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Join game room for real-time updates
      socket.on('join-game', (gameId: string) => {
        socket.join(`game:${gameId}`);
        console.log(`Socket ${socket.id} joined game room: ${gameId}`);
      });

      // Leave game room
      socket.on('leave-game', (gameId: string) => {
        socket.leave(`game:${gameId}`);
        console.log(`Socket ${socket.id} left game room: ${gameId}`);
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });

    // Store io instance globally for use in other services
    (global as any).io = this.io;
  }

  private setupErrorHandling(): void {
    // Express error handler
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Express error:', err);

      if (res.headersSent) {
        return next(err);
      }

      const isDevelopment = config.nodeEnv === 'development';
      
      res.status(err.status || 500).json({
        error: err.name || 'Internal Server Error',
        message: err.message || 'An unexpected error occurred',
        ...(isDevelopment && { stack: err.stack }),
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      console.error('Uncaught Exception:', error);
      this.gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown('unhandledRejection');
    });

    // Handle process termination signals
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, starting graceful shutdown...');
      this.gracefulShutdown('SIGTERM');
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, starting graceful shutdown...');
      this.gracefulShutdown('SIGINT');
    });
  }

  public async start(): Promise<void> {
    try {
      // Test database connection
      const dbHealth = await this.database.healthCheck();
      if (!dbHealth) {
        throw new Error('Database connection failed');
      }
      console.log('✅ Database connected successfully');

      // Test Redis connection
      const redisHealth = await this.redis.healthCheck();
      if (!redisHealth) {
        throw new Error('Redis connection failed');
      }
      console.log('✅ Redis connected successfully');

      // Test Telegram bot
      const telegramHealth = await this.telegramBot.healthCheck();
      if (!telegramHealth) {
        console.warn('⚠️ Telegram bot connection failed - service will continue with limited functionality');
      } else {
        console.log('✅ Telegram bot connected successfully');
      }

      // Start the server
      const port = config.port;
      this.server.listen(port, () => {
        console.log(`🚀 Telegram Game Bot server started on port ${port}`);
        console.log(`📱 Environment: ${config.nodeEnv}`);
        console.log(`🔗 Health check: http://localhost:${port}/health`);
        console.log(`📊 Admin panel: http://localhost:${port}/api/admin`);
      });

      // Start background tasks
      this.startBackgroundTasks();

    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private startBackgroundTasks(): void {
    // Retry failed webhooks every 5 minutes
    setInterval(async () => {
      try {
        await this.webhookService.retryFailedWebhooks();
      } catch (error) {
        console.error('Error retrying failed webhooks:', error);
      }
    }, 5 * 60 * 1000);

    // Cleanup old webhook events daily
    setInterval(async () => {
      try {
        const cleaned = await this.webhookService.cleanupOldWebhooks(7);
        if (cleaned > 0) {
          console.log(`Cleaned up ${cleaned} old webhook events`);
        }
      } catch (error) {
        console.error('Error cleaning up webhook events:', error);
      }
    }, 24 * 60 * 60 * 1000);

    // Log service health every hour
    setInterval(async () => {
      const health = await this.getServiceHealth();
      console.log('Service Health Check:', health);
    }, 60 * 60 * 1000);
  }

  private async getServiceHealth(): Promise<{
    database: boolean;
    redis: boolean;
    telegram: boolean;
    webhooks: boolean;
    uptime: number;
  }> {
    return {
      database: await this.database.healthCheck(),
      redis: await this.redis.healthCheck(),
      telegram: await this.telegramBot.healthCheck(),
      webhooks: await this.webhookService.healthCheck(),
      uptime: process.uptime()
    };
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    console.log(`\n🛑 Graceful shutdown initiated by ${signal}`);

    try {
      // Stop accepting new connections
      if (this.server) {
        this.server.close();
      }

      // Close Socket.IO connections
      if (this.io) {
        this.io.close();
      }

      // Stop Telegram bot
      await this.telegramBot.stop();
      console.log('✅ Telegram bot stopped');

      // Close Redis connection
      await this.redis.close();
      console.log('✅ Redis connection closed');

      // Close database connection
      await this.database.close();
      console.log('✅ Database connection closed');

      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const server = new TelegramGameBotServer();
  server.start().catch((error: unknown) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default TelegramGameBotServer;