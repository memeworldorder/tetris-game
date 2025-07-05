# Code Improvements for Telegram Game Bot

## Immediate Code Quality Improvements

### 1. Singleton Pattern Issues

**Current Problem:**
```typescript
// Multiple getInstance() calls without proper initialization checks
RedisService.getInstance();
TelegramBotService.getInstance();
```

**Improved Implementation:**
```typescript
// services/base-service.ts
export abstract class BaseService {
  private static instances = new Map<string, any>();

  protected static getSingletonInstance<T extends BaseService>(
    className: string,
    factory: () => T
  ): T {
    if (!this.instances.has(className)) {
      this.instances.set(className, factory());
    }
    return this.instances.get(className);
  }

  abstract healthCheck(): Promise<boolean>;
  abstract close(): Promise<void>;
}

// services/redis-service.ts
export class RedisService extends BaseService {
  private static instance: RedisService;
  private constructor(private client: RedisClient) {
    super();
  }

  static getInstance(): RedisService {
    return this.getSingletonInstance('RedisService', () => {
      const client = createClient(config.redis);
      return new RedisService(client);
    });
  }
}
```

### 2. Database Connection Pooling

**Current Issue:** No proper connection pool management

**Improved Implementation:**
```typescript
// models/database.ts
import { Pool } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';

class Database {
  private pool: Pool;
  private kysely: Kysely<DatabaseSchema>;
  private isShuttingDown = false;

  constructor() {
    this.pool = new Pool({
      connectionString: config.database.url,
      max: config.database.poolSize || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      statement_timeout: 30000,
    });

    // Use Kysely for type-safe queries
    this.kysely = new Kysely<DatabaseSchema>({
      dialect: new PostgresDialect({ pool: this.pool }),
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected database pool error', err);
    });
  }

  // Type-safe query builder
  get db() {
    return this.kysely;
  }

  // Raw query with automatic retry
  async query<T = any>(
    text: string, 
    params?: any[], 
    retries = 3
  ): Promise<{ rows: T[] }> {
    for (let i = 0; i < retries; i++) {
      try {
        const client = await this.pool.connect();
        try {
          return await client.query(text, params);
        } finally {
          client.release();
        }
      } catch (error: any) {
        if (i === retries - 1 || this.isShuttingDown) throw error;
        
        // Retry on connection errors
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  }
}
```

### 3. Error Handling Improvements

**Current Issue:** Inconsistent error handling across services

**Improved Error System:**
```typescript
// utils/errors.ts
export enum ErrorCode {
  GAME_NOT_FOUND = 'GAME_NOT_FOUND',
  GAME_FULL = 'GAME_FULL',
  PLAYER_ALREADY_JOINED = 'PLAYER_ALREADY_JOINED',
  INVALID_GAME_STATE = 'INVALID_GAME_STATE',
  WALLET_NOT_VERIFIED = 'WALLET_NOT_VERIFIED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 400,
    public isOperational = true,
    public details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: new Date().toISOString(),
    };
  }
}

// Global error handler middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Log unexpected errors
  console.error('Unexpected error:', err);
  
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
  });
};
```

### 4. Async/Await Error Handling

**Current Issue:** Missing try-catch blocks in many async operations

**Solution: Async Handler Wrapper:**
```typescript
// utils/async-handler.ts
export const asyncHandler = (fn: Function) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Usage in routes
router.post('/games', asyncHandler(async (req, res) => {
  const game = await gameService.createGame(req.body);
  res.status(201).json(game);
}));
```

### 5. Input Validation

**Current Issue:** No consistent input validation

**Solution: Schema Validation:**
```typescript
// utils/validation.ts
import { z } from 'zod';

export const gameSchemas = {
  createQuizGame: z.object({
    title: z.string().min(3).max(100),
    description: z.string().max(500).optional(),
    chatId: z.number(),
    settings: z.object({
      quiz: z.object({
        questionCount: z.number().min(5).max(50).default(20),
        timePerQuestion: z.number().min(10).max(60).default(15),
        maxPlayers: z.number().min(2).max(100).default(50),
        minPlayers: z.number().min(2).max(10).default(2),
        difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
        categories: z.array(z.string()).optional(),
        autoStart: z.boolean().default(false),
        requiresWalletVerification: z.boolean().default(true),
      }),
    }),
  }),
};

// Validation middleware
export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          errors: error.errors,
        });
      }
      next(error);
    }
  };
};
```

