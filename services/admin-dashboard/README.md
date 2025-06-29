# Admin Dashboard Service

The Admin Dashboard is the central management interface for the GameFi platform microservices architecture. It provides comprehensive control over all services, games, and platform configuration.

## Features

### 🔧 Service Management
- **Health Monitoring**: Real-time status checking for all microservices
- **Configuration Management**: Update service configurations dynamically
- **Service Control**: Restart, reload, and manage individual services
- **Logs & Metrics**: Access service logs and performance metrics
- **Bulk Operations**: Restart all services or perform mass updates

### 🎮 Game Management
- **Game Configuration**: Create, update, and configure games
- **Game Lifecycle**: Launch, pause, and manage game states
- **Analytics Integration**: View game performance and player statistics
- **Dynamic Pricing**: Configure payment tiers and life costs
- **UI Customization**: Manage game themes and features

### ⚙️ Platform Configuration
- **Global Settings**: Maintenance mode, rate limits, feature flags
- **Blockchain Config**: Network settings, confirmation blocks, retry attempts
- **Notification Setup**: Slack, Discord, and email alert configuration
- **Security Settings**: JWT secrets, CORS origins, admin access

### 📊 Monitoring & Analytics
- **Platform Overview**: System-wide health and performance
- **Service Metrics**: Individual service performance monitoring
- **Game Analytics**: Player engagement and revenue tracking
- **Audit Logging**: Complete admin action history

## API Endpoints

### Service Management
```
GET    /api/services/status              # Get all service statuses
GET    /api/services/config/:serviceName # Get service configuration
PUT    /api/services/config/:serviceName # Update service configuration
POST   /api/services/restart/:serviceName # Restart specific service
GET    /api/services/logs/:serviceName   # Get service logs
GET    /api/services/metrics/:serviceName # Get service metrics
```

### Game Management
```
GET    /api/games                        # List all games
GET    /api/games/:gameId                # Get game configuration
POST   /api/games                        # Create new game
PUT    /api/games/:gameId                # Update game configuration
POST   /api/games/:gameId/launch         # Launch/activate game
POST   /api/games/:gameId/pause          # Pause/deactivate game
GET    /api/games/:gameId/analytics      # Get game analytics
```

### Platform Configuration
```
GET    /api/config/global                # Get global configuration
PUT    /api/config/global                # Update global configuration
POST   /api/admin/maintenance            # Enable/disable maintenance mode
POST   /api/admin/restart-all            # Restart all services
GET    /api/analytics/platform           # Get platform analytics
```

### Dashboard & Overview
```
GET    /health                           # Health check
GET    /api/overview                     # System overview
GET    /api/dashboard/summary            # Dashboard summary data
```

## Configuration

### Environment Variables
```bash
PORT=3015                               # Server port
NODE_ENV=development                    # Environment mode
DATABASE_URL=postgresql://...           # PostgreSQL connection
REDIS_URL=redis://redis:6379           # Redis connection
RABBITMQ_URL=amqp://...                # RabbitMQ connection

# Service URLs
API_GATEWAY_URL=http://api-gateway:3000
USER_SERVICE_URL=http://user-service:3010
GAME_ENGINE_URL=http://game-engine:3011
REWARDS_SERVICE_URL=http://rewards-service:3012
PAYMENT_SERVICE_URL=http://payment-service:3013
ANALYTICS_SERVICE_URL=http://analytics-service:3014
SOCIAL_HUB_URL=http://social-hub:3017

# Security
CORS_ORIGIN=*                          # CORS configuration
ADMIN_SECRET=your-admin-secret-key     # Admin authentication
```

## Database Schema

The admin dashboard uses the following tables:

- `service_configs` - Service configuration storage
- `service_actions` - Service action audit log
- `game_configs` - Game configuration and settings
- `game_actions` - Game action audit log
- `platform_config` - Global platform configuration
- `admin_sessions` - Admin user sessions
- `admin_audit_log` - Complete admin action audit trail
- `service_health` - Service health monitoring data

## Usage Examples

### Update Service Configuration
```bash
curl -X PUT http://localhost:3019/api/services/config/payment-service \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "confirmation_blocks": 2,
      "temp_address_expiry": 3600,
      "webhook_timeout": 45000
    },
    "description": "Increased security settings"
  }'
```

### Create New Game
```bash
curl -X POST http://localhost:3019/api/games \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "puzzle-game",
    "name": "Puzzle Challenge",
    "gameType": "puzzle",
    "livesConfig": {
      "free_lives_per_day": 3,
      "paid_life_cap": 8
    },
    "paymentConfig": {
      "enabled": true,
      "prices_usd": {"cheap": 0.05, "mid": 0.15, "high": 0.45}
    }
  }'
```

### Enable Maintenance Mode
```bash
curl -X POST http://localhost:3019/api/admin/maintenance \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "message": "Scheduled maintenance for platform upgrades",
    "duration": 3600
  }'
```

## Development

### Setup
```bash
cd services/admin-dashboard
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

## Docker Deployment

The admin dashboard is configured in the main docker-compose.microservices.yml file:

```yaml
admin-dashboard:
  build: ./services/admin-dashboard
  ports:
    - "3019:3015"
  environment:
    - NODE_ENV=development
    - PORT=3015
    # ... other environment variables
  depends_on:
    - postgres
    - redis
    - rabbitmq
    - api-gateway
    # ... all other services
```

## Security Considerations

1. **Authentication**: Implement proper admin authentication
2. **Authorization**: Role-based access control for different admin levels
3. **Audit Logging**: All admin actions are logged with timestamps and user info
4. **Rate Limiting**: Prevent abuse of admin endpoints
5. **Secure Communication**: Use HTTPS in production environments

## Monitoring Integration

The admin dashboard integrates with:
- **Service Health Checks**: Automatic monitoring of all microservices
- **Prometheus Metrics**: Service performance data collection
- **Log Aggregation**: Centralized logging from all services
- **Alert Systems**: Integration with Slack, Discord, and email notifications

## Future Enhancements

- **Web UI**: React-based admin interface
- **Real-time Updates**: WebSocket integration for live monitoring
- **Advanced Analytics**: Machine learning insights
- **Automated Scaling**: Dynamic service scaling based on load
- **Backup Management**: Automated database backups and recovery 