#!/bin/bash

# 🛑 Stop All Microservices
# This script stops all running microservices

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping All Microservices${NC}"
echo ""

# Check if logs directory exists
if [ ! -d "logs" ]; then
    echo -e "${YELLOW}⚠️ No logs directory found. Services may not be running.${NC}"
    exit 0
fi

# Kill all services by PID
for pidfile in logs/*.pid; do
    if [ -f "$pidfile" ]; then
        service=$(basename "$pidfile" .pid)
        pid=$(cat "$pidfile")
        
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}🛑 Stopping $service (PID: $pid)...${NC}"
            kill "$pid"
            sleep 1
            
            # Force kill if still running
            if kill -0 "$pid" 2>/dev/null; then
                echo -e "${RED}🔥 Force killing $service...${NC}"
                kill -9 "$pid"
            fi
            
            echo -e "${GREEN}✅ $service stopped${NC}"
        else
            echo -e "${YELLOW}⚠️ $service (PID: $pid) was not running${NC}"
        fi
        
        # Remove PID file
        rm "$pidfile"
    fi
done

# Clean up log files (optional)
echo ""
echo -e "${YELLOW}🧹 Cleaning up log files...${NC}"
rm -f logs/*.log

echo ""
echo -e "${GREEN}🎉 All microservices stopped successfully!${NC}" 