### 6. Service Layer Refactoring

**Current Issue:** Services are doing too much (violating SRP)

**Solution: Separate Concerns:**
```typescript
// repositories/game-repository.ts
export class GameRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<Game | null> {
    const result = await this.db
      .selectFrom('games')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    
    return result ? this.mapToGame(result) : null;
  }

  async save(game: Game): Promise<void> {
    await this.db
      .insertInto('games')
      .values(this.mapToDb(game))
      .onConflict('id')
      .doUpdateSet(this.mapToDb(game))
      .execute();
  }
}

// domain/game-aggregate.ts
export class GameAggregate {
  constructor(
    private game: Game,
    private events: DomainEvent[] = []
  ) {}

  joinPlayer(player: Player): void {
    if (this.game.status !== GameStatus.WAITING_FOR_PLAYERS) {
      throw new AppError(
        ErrorCode.INVALID_GAME_STATE,
        'Game is not accepting new players'
      );
    }

    if (this.game.total_players >= this.game.max_players) {
      throw new AppError(ErrorCode.GAME_FULL, 'Game is full');
    }

    this.game.total_players++;
    this.events.push(new PlayerJoinedEvent(this.game.id, player.id));
  }

  getUncommittedEvents(): DomainEvent[] {
    return [...this.events];
  }

  markEventsAsCommitted(): void {
    this.events = [];
  }
}

// services/game-command-service.ts
export class GameCommandService {
  constructor(
    private repo: GameRepository,
    private eventBus: EventBus
  ) {}

  async joinGame(gameId: string, player: Player): Promise<void> {
    const game = await this.repo.findById(gameId);
    if (!game) {
      throw new AppError(ErrorCode.GAME_NOT_FOUND, 'Game not found');
    }

    const aggregate = new GameAggregate(game);
    aggregate.joinPlayer(player);

    await this.repo.save(aggregate.getGame());
    
    for (const event of aggregate.getUncommittedEvents()) {
      await this.eventBus.publish(event);
    }
  }
}
```

### 7. Caching Strategy Improvements

**Current Issue:** Ad-hoc caching without clear strategy

**Solution: Structured Caching Layer:**
```typescript
// services/cache-service.ts
export class CacheService {
  private readonly DEFAULT_TTL = 300; // 5 minutes
  
  constructor(
    private redis: RedisClient,
    private serializer: ISerializer = new JSONSerializer()
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    if (!data) return null;
    
    return this.serializer.deserialize<T>(data);
  }

  async set<T>(
    key: string, 
    value: T, 
    ttl: number = this.DEFAULT_TTL
  ): Promise<void> {
    const serialized = this.serializer.serialize(value);
    await this.redis.setex(key, ttl, serialized);
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // Cache-aside pattern implementation
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }
}

// Usage with decorator pattern
export function Cacheable(ttl: number = 300) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cache = CacheService.getInstance();
      const key = `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;
      
      return cache.getOrSet(key, () => method.apply(this, args), ttl);
    };
  };
}

// Example usage
class GameService {
  @Cacheable(600) // Cache for 10 minutes
  async getActiveGames(): Promise<Game[]> {
    return this.repo.findActiveGames();
  }
}
```

### 8. WebSocket Implementation Improvements

**Current Issue:** Basic Socket.IO setup without proper event handling

**Solution: Structured WebSocket Service:**
```typescript
// services/websocket-service.ts
export class WebSocketService {
  private io: Server;
  private rooms = new Map<string, Set<string>>();

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: { origin: config.corsOrigins },
      transports: ['websocket'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const user = await this.validateToken(token);
        socket.data.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);

      socket.on('join-game', (gameId: string) => 
        this.handleJoinGame(socket, gameId)
      );

      socket.on('submit-answer', (data: AnswerData) => 
        this.handleSubmitAnswer(socket, data)
      );

