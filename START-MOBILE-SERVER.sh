#!/bin/bash

# Quick script to start the dev server accessible from iPhone

echo "🚀 Starting Kobo Reading Analyzer..."
echo ""

# Get IP address
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")

if [ "$IP" != "localhost" ]; then
    echo "📱 Your Mac's IP address: $IP"
    echo ""
    echo "On your iPhone:"
    echo "1. Make sure you're on the same WiFi"
    echo "2. Open Safari"
    echo "3. Go to: http://$IP:3000"
    echo "4. Tap Share → Add to Home Screen"
    echo ""
else
    echo "⚠️  Could not detect IP address"
    echo "   You can still access at: http://localhost:3000"
    echo ""
fi

echo "Starting dev server..."
echo "Press Ctrl+C to stop"
echo ""

npm run dev



