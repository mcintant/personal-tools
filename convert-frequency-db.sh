#!/bin/bash

# Script to generate word frequency database using wordfreq Python library
# for use in the Kobo Reading Analyzer app

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLIC_DIR="$SCRIPT_DIR/public"
DATA_DIR="$SCRIPT_DIR/src/data"

echo "📥 Word Frequency Database Generator (using wordfreq)"
echo "====================================================="
echo ""

# Create directories
mkdir -p "$PUBLIC_DIR"
mkdir -p "$DATA_DIR"

# Function to download COCA
download_coca() {
    echo "Downloading COCA frequency database..."
    echo "This may take a few minutes..."
    
    if [ -f "$PUBLIC_DIR/CoCA-1grams.txt" ]; then
        echo "✅ CoCA file already exists, skipping download"
    else
        curl -L -o "$PUBLIC_DIR/CoCA-1grams.txt" \
            "https://www.wordfrequency.info/files/u/CoCA/CoCA-1grams.txt" || {
            echo "❌ Failed to download COCA. Trying alternative source..."
            # Alternative: try GitHub mirror if available
            return 1
        }
        echo "✅ Downloaded COCA database"
    fi
}

# Function to convert COCA to JSON
convert_coca_to_json() {
    echo ""
    echo "Converting COCA to JSON format..."
    
    if [ ! -f "$PUBLIC_DIR/CoCA-1grams.txt" ]; then
        echo "❌ CoCA file not found. Please download it first."
        return 1
    fi
    
    # COCA format: word<TAB>frequency<TAB>dispersion<TAB>range
    # We'll create a JSON object with word -> rank mapping
    python3 << 'PYTHON_SCRIPT'
import json
import sys

input_file = 'public/CoCA-1grams.txt'
output_file = 'src/data/wordFrequency.json'

try:
    word_freq = {}
    rank = 1
    
    print(f"Reading {input_file}...")
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        # Skip header if present
        first_line = f.readline()
        if not first_line[0].isdigit() and '\t' not in first_line:
            # Might be a header, but continue
        
        # Process first line
        if '\t' in first_line or ' ' in first_line:
            parts = first_line.strip().split('\t') if '\t' in first_line else first_line.strip().split()
            if len(parts) >= 2:
                try:
                    word = parts[0].lower().strip()
                    freq = int(parts[1]) if parts[1].isdigit() else 0
                    if word and freq > 0:
                        word_freq[word] = rank
                        rank += 1
                except (ValueError, IndexError):
                    pass
        
        # Process rest of file
        for line in f:
            parts = line.strip().split('\t') if '\t' in line else line.strip().split()
            if len(parts) >= 2:
                try:
                    word = parts[0].lower().strip()
                    # Skip if not a valid word (contains numbers, special chars)
                    if word and word.isalpha() and len(word) > 1:
                        freq = int(parts[1]) if parts[1].isdigit() else 0
                        if freq > 0 and word not in word_freq:
                            word_freq[word] = rank
                            rank += 1
                except (ValueError, IndexError):
                    continue
    
    print(f"✅ Processed {len(word_freq)} words")
    print(f"Writing to {output_file}...")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(word_freq, f, indent=2, ensure_ascii=False)
    
    import os
    print(f"✅ Successfully created {output_file}")
    print(f"   Total words: {len(word_freq)}")
    print(f"   File size: {os.path.getsize(output_file) / 1024:.1f} KB")
    
except FileNotFoundError:
    print(f"❌ Error: {input_file} not found")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error processing file: {e}")
    sys.exit(1)
PYTHON_SCRIPT

    if [ $? -eq 0 ]; then
        echo "✅ Conversion complete!"
        echo ""
        echo "The frequency database is now available at:"
        echo "  src/data/wordFrequency.json"
        echo ""
        echo "The app will automatically load this file."
    else
        echo "❌ Conversion failed"
        return 1
    fi
}

# Function to download simple word list
download_simple_list() {
    echo "Downloading simple 10,000 word list..."
    curl -L -o "$PUBLIC_DIR/google-10000-english.txt" \
        "https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english.txt" || {
        echo "❌ Failed to download word list"
        return 1
    }
    echo "✅ Downloaded word list"
    
    # Convert to JSON
    echo "Converting to JSON..."
    python3 << 'PYTHON_SCRIPT'
import json

input_file = 'public/google-10000-english.txt'
output_file = 'src/data/wordFrequency.json'

word_freq = {}
rank = 1

with open(input_file, 'r', encoding='utf-8') as f:
    for line in f:
        word = line.strip().lower()
        if word and word.isalpha():
            word_freq[word] = rank
            rank += 1

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(word_freq, f, indent=2, ensure_ascii=False)

print(f"✅ Created {output_file} with {len(word_freq)} words")
PYTHON_SCRIPT
}

# Check if wordfreq is installed
if ! python3 -c "import wordfreq" 2>/dev/null; then
    echo "⚠️  wordfreq library not found!"
    echo ""
    echo "Installing wordfreq..."
    pip3 install wordfreq --user 2>/dev/null || pip3 install wordfreq || {
        echo "❌ Failed to install wordfreq"
        echo ""
        echo "Please install manually:"
        echo "  pip3 install wordfreq"
        echo "  # or"
        echo "  pip3 install --user wordfreq"
        exit 1
    }
    echo "✅ wordfreq installed"
    echo ""
fi

# Main menu
echo "Choose generation method:"
echo "1) Generate from your saved words (Recommended - uses your Kobo database)"
echo "2) Generate full database (may take longer)"
echo ""
read -p "Enter choice [1-2]: " choice

KOBO_DB="$SCRIPT_DIR/public/KoboReader.sqlite"
if [ ! -f "$KOBO_DB" ]; then
    KOBO_DB="$SCRIPT_DIR/KoboReader.sqlite"
fi

case $choice in
    1)
        if [ ! -f "$KOBO_DB" ]; then
            echo "❌ Kobo database not found at: $KOBO_DB"
            echo ""
            read -p "Enter path to KoboReader.sqlite: " db_path
            if [ -f "$db_path" ]; then
                KOBO_DB="$db_path"
            else
                echo "❌ Database not found: $db_path"
                exit 1
            fi
        fi
        echo ""
        echo "Generating frequency database from your saved words..."
        python3 "$SCRIPT_DIR/generate-frequency-db.py" --db "$KOBO_DB"
        ;;
    2)
        echo ""
        echo "Generating full frequency database..."
        python3 "$SCRIPT_DIR/generate-frequency-db.py"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✨ Done! The frequency database is ready to use."
echo ""
echo "Next steps:"
echo "1. The app will automatically load src/data/wordFrequency.json"
echo "2. Restart your dev server: npm run dev"
echo "3. Your words will now be prioritized using the full database!"

