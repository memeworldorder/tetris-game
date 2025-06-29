#!/bin/bash

echo "🔧 FIXING NPM INSTALLATION ISSUES"
echo "=================================="
echo ""

# Stop any running processes
echo "🛑 Stopping any running processes..."
pkill -f "npm" 2>/dev/null || true

# Clean up corrupted files
echo "🧹 Cleaning up corrupted files..."
rm -rf node_modules package-lock.json .npm 2>/dev/null || true

# Clear npm cache
echo "🗑️  Clearing npm cache..."
npm cache clean --force 2>/dev/null || true

# Fix npm registry issues
echo "🔗 Checking npm registry..."
npm config set registry https://registry.npmjs.org/

# Check Node.js version
echo "🔍 Checking Node.js version..."
node --version
npm --version

echo ""
echo "🔄 Attempting installation with multiple methods..."
echo ""

# Method 1: Standard install
echo "1️⃣ Trying standard npm install..."
if npm install; then
    echo "✅ Success with standard install!"
    exit 0
fi

# Method 2: Legacy peer deps
echo "2️⃣ Trying with --legacy-peer-deps..."
if npm install --legacy-peer-deps; then
    echo "✅ Success with legacy peer deps!"
    exit 0
fi

# Method 3: Force install
echo "3️⃣ Trying with --force..."
if npm install --force; then
    echo "✅ Success with --force!"
    exit 0
fi

# Method 4: Both flags
echo "4️⃣ Trying with both --legacy-peer-deps and --force..."
if npm install --legacy-peer-deps --force; then
    echo "✅ Success with both flags!"
    exit 0
fi

# Method 5: Try yarn if available
if command -v yarn &> /dev/null; then
    echo "5️⃣ Trying with Yarn..."
    if yarn install; then
        echo "✅ Success with Yarn!"
        exit 0
    fi
fi

# Method 6: Try pnpm if available
if command -v pnpm &> /dev/null; then
    echo "6️⃣ Trying with pnpm..."
    if pnpm install; then
        echo "✅ Success with pnpm!"
        exit 0
    fi
fi

echo ""
echo "❌ All automatic fixes failed."
echo ""
echo "🔧 Manual solutions to try:"
echo ""
echo "1. Update Node.js:"
echo "   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
echo "   sudo apt-get install -y nodejs"
echo ""
echo "2. Use alternative package manager:"
echo "   npm install -g yarn"
echo "   yarn install"
echo ""
echo "3. Install with specific npm version:"
echo "   npm install -g npm@latest"
echo "   npm install --legacy-peer-deps"
echo ""
echo "4. Skip dependency resolution:"
echo "   npm install --no-optional --legacy-peer-deps"
echo ""
echo "💡 Your current setup:"
echo "   Node.js: $(node --version)"
echo "   npm: $(npm --version)"
echo "   OS: $(uname -a)"
echo ""
echo "🆘 If nothing works, try the manual approach:"
echo "   1. Copy the environment file from setup-simple.sh"
echo "   2. Install dependencies manually one by one"
echo "   3. Or use the Docker approach instead"
echo "" 