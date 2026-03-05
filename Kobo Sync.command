#!/bin/bash

# Kobo Sync Launcher - Double-click to run
cd "$(dirname "$0")"
./kobo-sync-improved.sh --wait

# Keep terminal open to see results
echo ""
echo "Press any key to close..."
read -n 1



