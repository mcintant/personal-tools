#!/bin/bash

# Kobo Reader Auto-Sync Script
# Detects Kobo device, backs up database, and opens the React app

set -e

# Configuration
KOBO_MOUNT_POINT="/Volumes/KOBOeReader"
DB_SOURCE_PATH=".kobo/KoboReader.sqlite"
BACKUP_DIR="$HOME/kobo-backups"
PROJECT_DIR="/Users/Tony/dev/kobo"
DB_DEST_PATH="$PROJECT_DIR/public/KoboReader.sqlite"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔍 Checking for Kobo device...${NC}"

# Function to find Kobo device
find_kobo() {
    # Check if KOBOeReader is already mounted
    if [ -d "$KOBO_MOUNT_POINT" ]; then
        echo "$KOBO_MOUNT_POINT"
        return 0
    fi
    
    # Try to find Kobo in /Volumes
    for volume in /Volumes/*; do
        if [ -d "$volume" ]; then
            # Check if it looks like a Kobo device
            if [ -f "$volume/.kobo/version" ] || [ -f "$volume/.kobo/KoboReader.sqlite" ]; then
                echo "$volume"
                return 0
            fi
        fi
    done
    
    return 1
}

# Function to wait for Kobo device
wait_for_kobo() {
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        kobo_path=$(find_kobo)
        if [ $? -eq 0 ]; then
            echo "$kobo_path"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    
    return 1
}

# Main execution
if [ "$1" = "--wait" ]; then
    # Wait mode - keep checking until device is found
    echo -e "${YELLOW}⏳ Waiting for Kobo device to be connected...${NC}"
    KOBO_PATH=$(wait_for_kobo)
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Kobo device not found after waiting${NC}"
        exit 1
    fi
else
    # Immediate check mode
    KOBO_PATH=$(find_kobo)
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Kobo device not found.${NC}"
        echo -e "${YELLOW}💡 Make sure your Kobo is connected and mounted.${NC}"
        echo -e "${YELLOW}💡 You can run this script with --wait to wait for the device.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Found Kobo at: $KOBO_PATH${NC}"

# Check if database exists on device
DB_SOURCE="$KOBO_PATH/$DB_SOURCE_PATH"
if [ ! -f "$DB_SOURCE" ]; then
    echo -e "${RED}❌ Database not found at: $DB_SOURCE${NC}"
    exit 1
fi

echo -e "${GREEN}📦 Database found, creating backup...${NC}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup existing database if it exists
if [ -f "$DB_DEST_PATH" ]; then
    BACKUP_FILE="$BACKUP_DIR/KoboReader_$TIMESTAMP.sqlite"
    cp "$DB_DEST_PATH" "$BACKUP_FILE"
    echo -e "${GREEN}✅ Backed up existing database to: $BACKUP_FILE${NC}"
fi

# Copy database from Kobo
echo -e "${GREEN}📥 Copying database from Kobo...${NC}"
cp "$DB_SOURCE" "$DB_DEST_PATH"

# Verify copy was successful
if [ ! -f "$DB_DEST_PATH" ]; then
    echo -e "${RED}❌ Failed to copy database${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Database copied successfully${NC}"

# Get database file size for confirmation
DB_SIZE=$(du -h "$DB_DEST_PATH" | cut -f1)
echo -e "${GREEN}📊 Database size: $DB_SIZE${NC}"

# Start React app if not already running
echo -e "${GREEN}🚀 Starting React app...${NC}"
cd "$PROJECT_DIR"

# Check if dev server is already running
if ! lsof -ti:3000 > /dev/null 2>&1; then
    # Start dev server in background
    npm run dev > /dev/null 2>&1 &
    DEV_PID=$!
    echo -e "${GREEN}✅ Started dev server (PID: $DEV_PID)${NC}"
    
    # Wait a moment for server to start
    sleep 3
    
    # Open browser
    open http://localhost:3000 2>/dev/null || echo -e "${YELLOW}⚠️  Could not open browser automatically${NC}"
else
    echo -e "${YELLOW}ℹ️  Dev server already running on port 3000${NC}"
    open http://localhost:3000 2>/dev/null || echo -e "${YELLOW}⚠️  Could not open browser automatically${NC}"
fi

# Eject Kobo device
echo -e "${GREEN}📤 Ejecting Kobo device...${NC}"
diskutil eject "$KOBO_PATH" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Kobo device ejected successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Could not eject device automatically. Please eject manually.${NC}"
fi

echo -e "${GREEN}✨ All done!${NC}"



