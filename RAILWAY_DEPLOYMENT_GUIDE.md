# 🚂 Railway Deployment Troubleshooting Guide

## Common Deployment Failures and Solutions

### 1. **Build Failures**
**Problem**: TypeScript compilation errors
**Solution**:
```bash
# Check if all services have proper tsconfig.json
# Ensure build script exists: "build": "tsc"
# Verify TypeScript dependencies are installed
```

### 2. **Start Command Failures**
**Problem**: Service won't start on Railway
**Solution**:
```bash
# Ensure start script points to compiled JS: "start": "node dist/server.js"
# Check if dist/ folder is created during build
# Verify main field in package.json: "main": "dist/server.js"
```

### 3. **Port Configuration Issues**
**Problem**: Service not accessible on Railway
**Solution**:
```javascript
// Use Railway's PORT environment variable
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

### 4. **Health Check Failures**
**Problem**: Railway can't health check the service
**Solution**:
```javascript
// Add health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'service-name',
    uptime: process.uptime()
  })
})
```

### 5. **Service Communication Issues**
**Problem**: Services can't communicate on Railway
**Solution**:
```bash
# Use Railway internal networking
API_GATEWAY_URL=http://api-gateway:$PORT  # Not localhost!
USER_SERVICE_URL=http://user-service:$PORT
```

### 6. **Environment Variable Issues**
**Problem**: Missing or incorrect environment variables
**Solution**:
1. Set variables in Railway dashboard
2. Use Railway's variable references
3. Check environment loading: `dotenv.config()`

### 7. **Dependency Issues**
**Problem**: Missing dependencies during deployment
**Solution**:
```bash
# Ensure all dependencies are in package.json
# Use exact versions, not ranges
# Include @types/* for TypeScript
```

## Railway-Specific Configuration

### railway.json Template
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "sleepApplication": false,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Environment Variables for Railway
```bash
# Required for all services
DATABASE_URL=$DATABASE_URL
JWT_SECRET=$JWT_SECRET
NODE_ENV=production
PORT=$PORT

# Service discovery (Railway internal)
API_GATEWAY_URL=http://api-gateway:$PORT
USER_SERVICE_URL=http://user-service:$PORT
```

## Deployment Commands
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy a service
cd services/api-gateway
railway up

# Check service status
railway status

# View logs
railway logs

# Set environment variables
railway variables set KEY=VALUE
```

## Debugging Failed Deployments
1. Check Railway deployment logs
2. Verify build process completed
3. Check start command execution
4. Test health check endpoint locally
5. Verify environment variables are set
6. Check service-to-service communication