      socket.on('disconnect', () => 
        this.handleDisconnect(socket)
      );
    });
  }

  private async handleJoinGame(socket: Socket, gameId: string): Promise<void> {
    try {
      // Validate game exists and player can join
      const canJoin = await this.validateGameJoin(socket.data.user, gameId);
      if (!canJoin) {
        socket.emit('error', { message: 'Cannot join game' });
        return;
      }

      socket.join(`game:${gameId}`);
      
      // Track room membership
      if (!this.rooms.has(gameId)) {
        this.rooms.set(gameId, new Set());
      }
      this.rooms.get(gameId)!.add(socket.id);

      // Notify others
      socket.to(`game:${gameId}`).emit('player-joined', {
        playerId: socket.data.user.id,
        playerCount: this.rooms.get(gameId)!.size,
      });

      // Send current game state
      const gameState = await this.getGameState(gameId);
      socket.emit('game-state', gameState);
    } catch (error) {
      socket.emit('error', { message: 'Failed to join game' });
    }
  }

  // Typed event emitter
  emitToGame<T>(gameId: string, event: string, data: T): void {
    this.io.to(`game:${gameId}`).emit(event, data);
  }

  // Get connected players in a game
  getGamePlayers(gameId: string): string[] {
    return Array.from(this.rooms.get(gameId) || []);
  }
}
```

### 9. Logging Improvements

**Current Issue:** Console.log everywhere without structure

**Solution: Structured Logging:**
```typescript
// utils/logger.ts
import winston from 'winston';
import { Request } from 'express';

const logger = winston.createLogger({
  level: config.logLevel || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'telegram-game-bot' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Add request context
export const createRequestLogger = (req: Request) => {
  return logger.child({
    requestId: req.headers['x-request-id'],
    userId: req.user?.id,
    method: req.method,
    path: req.path,
  });
};

// Structured logging for game events
export class GameLogger {
  static logGameEvent(
    eventType: string,
    gameId: string,
    playerId?: string,
    metadata?: any
  ): void {
    logger.info('Game Event', {
      eventType,
      gameId,
      playerId,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }

  static logError(
    error: Error,
    context: string,
    metadata?: any
  ): void {
    logger.error('Error occurred', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      context,
      metadata,
    });
  }
}
```

### 10. Configuration Management

**Current Issue:** Configuration scattered across files

**Solution: Centralized Config with Validation:**
```typescript
// config/config.schema.ts
import { z } from 'zod';

const configSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']),
  port: z.number().min(1000).max(65535),
  
  database: z.object({
    url: z.string().url(),
    poolSize: z.number().min(5).max(100).default(20),
    ssl: z.boolean().default(true),
  }),

  redis: z.object({
    url: z.string().url(),
    password: z.string().optional(),
    db: z.number().default(0),
  }),

  telegram: z.object({
    botToken: z.string().min(1),
    adminChatId: z.string().optional(),
    webhookUrl: z.string().url().optional(),
  }),

  openai: z.object({
    apiKey: z.string().min(1),
    model: z.string().default('gpt-4-turbo-preview'),
    maxTokens: z.number().default(1000),
    temperature: z.number().min(0).max(2).default(0.7),
  }),

  games: z.object({
    quiz: z.object({
      defaultQuestions: z.number().default(20),
      timePerQuestion: z.number().default(15),
      maxPlayers: z.number().default(50),
      prizePoolAmount: z.number().default(100),
    }),
  }),
});

// config/index.ts
export const loadConfig = () => {
  const config = {
    nodeEnv: process.env.NODE_ENV,
    port: parseInt(process.env.PORT || '3020'),
    
    database: {
      url: process.env.DATABASE_URL,
      poolSize: parseInt(process.env.DB_POOL_SIZE || '20'),
      ssl: process.env.DB_SSL !== 'false',
    },
    
    // ... rest of config
  };

  // Validate configuration
  const result = configSchema.safeParse(config);
  if (!result.success) {
    console.error('Configuration validation failed:', result.error.errors);
    throw new Error('Invalid configuration');
  }

  return result.data;
};

export const config = loadConfig();
```

### 11. Testing Improvements

**Current Issue:** No tests implemented

**Solution: Comprehensive Test Suite:**
```typescript
// __tests__/services/quiz-game-service.test.ts
import { QuizGameService } from '@/services/quiz-game-service';
import { createMockDatabase } from '../mocks/database';
import { createMockRedis } from '../mocks/redis';

describe('QuizGameService', () => {
  let service: QuizGameService;
  let mockDb: any;
  let mockRedis: any;

  beforeEach(() => {
    mockDb = createMockDatabase();
    mockRedis = createMockRedis();
    service = new QuizGameService(mockDb, mockRedis);
  });

  describe('createQuizGame', () => {
    it('should create a quiz game with valid settings', async () => {
      const request = {
        title: 'Test Quiz',
        chatId: 12345,
        settings: {
          quiz: {
            questionCount: 10,
            timePerQuestion: 20,
          },
        },
      };

      const game = await service.createQuizGame(request, 'user123');

      expect(game).toMatchObject({
        type: 'QUIZ',
        status: 'CREATED',
        title: 'Test Quiz',
        total_players: 0,
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO games'),
        expect.any(Array)
      );
    });

    it('should handle OpenAI API failures gracefully', async () => {
      mockOpenAI.generateQuizQuestions.mockRejectedValue(
        new Error('API Error')
      );

      await expect(
        service.createQuizGame(request, 'user123')
      ).rejects.toThrow('Failed to generate quiz questions');
    });
  });
});
```

### 12. Performance Monitoring

**Solution: Add APM and Metrics:**
```typescript
// monitoring/metrics.ts
import { register, Counter, Histogram, Gauge } from 'prom-client';

export const metrics = {
  httpRequestDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5],
  }),

  activeGames: new Gauge({
    name: 'active_games_total',
    help: 'Number of active games',
    labelNames: ['game_type'],
  }),

  gameEvents: new Counter({
    name: 'game_events_total',
    help: 'Total number of game events',
    labelNames: ['event_type', 'game_type'],
  }),

  websocketConnections: new Gauge({
    name: 'websocket_connections_active',
    help: 'Number of active WebSocket connections',
  }),
};

