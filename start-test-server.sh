#!/bin/bash

echo "🚀 Starting MWOR Tetris Game API Server with VRF Testing"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Are you in the project directory?"
  exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  if command -v pnpm &> /dev/null; then
    pnpm install
  elif command -v npm &> /dev/null; then
    npm install
  else
    echo "❌ Error: Neither pnpm nor npm found. Please install Node.js and npm/pnpm."
    exit 1
  fi
fi

# Create .env.local if it doesn't exist (for test environment)
if [ ! -f ".env.local" ]; then
  echo "⚙️ Creating local environment configuration..."
  cat > .env.local << EOF
# Local development environment
NODE_ENV=development

# Test database will be used automatically when these are not set
# DATABASE_URL=your_database_url_here
# SUPABASE_URL=your_supabase_url_here  
# SUPABASE_ANON_KEY=your_supabase_key_here

# Optional: Custom signing key for score verification
# SCORE_SIGNING_PRIVATE_KEY=your_private_key_here

# VRF Configuration (optional - test VRF used by default)
# VRF_QUEUE=your_vrf_queue_address
# SOLANA_RPC=https://api.devnet.solana.com
EOF
  echo "✅ Created .env.local with test configuration"
fi

echo ""
echo "🧪 Starting development server with test database..."
echo "   Database: In-memory test database (no external DB required)"
echo "   VRF: Switchboard test implementation"
echo "   Environment: Development/Testing"
echo ""

# Start the development server in the background
if command -v pnpm &> /dev/null; then
  echo "Starting with pnpm..."
  pnpm dev &
else
  echo "Starting with npm..."
  npm run dev &
fi

# Store the PID
SERVER_PID=$!

# Wait a moment for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Check if server is running
if kill -0 $SERVER_PID 2>/dev/null; then
  echo "✅ Server started successfully!"
  echo ""
  echo "🌐 Server URLs:"
  echo "   Main app: http://localhost:3000"
  echo "   Database init: http://localhost:3000/api/init-db"
  echo "   VRF tests: http://localhost:3000/api/test-vrf"
  echo ""
  
  # Try to initialize the database
  echo "🔧 Initializing test database..."
  sleep 2
  
  # Use curl if available, otherwise provide manual instructions
  if command -v curl &> /dev/null; then
    echo "📊 Setting up test data..."
    curl -s http://localhost:3000/api/init-db > /dev/null 2>&1
    echo "✅ Test database initialized"
    echo ""
    echo "🧪 Running VRF tests..."
    echo "Visit: http://localhost:3000/api/test-vrf"
    echo ""
  else
    echo "ℹ️ Manual setup: Visit http://localhost:3000/api/init-db to initialize database"
    echo ""
  fi
  
  echo "🎮 Ready for VRF testing!"
  echo ""
  echo "📖 Available endpoints:"
  echo "   GET  /api/init-db         - Check database status"
  echo "   POST /api/init-db         - Reset/initialize test data"
  echo "   GET  /api/test-vrf        - Run all VRF tests"
  echo "   POST /api/test-vrf        - Run specific VRF tests"
  echo ""
  echo "🛑 Press Ctrl+C to stop the server"
  echo ""
  
  # Wait for the server process
  wait $SERVER_PID
else
  echo "❌ Failed to start server"
  exit 1
fi 