#!/usr/bin/env python3
"""
Add missing definitions from Webster's English Dictionary to words.csv
Downloads the dictionary JSON from GitHub and uses it to fill in missing definitions
"""

import json
import csv
import sys
import re
from pathlib import Path
import urllib.request
import urllib.error
import ssl

# Try to import requests for better SSL handling
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

def download_websters_dict():
    """Download Webster's dictionary JSON from GitHub"""
    url = "https://raw.githubusercontent.com/matthewreagan/WebstersEnglishDictionary/master/dictionary.json"
    
    print("📥 Downloading Webster's English Dictionary...")
    
    # Try using requests first (better SSL handling)
    if HAS_REQUESTS:
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            data = response.json()
            print(f"✅ Downloaded dictionary with {len(data)} words")
            return data
        except Exception as e:
            print(f"⚠️  Requests failed, trying urllib: {e}")
    
    # Fallback to urllib with SSL context
    try:
        # Create SSL context that doesn't verify certificates (for development)
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        with urllib.request.urlopen(url, timeout=30, context=ssl_context) as response:
            data = json.loads(response.read().decode('utf-8'))
            print(f"✅ Downloaded dictionary with {len(data)} words")
            return data
    except urllib.error.URLError as e:
        print(f"❌ Error downloading dictionary: {e}")
        print("   You may need to install requests: pip3 install requests")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing JSON: {e}")
        return None

def normalize_word(word):
    """Normalize word for matching (lowercase, remove punctuation)"""
    return re.sub(r'[^\w\s]', '', word.lower()).strip()

def format_websters_definition(def_text, word):
    """Convert Webster's definition string to our JSON format"""
    if not def_text or not def_text.strip():
        return None
    
    # Webster's format is just plain text, so we'll create a simple structure
    return {
        'word': word.lower(),
        'phonetic': '',
        'meanings': [{
            'partOfSpeech': '',
            'definitions': [{
                'definition': def_text.strip(),
                'example': '',
                'synonyms': [],
                'antonyms': []
            }]
        }]
    }

def format_definition_for_csv(def_data):
    """Format definition data into a readable string for CSV"""
    if not def_data or not isinstance(def_data, dict):
        return ""
    
    meanings = def_data.get('meanings', [])
    if not meanings:
        return ""
    
    parts = []
    for meaning in meanings:
        pos = meaning.get('partOfSpeech', '')
        defs = meaning.get('definitions', [])
        if defs:
            pos_str = f"({pos})" if pos else ""
            def_texts = [d.get('definition', '') for d in defs[:2]]  # Limit to 2 definitions per POS
            meaning_str = f"{pos_str} {'; '.join(def_texts)}" if pos_str else '; '.join(def_texts)
            parts.append(meaning_str.strip())
    
    return " | ".join(parts)

def update_csv_with_websters(csv_file='words.csv', websters_dict=None):
    """Update CSV with definitions from Webster's dictionary"""
    
    if not websters_dict:
        websters_dict = download_websters_dict()
        if not websters_dict:
            return False
    
    csv_path = Path(csv_file)
    if not csv_path.exists():
        print(f"❌ CSV file not found: {csv_file}")
        return False
    
    print(f"📖 Reading words from: {csv_file}")
    
    # Read existing CSV
    words_data = []
    with open(csv_path, 'r', encoding='utf-8', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            words_data.append(row)
    
    print(f"✅ Found {len(words_data)} words in CSV")
    
    # Create normalized lookup for Webster's dictionary
    websters_lookup = {}
    for word, definition in websters_dict.items():
        normalized = normalize_word(word)
        if normalized and normalized not in websters_lookup:
            websters_lookup[normalized] = definition
    
    print(f"✅ Created lookup index with {len(websters_lookup)} normalized words")
    print("")
    
    # Find words missing definitions and try to match with Webster's
    added_count = 0
    updated_count = 0
    
    for row in words_data:
        word = row.get('Word', '').strip()
        existing_def = row.get('Definition', '').strip()
        
        # Skip if already has definition
        if existing_def:
            continue
        
        normalized = normalize_word(word)
        if normalized in websters_lookup:
            websters_def = websters_lookup[normalized]
            formatted_def = format_websters_definition(websters_def, word)
            if formatted_def:
                csv_def = format_definition_for_csv(formatted_def)
                row['Definition'] = csv_def
                added_count += 1
                if added_count <= 5:
                    print(f"   ✓ Added definition for '{word}'")
    
    if added_count > 0:
        # Write updated CSV
        print("")
        print(f"📝 Writing updated CSV with {added_count} new definitions...")
        with open(csv_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['Word', 'Frequency Rank', 'Zipf Frequency', 'Definition'])
            for row in words_data:
                writer.writerow([
                    row.get('Word', ''),
                    row.get('Frequency Rank', ''),
                    row.get('Zipf Frequency', ''),
                    row.get('Definition', '')
                ])
        
        print(f"✅ Added {added_count} definitions from Webster's dictionary")
        print(f"✅ Updated {csv_file}")
    else:
        print("ℹ️  No new definitions found (all words already have definitions or not found in Webster's)")
    
    return True

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Add missing definitions from Webster\'s dictionary to words.csv')
    parser.add_argument('--csv', type=str, default='words.csv',
                       help='Path to words.csv file')
    parser.add_argument('--dict-file', type=str, default=None,
                       help='Path to local dictionary.json file (optional, will download if not provided)')
    
    args = parser.parse_args()
    
    websters_dict = None
    if args.dict_file and Path(args.dict_file).exists():
        print(f"📚 Loading dictionary from local file: {args.dict_file}")
        try:
            with open(args.dict_file, 'r', encoding='utf-8') as f:
                websters_dict = json.load(f)
            print(f"✅ Loaded {len(websters_dict)} words from local file")
        except Exception as e:
            print(f"❌ Error loading local file: {e}")
            websters_dict = None
    
    success = update_csv_with_websters(args.csv, websters_dict)
    
    if success:
        print("")
        print("✨ Done!")
    else:
        print("")
        print("⚠️  Update failed")
        sys.exit(1)

