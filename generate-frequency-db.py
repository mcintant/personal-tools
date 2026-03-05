#!/usr/bin/env python3
"""
Generate word frequency database using wordfreq library
This creates a JSON file with word frequencies for use in the React app
"""

import json
import sys
import os
from pathlib import Path

try:
    from wordfreq import word_frequency, zipf_frequency, available_languages
except ImportError:
    print("❌ wordfreq library not found!")
    print("")
    print("Please install it first:")
    print("  pip3 install wordfreq")
    print("")
    print("Or if you need to use pip with --user:")
    print("  pip3 install --user wordfreq")
    sys.exit(1)

def generate_frequency_database(output_file='src/data/wordFrequency.json', language='en', wordlist='best'):
    """
    Generate a frequency database JSON file using wordfreq
    
    Args:
        output_file: Path to output JSON file
        language: Language code (default: 'en' for English)
        wordlist: 'small', 'large', or 'best' (default: 'best')
    """
    
    print(f"📚 Generating word frequency database...")
    print(f"   Language: {language}")
    print(f"   Wordlist: {wordlist}")
    print("")
    
    # Check available languages
    if language not in available_languages(wordlist):
        print(f"❌ Language '{language}' not available in wordlist '{wordlist}'")
        print(f"   Available languages: {', '.join(sorted(available_languages(wordlist))[:10])}...")
        sys.exit(1)
    
    # We'll create a database by looking up words, but wordfreq doesn't provide
    # a full word list. Instead, we'll create a helper that can look up any word.
    # For the React app, we need a mapping of word -> rank.
    
    # Since wordfreq doesn't provide a full word list directly, we have two options:
    # 1. Use wordfreq's internal data (if accessible)
    # 2. Create a lookup function that uses wordfreq on-demand
    
    # For now, let's create a comprehensive database by using wordfreq's tokenized word lists
    # We'll need to access the internal data
    
    try:
        from wordfreq import tokenize, get_frequency_dict
    except ImportError:
        # Fallback: create a lookup-based system
        print("⚠️  Using lookup-based frequency system")
        print("   The app will look up frequencies on-demand using wordfreq")
        return create_lookup_system(output_file, language, wordlist)
    
    # Try to get the frequency dictionary
    try:
        freq_dict = get_frequency_dict(language, wordlist)
        print(f"✅ Loaded frequency dictionary with {len(freq_dict)} words")
        
        # Convert to rank-based system
        # Sort by frequency (descending) and assign ranks
        sorted_words = sorted(freq_dict.items(), key=lambda x: x[1], reverse=True)
        
        word_ranks = {}
        for rank, (word, freq) in enumerate(sorted_words, start=1):
            word_ranks[word.lower()] = rank
        
        print(f"✅ Created rank mapping for {len(word_ranks)} words")
        
        # Save to JSON
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(word_ranks, f, indent=2, ensure_ascii=False)
        
        file_size = output_path.stat().st_size / 1024
        print(f"✅ Saved to {output_file}")
        print(f"   File size: {file_size:.1f} KB")
        print(f"   Total words: {len(word_ranks)}")
        
        return True
        
    except Exception as e:
        print(f"⚠️  Could not access full word list: {e}")
        print("   Falling back to lookup-based system...")
        return create_lookup_system(output_file, language, wordlist)

def create_lookup_system(output_file, language, wordlist):
    """
    Create a system that uses wordfreq for on-demand lookups
    Since we can't get the full word list, we'll create a helper file
    """
    print("📝 Creating lookup helper...")
    
    helper_code = f'''// Word frequency lookup using wordfreq data
// This file is generated - do not edit manually

// Since wordfreq doesn't provide a full word list in JavaScript,
// we'll use a Python backend or pre-compute common words

// For now, we'll create a sample of common words
export const wordFrequencyRank = {{
  // This will be populated by looking up your saved words
  // Words not in this list will be looked up on-demand if a backend is available
}};

// Lookup function that returns a rank estimate based on frequency
export function getWordFrequencyRank(word) {{
  if (!word) return 100000;
  const normalized = word.toLowerCase().trim();
  return wordFrequencyRank[normalized] || 100000;
}}
'''
    
    output_path = Path(output_file.replace('.json', '.js'))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(helper_code)
    
    print(f"✅ Created helper file: {output_path}")
    print("")
    print("💡 Note: For best results, use the Python backend option")
    return False