// Middleware to track HTTP metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    metrics.httpRequestDuration.observe(
      {
        method: req.method,
        route: req.route?.path || 'unknown',
        status: res.statusCode,
      },
      duration
    );
  });

  next();
};

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

## Performance Optimizations

### 1. Database Query Optimization

```typescript
// Use prepared statements
const preparedStatements = {
  getGame: 'SELECT * FROM games WHERE id = $1',
  getActiveGames: 'SELECT * FROM games WHERE status IN ($1, $2) AND ended_at IS NULL',
  updateGameStatus: 'UPDATE games SET status = $1, updated_at = $2 WHERE id = $3',
};

// Batch operations
async function batchInsertQuestions(questions: Question[]): Promise<void> {
  const values = questions.map((q, index) => {
    const offset = index * 10;
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, ...)`;
  }).join(', ');

  const flatParams = questions.flatMap(q => [
    q.id, q.gameId, q.questionNumber, // ... etc
  ]);

  await db.query(
    `INSERT INTO quiz_questions (...columns) VALUES ${values}`,
    flatParams
  );
}
```

### 2. Redis Pipeline Operations

```typescript
// Use Redis pipelines for multiple operations
async function updateGameState(gameId: string, updates: GameUpdate[]): Promise<void> {
  const pipeline = redis.pipeline();

  for (const update of updates) {
    pipeline.hset(`game:${gameId}`, update.field, update.value);
  }

  pipeline.expire(`game:${gameId}`, 3600); // 1 hour TTL
  
  await pipeline.exec();
}
```

### 3. Message Queue Optimization

```typescript
// Batch webhook notifications
class WebhookBatcher {
  private queue: WebhookEvent[] = [];
  private timer: NodeJS.Timeout | null = null;

  async add(event: WebhookEvent): Promise<void> {
    this.queue.push(event);

    if (this.queue.length >= 100) {
      await this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), 1000);
    }
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, 100);
    
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    await this.sendBatch(batch);
  }
}
```

## Security Improvements

### 1. Rate Limiting per User/Endpoint

```typescript
const rateLimiters = {
  createGame: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 games per 15 minutes
    keyGenerator: (req) => req.user?.id || req.ip,
  }),

  joinGame: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 joins per minute
    keyGenerator: (req) => req.user?.id || req.ip,
  }),

  submitAnswer: rateLimit({
    windowMs: 1000, // 1 second
    max: 2, // 2 answers per second
    keyGenerator: (req) => `${req.user?.id}:${req.params.gameId}`,
  }),
};
```

### 2. Input Sanitization

```typescript
import DOMPurify from 'isomorphic-dompurify';

export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    return DOMPurify.sanitize(input, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [] 
    });
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
};
```

## Conclusion

These improvements focus on:

1. **Code Quality**: Better error handling, type safety, and separation of concerns
2. **Performance**: Optimized database queries, caching strategies, and batch operations
3. **Reliability**: Circuit breakers, retry logic, and proper connection pooling
4. **Security**: Input validation, rate limiting, and sanitization
5. **Maintainability**: Structured logging, configuration management, and testing

Implement these changes incrementally, starting with the most critical issues (error handling and database optimization) before moving to architectural improvements.