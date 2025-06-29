FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Remove dev dependencies and source
RUN npm prune --production && rm -rf src tsconfig.json

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S gamefi -u 1001
RUN chown -R gamefi:nodejs /app
USER gamefi

# Expose port (different for each service)
EXPOSE 3000

# Start the service
CMD ["node", "dist/server.js"]
