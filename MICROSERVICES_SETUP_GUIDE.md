# 🚀 Microservices Setup Guide - Complete Configuration

You're right about missing config files! I've now created all the necessary configuration files for the User Service. Here's how to get everything running.

## 📋 **Complete File Structure Created**

```
services/user-service/
├── src/
│   ├── config/
│   │   ├── logger.ts        ✅ Created
│   │   ├── database.ts      ✅ Created  
│   │   ├── redis.ts         ✅ Created
│   │   └── queue.ts         ✅ Created
│   ├── middleware/
│   │   └── errorHandler.ts  ✅ Created
│   ├── routes/
│   │   ├── auth.ts          ✅ Created
│   │   ├── profile.ts       ✅ Created
│   │   ├── wallet.ts        ✅ Created
│   │   └── health.ts        ✅ Created
│   └── server.ts            ✅ Created
├── package.json             ✅ Updated with dependencies
├── tsconfig.json            ✅ Created
├── Dockerfile              ✅ Created
└── .env.example             ✅ Created
```

## 🔧 **Step-by-Step Setup**

### **Step 1: Install Dependencies**

```bash
cd services/user-service

# Install all dependencies
npm install

# Or install specific packages
npm install express cors helmet morgan compression jsonwebtoken bcryptjs joi pg redis amqplib winston dotenv @solana/web3.js bs58 tweetnacl

# Install dev dependencies
npm install -D @types/express @types/cors @types/morgan @types/compression @types/jsonwebtoken @types/bcryptjs @types/pg @types/amqplib @types/jest @types/node typescript ts-node-dev jest ts-jest eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

### **Step 2: Create Environment File**

```bash
# Copy example environment file
cp .env.example .env

# Edit the .env file with your actual values
```

**`.env` file contents:**
```env
NODE_ENV=development
PORT=3010
DATABASE_URL=postgresql://gamefi_user:gamefi_password@localhost:5432/gamefi_platform
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://gamefi:gamefi_queue@localhost:5672
JWT_SECRET=your-super-secret-jwt-key-here
LOG_LEVEL=info
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

### **Step 3: Start Infrastructure Services**

```bash
# From the root directory
docker-compose -f docker-compose.microservices.yml up postgres redis rabbitmq -d

# Wait for services to be ready (check logs)
docker-compose -f docker-compose.microservices.yml logs -f postgres redis rabbitmq
```

### **Step 4: Create Database Schema**

```bash
# Connect to PostgreSQL and run the schema
docker exec -i $(docker-compose -f docker-compose.microservices.yml ps -q postgres) psql -U gamefi_user -d gamefi_platform < shared/database/init.sql

# Or connect manually:
docker exec -it $(docker-compose -f docker-compose.microservices.yml ps -q postgres) psql -U gamefi_user -d gamefi_platform
```

### **Step 5: Create Logs Directory**

```bash
# Create logs directory for Winston
mkdir -p services/user-service/logs
```

### **Step 6: Run the User Service**

```bash
cd services/user-service

# Development mode with hot reload
npm run dev

# Or build and run production mode
npm run build
npm start
```

## 🧪 **Testing the Service**

### **Health Check**
```bash
curl http://localhost:3010/health
```

**Expected Response:**
```json
{
  "service": "user-service",
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "dependencies": {
    "database": true,
    "redis": true,
    "messageQueue": true
  },
  "details": {
    "responseTime": "15ms"
  }
}
```

### **API Endpoints**
```bash
# Auth endpoints
curl http://localhost:3010/api/auth/status
curl -X POST http://localhost:3010/api/auth/login

# Profile endpoints  
curl http://localhost:3010/api/profile/user123

# Wallet endpoints
curl http://localhost:3010/api/wallet/balance/your-wallet-address
```

### **Service Info**
```bash
curl http://localhost:3010/
```

## 🐳 **Docker Setup (Alternative)**

### **Build Docker Image**
```bash
cd services/user-service
docker build -t gamefi-user-service .
```

### **Run with Docker**
```bash
# Run single service
docker run -p 3010:3000 \
  -e DATABASE_URL=postgresql://gamefi_user:gamefi_password@host.docker.internal:5432/gamefi_platform \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  -e RABBITMQ_URL=amqp://gamefi:gamefi_queue@host.docker.internal:5672 \
  gamefi-user-service

# Or use Docker Compose (recommended)
cd ../../
docker-compose -f docker-compose.microservices.yml up user-service
```

## 🔍 **Troubleshooting**

### **Common Issues & Solutions**

#### **1. Import Errors**
```
Cannot find module 'express' or its corresponding type declarations
```
**Solution:** Install dependencies
```bash
cd services/user-service && npm install
```

#### **2. Database Connection Failed**
```
Database connection failed: ECONNREFUSED
```
**Solution:** Start PostgreSQL
```bash
docker-compose -f docker-compose.microservices.yml up postgres -d
```

#### **3. Redis Connection Failed**
```
Redis Client Error: ECONNREFUSED
```
**Solution:** Start Redis
```bash
docker-compose -f docker-compose.microservices.yml up redis -d
```

#### **4. Port Already in Use**
```
Error: listen EADDRINUSE: address already in use :::3010
```
**Solution:** Change port in `.env` file or kill existing process
```bash
# Change port
echo "PORT=3011" >> .env

# Or kill existing process
lsof -ti:3010 | xargs kill -9
```

#### **5. Permission Denied on Logs**
```
EACCES: permission denied, open 'logs/error.log'
```
**Solution:** Create logs directory with proper permissions
```bash
mkdir -p logs && chmod 755 logs
```

## 📊 **Service Status Dashboard**

Once running, you can monitor the service:

- **Health Check**: http://localhost:3010/health
- **Readiness Check**: http://localhost:3010/health/ready  
- **Liveness Check**: http://localhost:3010/health/live
- **Service Info**: http://localhost:3010/

## 🔄 **Next Steps**

### **1. Extract More Logic**
Now that the User Service template is working, you can start extracting actual logic from your monolith:

```bash
# Copy user-related API routes from your main app
cp app/api/user/* services/user-service/src/routes/

# Copy user models and services
cp -r lib/user-related-files services/user-service/src/services/
```

### **2. Set Up API Gateway**
```bash
cd services/api-gateway
npm install
# Configure routing to User Service
```

### **3. Create More Services**
Use the User Service as a template to create other services:
```bash
# Copy the structure
cp -r services/user-service services/game-engine

# Update package.json name and ports
# Extract game-related logic
```

## 📚 **Configuration Files Explained**

### **Config Files Created:**

1. **`config/logger.ts`** - Winston logging configuration
2. **`config/database.ts`** - PostgreSQL connection pool
3. **`config/redis.ts`** - Redis client configuration  
4. **`config/queue.ts`** - RabbitMQ message queue setup
5. **`middleware/errorHandler.ts`** - Express error handling
6. **`routes/*.ts`** - Basic API route templates

### **Key Features:**

- **Health checks** for all dependencies
- **Graceful shutdown** handling
- **Request logging** and error tracking
- **Environment-based configuration**
- **TypeScript support** with path aliases
- **Docker containerization**

## 🎮 **Success!**

Your User Service should now be running at **http://localhost:3010** with all necessary configuration files!

The microservices architecture is ready for development. You can now:

1. ✅ Run individual services independently
2. ✅ Scale services based on demand  
3. ✅ Deploy services separately
4. ✅ Develop features in parallel
5. ✅ Monitor service health individually

Ready to extract more services from your monolith! 🚀 