def generate_from_saved_words(db_path, output_file='src/data/wordFrequency.json', language='en', wordlist='best'):
    """
    Generate frequency database by looking up frequencies for words in the Kobo database
    This is more practical - we only need frequencies for words you've actually saved
    """
    import sqlite3
    
    if not os.path.exists(db_path):
        print(f"❌ Database not found: {db_path}")
        return False
    
    print(f"📖 Reading saved words from: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all unique words
        cursor.execute("SELECT DISTINCT Text FROM WordList WHERE Text IS NOT NULL AND Text != ''")
        words = [row[0] for row in cursor.fetchall()]
        
        conn.close()
        
        print(f"✅ Found {len(words)} unique saved words")
        print("")
        print("🔍 Looking up frequencies (this may take a minute)...")
        
        # Look up frequency for each word
        word_ranks = {}
        word_frequencies = []
        
        for i, word in enumerate(words, 1):
            if i % 100 == 0:
                print(f"   Processed {i}/{len(words)} words...")
            
            try:
                # Get Zipf frequency (logarithmic scale, easier to rank)
                zipf = zipf_frequency(word, language, wordlist=wordlist)
                
                if zipf > 0:
                    # Convert Zipf to a rank (higher Zipf = more common = lower rank)
                    # Zipf scale: 0-8, where 8 is most common
                    # We'll invert it so higher numbers = less common
                    word_frequencies.append((word.lower(), zipf))
            except Exception as e:
                # Skip words that cause errors
                continue
        
        # Sort by Zipf frequency (descending = most common first)
        word_frequencies.sort(key=lambda x: x[1], reverse=True)
        
        # Store both rank and Zipf frequency in enhanced format
        enhanced_data = {}
        for rank, (word, zipf) in enumerate(word_frequencies, start=1):
            enhanced_data[word] = {'rank': rank, 'zipf': zipf}
        
        # Add words that weren't found (get high rank = less common, zipf = 0)
        for word in words:
            normalized = word.lower()
            if normalized not in enhanced_data:
                enhanced_data[normalized] = {'rank': 100000, 'zipf': 0}
        
        print(f"✅ Looked up frequencies for {len(enhanced_data)} words")
        
        # Save to JSON with enhanced format (rank + zipf)
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(enhanced_data, f, indent=2, ensure_ascii=False)
        
        file_size = output_path.stat().st_size / 1024
        print(f"✅ Saved to {output_file}")
        print(f"   File size: {file_size:.1f} KB")
        print(f"   Total words: {len(word_ranks)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error processing database: {e}")
        return False

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate word frequency database using wordfreq')
    parser.add_argument('--db', type=str, help='Path to KoboReader.sqlite (optional - will lookup saved words)')
    parser.add_argument('--output', type=str, default='src/data/wordFrequency.json', 
                       help='Output JSON file path')
    parser.add_argument('--language', type=str, default='en', 
                       help='Language code (default: en)')
    parser.add_argument('--wordlist', type=str, default='best', 
                       choices=['small', 'large', 'best'],
                       help='Wordlist size (default: best)')
    
    args = parser.parse_args()
    
    if args.db:
        # Generate from saved words in database
        success = generate_from_saved_words(
            args.db, 
            args.output, 
            args.language, 
            args.wordlist
        )
    else:
        # Try to generate full database
        success = generate_frequency_database(
            args.output,
            args.language,
            args.wordlist
        )
    
    if success:
        print("")
        print("✨ Done! The frequency database is ready.")
        print("")
        print("Next steps:")
        print("1. Restart your dev server: npm run dev")
        print("2. Refresh your browser")
        print("3. Your words will now be prioritized using wordfreq data!")
    else:
        print("")
        print("⚠️  Database generation completed with limitations")
        print("   The app will still work, but may use fallback frequency data")

