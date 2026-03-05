#!/usr/bin/env python3
"""
Export all words from Kobo database to CSV with frequency and definitions
"""

import sqlite3
import json
import sys
import csv
from pathlib import Path

def format_definition(def_data):
    """Format definition data into a readable string"""
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

def export_words_csv(db_path, frequency_file=None, definitions_file=None, output_file='words.csv'):
    """Export words with frequency and definitions to CSV"""
    
    if not Path(db_path).exists():
        print(f"❌ Database not found: {db_path}")
        return False
    
    print(f"📖 Reading words from: {db_path}")
    
    # Load frequency data
    frequency_data = {}
    if frequency_file and Path(frequency_file).exists():
        print(f"📊 Loading frequency data from: {frequency_file}")
        try:
            with open(frequency_file, 'r', encoding='utf-8') as f:
                frequency_data = json.load(f)
            print(f"   Loaded frequency data for {len(frequency_data)} words")
        except Exception as e:
            print(f"   ⚠️  Could not load frequency file: {e}")
    else:
        # Try common paths
        possible_freq_paths = [
            'src/data/wordFrequency.json',
            'dist/data/wordFrequency.json',
            'public/data/wordFrequency.json',
        ]
        for path in possible_freq_paths:
            if Path(path).exists():
                print(f"📊 Loading frequency data from: {path}")
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        frequency_data = json.load(f)
                    print(f"   Loaded frequency data for {len(frequency_data)} words")
                    break
                except:
                    continue
    
    # Load definitions data
    definitions_data = {}
    if definitions_file and Path(definitions_file).exists():
        print(f"📚 Loading definitions from: {definitions_file}")
        try:
            with open(definitions_file, 'r', encoding='utf-8') as f:
                definitions_data = json.load(f)
            print(f"   Loaded definitions for {len(definitions_data)} words")
        except Exception as e:
            print(f"   ⚠️  Could not load definitions file: {e}")
    else:
        # Try common paths
        possible_def_paths = [
            'dist/data/wordDefinitions.json',
            'src/data/wordDefinitions.json',
            'public/data/wordDefinitions.json',
        ]
        for path in possible_def_paths:
            if Path(path).exists():
                print(f"📚 Loading definitions from: {path}")
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        definitions_data = json.load(f)
                    print(f"   Loaded definitions for {len(definitions_data)} words")
                    break
                except:
                    continue
    
    print("")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT DISTINCT Text FROM WordList WHERE Text IS NOT NULL AND Text != '' ORDER BY Text")
        words = [row[0] for row in cursor.fetchall()]
        
        conn.close()
        
        print(f"✅ Found {len(words)} unique words")
        print("")
        print(f"📝 Writing to CSV: {output_file}")
        
        # Write CSV
        output_path = Path(output_file)
        with open(output_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            
            # Header
            writer.writerow(['Word', 'Frequency Rank', 'Zipf Frequency', 'Definition'])
            
            # Data rows
            for word in words:
                normalized = word.lower()
                
                # Get frequency
                freq_rank = ""
                zipf_freq = ""
                if normalized in frequency_data:
                    freq_info = frequency_data[normalized]
                    if isinstance(freq_info, dict):
                        freq_rank = freq_info.get('rank', '')
                        zipf_freq = freq_info.get('zipf', '')
                    else:
                        freq_rank = freq_info
                
                # Get definition
                definition = ""
                if normalized in definitions_data:
                    definition = format_definition(definitions_data[normalized])
                
                # Write row
                writer.writerow([word, freq_rank, zipf_freq, definition])
        
        print(f"✅ Exported {len(words)} words to {output_file}")
        
        # Print summary
        words_with_freq = sum(1 for w in words if w.lower() in frequency_data)
        words_with_def = sum(1 for w in words if w.lower() in definitions_data)
        print(f"   - {words_with_freq} words have frequency data")
        print(f"   - {words_with_def} words have definitions")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Export words from Kobo database to CSV with frequency and definitions')
    parser.add_argument('--db', type=str, default='public/KoboReader.sqlite',
                       help='Path to KoboReader.sqlite')
    parser.add_argument('--frequency', type=str, default=None,
                       help='Path to wordFrequency.json (auto-detected if not specified)')
    parser.add_argument('--definitions', type=str, default=None,
                       help='Path to wordDefinitions.json (auto-detected if not specified)')
    parser.add_argument('--output', type=str, default='words.csv',
                       help='Output CSV file path')
    
    args = parser.parse_args()
    
    db_path = args.db
    if not Path(db_path).exists():
        alt_path = Path('KoboReader.sqlite')
        if alt_path.exists():
            db_path = str(alt_path)
        else:
            print(f"❌ Database not found at: {args.db}")
            sys.exit(1)
    
    success = export_words_csv(db_path, args.frequency, args.definitions, args.output)
    
    if success:
        print("")
        print("✨ Done!")
    else:
        print("")
        print("⚠️  Export failed")
        sys.exit(1)


