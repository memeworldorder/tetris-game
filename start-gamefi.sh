#!/bin/bash

echo "🚀 STARTING YOUR GAMEFI TETRIS PLATFORM"
echo "========================================"
echo ""

# Run setup first
echo "1️⃣ Running setup..."
if [ -f "./setup-simple.sh" ]; then
    ./setup-simple.sh
else
    echo "❌ setup-simple.sh not found"
    exit 1
fi

echo ""
echo "2️⃣ Starting the application..."
echo ""
echo "🎮 Your GameFi Tetris is starting!"
echo "📱 Open: http://localhost:3000"
echo "🔗 Connect your Solana wallet and play!"
echo ""
echo "💡 To test the API separately, run: ./test-simple.sh"
echo "🛑 To stop: Press Ctrl+C"
echo ""

# Start the development server
npm run dev 