#!/bin/bash

# Create PWA icons from a simple SVG
# This creates basic icons - you can replace these with custom designs later

ICON_DIR="public"
SIZES=(192 512)

echo "Creating PWA icons..."

# Create a simple colored square icon using ImageMagick or sips
# Check if ImageMagick is available
if command -v convert &> /dev/null; then
    for size in "${SIZES[@]}"; do
        convert -size ${size}x${size} xc:"#667eea" \
                -gravity center \
                -pointsize $((size/4)) \
                -fill white \
                -annotate +0+0 "📚" \
                "$ICON_DIR/icon-${size}.png"
        echo "✅ Created icon-${size}.png"
    done
elif command -v sips &> /dev/null; then
    # Use sips (macOS built-in) to create icons
    # Create a temporary colored image
    for size in "${SIZES[@]}"; do
        # Create a simple colored PNG
        python3 << EOF
from PIL import Image, ImageDraw, ImageFont
import os

size = $size
img = Image.new('RGB', (size, size), color='#667eea')
draw = ImageDraw.Draw(img)

# Try to add emoji or text
try:
    # Try to use a font
    font_size = size // 4
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Apple Color Emoji.ttc", font_size)
    except:
        font = ImageFont.load_default()
    
    # Center the emoji
    text = "📚"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    position = ((size - text_width) // 2, (size - text_height) // 2)
    draw.text(position, text, fill='white', font=font)
except:
    pass

img.save('$ICON_DIR/icon-${size}.png')
EOF
        echo "✅ Created icon-${size}.png"
    done
else
    echo "⚠️  ImageMagick or Python PIL not found. Creating placeholder icons..."
    # Create simple placeholder files
    for size in "${SIZES[@]}"; do
        # Create a minimal valid PNG (1x1 transparent)
        echo -ne '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xdb\x00\x00\x00\x00IEND\xaeB`\x82' > "$ICON_DIR/icon-${size}.png"
    done
    echo "⚠️  Please create proper icons manually or install ImageMagick"
fi

echo ""
echo "Icons created in $ICON_DIR/"
echo "You can replace these with custom designs later."



