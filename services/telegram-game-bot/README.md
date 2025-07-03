# Telegram Game Bot Microservice

A dedicated microservice for running community games through Telegram with webhook support and web-based administration.

## Features

### 🎮 Game Types
- **Pick Your Number**: Players join a raffle and select numbers, with random winner selection
- Extensible architecture for adding more game types

### 🤖 Telegram Bot Integration
- Full Telegram bot with interactive commands
- Inline keyboards for easy number selection
- Real-time game status updates
- Admin commands for game management

### 🔗 Webhook Support
- Configurable webhooks for game events
- Automatic retry mechanism for failed webhooks
- Event types: game start/end, player join, number selection, winner announcement

### 📊 Web API & Admin Panel
- RESTful API for game management
- Admin dashboard for monitoring and control
- Real-time statistics and health monitoring
- Player management and moderation tools

### 🚀 Enterprise Features
- Redis caching for high performance
- PostgreSQL database with optimized schema
- Rate limiting and security middleware
- Health checks and monitoring
- Graceful shutdown and error handling

## Quick Start

### 1. Environment Setup

Copy the environment variables from `docker-compose.microservices.yml` and configure:

```bash
# Required Telegram Configuration
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
TELEGRAM_CHAT_ID=your-main-chat-id
TELEGRAM_ADMIN_CHAT_ID=your-admin-chat-id

# Database & Redis (configured in docker-compose)
DATABASE_URL=postgresql://gamefi_user:gamefi_password@postgres:5432/gamefi_platform
REDIS_URL=redis://redis:6379

# Webhook Configuration (optional)
WEBHOOKS_ENABLED=true
WEBHOOK_SECRET=your-webhook-secret
WEBHOOK_GAME_START=https://yourapi.com/webhooks/game-start
WEBHOOK_GAME_END=https://yourapi.com/webhooks/game-end
```

### 2. Get Telegram Bot Token

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Create a new bot with `/newbot`
3. Copy the token to `TELEGRAM_BOT_TOKEN`
4. Get your chat ID by messaging your bot and checking `/api/admin/dashboard`

### 3. Run with Docker Compose

```bash
# Start all microservices including telegram-game-bot
docker-compose -f docker-compose.microservices.yml up telegram-game-bot

# Or start the entire platform
docker-compose -f docker-compose.microservices.yml up
```

### 4. Verify Installation

```bash
# Check service health
curl http://localhost:3020/health

# Check detailed health
curl http://localhost:3020/health/detailed
```

## Bot Commands

### Player Commands
- `/start` - Initialize bot and see welcome message
- `/help` - Show available commands
- `/join` - Join the current active game
- `/status` - Check current game status
- `/stats` - View your game statistics

### Admin Commands (for chat administrators)
- `/create_game [title]` - Create a new pick-your-number game
- `/cancel_game` - Cancel the current active game
- `/game_settings` - Configure game parameters

## Game Flow: Pick Your Number

1. **Game Creation**: Admin creates game with `/create_game`
2. **Player Joining**: Players join with `/join` or inline button
3. **Auto-Start**: Game starts when minimum players reached
4. **Number Selection**: Players select numbers (range auto-calculated)
5. **Winner Selection**: Random number generation determines winner(s)
6. **Announcement**: Winner announced with celebration message

### Game Settings
- **Time Limit**: How long players have to select numbers (default: 5 minutes)
- **Join Time**: How long players have to join (default: 1 minute)
- **Min/Max Players**: Game requirements (default: 2-100)
- **Number Range**: Auto-calculated as 5x player count
- **Winners**: Usually 1, configurable

## API Endpoints

### Game Management
```http
GET /api/games                    # List active games
POST /api/games                   # Create new game
GET /api/games/:id                # Get game details
POST /api/games/:id/join          # Join game
POST /api/games/:id/select-number # Select number
DELETE /api/games/:id             # Cancel game (admin)
```

### Admin Dashboard
```http
GET /api/admin/dashboard          # Admin overview
GET /api/admin/games              # All games with admin details
GET /api/admin/players            # Player management
GET /api/admin/stats              # System statistics
POST /api/admin/webhooks/retry    # Retry failed webhooks
```

### Webhooks
```http
POST /api/webhooks/test           # Test webhook endpoint
GET /api/webhooks/stats           # Webhook statistics
POST /api/webhooks/retry          # Retry failed webhooks
DELETE /api/webhooks/cleanup      # Clean old events
```

## Webhook Events

The service sends webhooks for these events:

### Game Events
```json
{
  "event_id": "uuid",
  "timestamp": "2024-01-01T12:00:00Z",
  "signature": "hmac-sha256-signature",
  "data": {
    "event_type": "game.start",
    "game": {
      "id": "game-uuid",
      "title": "Pick Your Number Game",
      "total_players": 5,
      "settings": { /* game settings */ }
    }
  }
}
```

### Event Types
- `game.start` - Game started, number selection begins
- `game.end` - Game completed with winners
- `player.join` - Player joined the game
- `number.selected` - Player selected a number
- `winner.selected` - Winner(s) determined
- `game.cancelled` - Game was cancelled

## Database Schema

The service uses these main tables:
- `players` - Telegram users and their stats
- `games` - Game instances and settings
- `game_participants` - Player participation in games
- `number_selections` - Player number choices
- `game_history` - Audit log of all game events
- `webhook_events` - Webhook delivery tracking

## Configuration

### Game Settings
```env
PICK_NUMBER_TIME_LIMIT=300        # 5 minutes for number selection
PICK_NUMBER_MIN_PLAYERS=2         # Minimum players to start
PICK_NUMBER_MAX_PLAYERS=100       # Maximum players allowed
PICK_NUMBER_MULTIPLIER=5.0        # Number range = players × multiplier
PICK_NUMBER_JOIN_TIME=60          # Time to join game
PICK_NUMBER_ANNOUNCE_INTERVAL=30  # Announcement frequency
```

### Security
```env
ADMIN_SECRET=your-admin-secret    # Admin API access
WEBHOOK_SECRET=your-webhook-key   # HMAC webhook signing
CORS_ORIGINS=*                    # CORS configuration
```

## Development

### Local Development
```bash
cd services/telegram-game-bot
npm install
npm run dev
```

### Building
```bash
npm run build
npm start
```

### Testing
```bash
npm test
```

## Monitoring & Health

### Health Endpoints
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed dependency health
- `GET /health/ready` - Kubernetes readiness probe
- `GET /health/live` - Kubernetes liveness probe

### Metrics
The service tracks:
- Active games and players
- Game completion rates
- Webhook success/failure rates
- Database and Redis performance
- Memory and CPU usage

## Troubleshooting

### Common Issues

1. **Bot not responding**
   - Check `TELEGRAM_BOT_TOKEN` is correct
   - Verify bot has permission to send messages
   - Check health endpoint: `/health/detailed`

2. **Database connection errors**
   - Verify PostgreSQL is running
   - Check database credentials
   - Ensure database schema is initialized

3. **Webhooks failing**
   - Check webhook URLs are accessible
   - Verify webhook secret matches
   - Monitor `/api/webhooks/stats` for errors

4. **Games not starting**
   - Check minimum player requirements
   - Verify players have joined successfully
   - Check game status with `/status` command

### Logs
```bash
# View service logs
docker-compose logs telegram-game-bot

# Follow logs in real-time
docker-compose logs -f telegram-game-bot
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests for new functionality
5. Update documentation
6. Submit a pull request

## License

[Add your license information here]

## Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation
- Monitor health endpoints for service status