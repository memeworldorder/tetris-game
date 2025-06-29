# 🎮 GameFi Microservices Platform

This is the microservices architecture for the GameFi platform, extracted from the monolithic Next.js application.

## 🚀 Quick Start

1. **Start infrastructure services:**
   ```bash
   ./deployment/scripts/start-infrastructure.sh
   ```

2. **Start all services:**
   ```bash
   ./deployment/scripts/start-all-services.sh
   ```

3. **Access the platform:**
   - Gaming Hub: http://localhost:3001
   - API Gateway: http://localhost:3000
   - Admin Dashboard: http://localhost:3019
   - RabbitMQ Management: http://localhost:15672

## 📚 Documentation

- [Architecture Overview](MICROSERVICES_ARCHITECTURE.md)
- [Migration Guide](MICROSERVICES_MIGRATION_GUIDE.md)
- [Individual Service READMEs](services/)

## 🛠️ Development

Each service can be developed independently. See the README in each service directory for specific instructions.

## 🐳 Docker

All services are containerized and can be run with Docker Compose for local development.
