#!/bin/bash

# Kobo Reader Auto-Sync Script (Improved)
# Detects Kobo device, backs up database, and opens the React app

set -e

# Configuration
BACKUP_DIR="$HOME/kobo-backups"
PROJECT_DIR="/Users/Tony/dev/kobo"
DB_DEST_PATH="$PROJECT_DIR/public/KoboReader.sqlite"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Kobo Reader Auto-Sync Script      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
echo ""

# Function to find Kobo device
find_kobo() {
    local found_path=""
    
    # Check common mount points
    for volume in /Volumes/*; do
        if [ -d "$volume" ]; then
            # Check for Kobo-specific files
            if [ -f "$volume/.kobo/KoboReader.sqlite" ] || \
               [ -f "$volume/.kobo/version" ] || \
               [ -d "$volume/.kobo" ]; then
                # Double-check it's actually a Kobo
                if [ -f "$volume/.kobo/KoboReader.sqlite" ]; then
                    found_path="$volume"
                    break
                fi
            fi
        fi
    done
    
    if [ -n "$found_path" ]; then
        echo "$found_path"
        return 0
    fi
    
    return 1
}

# Function to wait for Kobo device
wait_for_kobo() {
    local max_attempts=60  # Wait up to 60 seconds
    local attempt=0
    
    echo -e "${YELLOW}⏳ Waiting for Kobo device...${NC}"
    while [ $attempt -lt $max_attempts ]; do
        kobo_path=$(find_kobo)
        if [ $? -eq 0 ]; then
            echo "$kobo_path"
            return 0
        fi
        # Show progress every 5 seconds
        if [ $((attempt % 5)) -eq 0 ] && [ $attempt -gt 0 ]; then
            echo -e "${YELLOW}   Still waiting... ($attempt seconds)${NC}"
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    
    return 1
}

# Main execution
if [ "$1" = "--wait" ]; then
    KOBO_PATH=$(wait_for_kobo)
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Kobo device not found after 60 seconds${NC}"
        exit 1
    fi
elif [ -n "$1" ]; then
    # Use provided path
    KOBO_PATH="$1"
    if [ ! -d "$KOBO_PATH" ]; then
        echo -e "${RED}❌ Invalid path: $KOBO_PATH${NC}"
        exit 1
    fi
else
    # Immediate check
    KOBO_PATH=$(find_kobo)
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Kobo device not found.${NC}"
        echo ""
        echo -e "${YELLOW}Available volumes:${NC}"
        ls -1 /Volumes/ 2>/dev/null | grep -v "^\.$" | while read vol; do
            echo "  📁 /Volumes/$vol"
        done
        echo ""
        echo -e "${YELLOW}💡 Options:${NC}"
        echo "  1. Run with --wait to wait for device: ./kobo-sync-improved.sh --wait"
        echo "  2. Provide path manually: ./kobo-sync-improved.sh /Volumes/KOBOeReader"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Found Kobo at: $KOBO_PATH${NC}"
echo ""

# Check if database exists on device
DB_SOURCE="$KOBO_PATH/.kobo/KoboReader.sqlite"
if [ ! -f "$DB_SOURCE" ]; then
    echo -e "${RED}❌ Database not found at: $DB_SOURCE${NC}"
    echo -e "${YELLOW}Available files in .kobo:${NC}"
    ls -la "$KOBO_PATH/.kobo/" 2>/dev/null | head -10 || echo "  (directory not accessible)"
    exit 1
fi

echo -e "${GREEN}📦 Database found${NC}"
DB_SIZE_SOURCE=$(du -h "$DB_SOURCE" | cut -f1)
echo -e "   Source size: $DB_SIZE_SOURCE"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}📥 Creating backup...${NC}"

# Backup existing database if it exists
if [ -f "$DB_DEST_PATH" ]; then
    BACKUP_FILE="$BACKUP_DIR/KoboReader_$TIMESTAMP.sqlite"
    cp "$DB_DEST_PATH" "$BACKUP_FILE"
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "   ✅ Backed up to: $BACKUP_FILE ($BACKUP_SIZE)"
else
    echo -e "   ℹ️  No existing database to backup"
fi

# Copy database from Kobo
echo ""
echo -e "${GREEN}📥 Copying database from Kobo...${NC}"
cp "$DB_SOURCE" "$DB_DEST_PATH"

# Verify copy
if [ ! -f "$DB_DEST_PATH" ]; then
    echo -e "${RED}❌ Failed to copy database${NC}"
    exit 1
fi

DB_SIZE_DEST=$(du -h "$DB_DEST_PATH" | cut -f1)
echo -e "   ✅ Copied successfully ($DB_SIZE_DEST)"
echo ""

# Start React app
echo -e "${GREEN}🚀 Starting React app...${NC}"
cd "$PROJECT_DIR"

# Check if dev server is running
if lsof -ti:3000 > /dev/null 2>&1; then
    echo -e "   ℹ️  Dev server already running"
else
    echo -e "   ⚙️  Starting dev server..."
    # Start in background and redirect output
    nohup npm run dev > /tmp/kobo-dev-server.log 2>&1 &
    DEV_PID=$!
    echo -e "   ✅ Started (PID: $DEV_PID)"
    
    # Wait for server to be ready
    echo -e "   ⏳ Waiting for server to start..."
    for i in {1..10}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            break
        fi
        sleep 1
    done
fi

# Open browser
sleep 1
echo -e "   🌐 Opening browser..."
open http://localhost:3000 2>/dev/null && echo -e "   ✅ Browser opened" || echo -e "   ⚠️  Please open http://localhost:3000 manually"
echo ""

# Eject Kobo device
echo -e "${GREEN}📤 Ejecting Kobo device...${NC}"
if diskutil eject "$KOBO_PATH" > /dev/null 2>&1; then
    echo -e "   ✅ Device ejected successfully"
else
    echo -e "   ⚠️  Could not eject automatically"
    echo -e "   💡 Please eject manually from Finder"
fi

echo ""
echo -e "${GREEN}✨ All done!${NC}"
echo ""
echo -e "${BLUE}📊 Your reading data is ready to view at http://localhost:3000${NC}"



