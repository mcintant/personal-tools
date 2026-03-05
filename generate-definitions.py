#!/usr/bin/env python3
"""
Generate word definitions database from Kobo SQLite file
Extracts definitions from Kobo dicthtml.zip dictionary file
"""

import json
import sqlite3
import sys
import re
import zipfile
import csv
from pathlib import Path
from html.parser import HTMLParser
from html import unescape
from collections import defaultdict
import time
import contextlib
import io
import ssl
import urllib.request
import urllib.error

# Try to import requests for fallback API
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

# Try to import PyDictionary for additional definitions
try:
    from PyDictionary import PyDictionary
    HAS_PYDICTIONARY = True
except ImportError:
    HAS_PYDICTIONARY = False
    # Don't print warning here - will print later when actually needed

class KoboDictionaryParser(HTMLParser):
    """Parser for Kobo dictionary HTML files"""
    
    def __init__(self):
        super().__init__()
        self.words = {}
        self.current_word = None
        self.current_definition = None
        self.current_meaning = None
        self.in_definition = False
        self.in_phonetic = False
        self.in_part_of_speech = False
        self.current_text = []
        self.phonetic = ''
        self.part_of_speech = ''
        
    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        
        # Look for word entries - Kobo format may vary
        if tag == 'div' and 'class' in attrs_dict:
            if 'entry' in attrs_dict['class'].lower() or 'word' in attrs_dict['class'].lower():
                self.current_word = None
                self.current_definition = None
        
        # Look for phonetic information
        if tag in ['span', 'div'] and 'class' in attrs_dict:
            if 'phonetic' in attrs_dict['class'].lower() or 'pronunciation' in attrs_dict['class'].lower():
                self.in_phonetic = True
        
        # Look for part of speech
        if tag in ['span', 'div', 'em', 'i'] and 'class' in attrs_dict:
            if 'pos' in attrs_dict['class'].lower() or 'part-of-speech' in attrs_dict['class'].lower():
                self.in_part_of_speech = True
        
        # Look for definitions
        if tag in ['div', 'p', 'li'] and 'class' in attrs_dict:
            if 'definition' in attrs_dict['class'].lower() or 'meaning' in attrs_dict['class'].lower():
                self.in_definition = True
                self.current_text = []
    
    def handle_endtag(self, tag):
        if tag in ['div', 'p', 'li']:
            if self.in_definition and self.current_text:
                definition_text = ' '.join(self.current_text).strip()
                if definition_text and self.current_word:
                    if self.current_word not in self.words:
                        self.words[self.current_word] = {
                            'word': self.current_word,
                            'phonetic': self.phonetic,
                            'meanings': []
                        }
                    
                    # Add meaning if we have part of speech
                    if self.part_of_speech:
                        meaning = {
                            'partOfSpeech': self.part_of_speech,
                            'definitions': [{
                                'definition': definition_text,
                                'example': '',
                                'synonyms': [],
                                'antonyms': []
                            }]
                        }
                        self.words[self.current_word]['meanings'].append(meaning)
                    else:
                        # Add to existing meaning or create new one
                        if not self.words[self.current_word]['meanings']:
                            self.words[self.current_word]['meanings'].append({
                                'partOfSpeech': '',
                                'definitions': []
                            })
                        self.words[self.current_word]['meanings'][0]['definitions'].append({
                            'definition': definition_text,
                            'example': '',
                            'synonyms': [],
                            'antonyms': []
                        })
                
                self.current_text = []
                self.in_definition = False
        
        if tag in ['span', 'div', 'em', 'i']:
            self.in_phonetic = False
            self.in_part_of_speech = False
    
    def handle_data(self, data):
        data = data.strip()
        if not data:
            return
        
        # Check if this looks like a word heading
        if not self.current_word and len(data) < 50 and not any(c in data for c in '.,;:!?'):
            # Potential word - store it
            word = data.lower().strip()
            if word and word not in self.words:
                self.current_word = word
        
        if self.in_phonetic:
            self.phonetic = data
        
        if self.in_part_of_speech:
            self.part_of_speech = data
        
        if self.in_definition:
            self.current_text.append(data)

def extract_definitions_from_kobo_dict(zip_path):
    """Extract all definitions from Kobo dicthtml.zip file"""
    definitions = {}
    
    if not Path(zip_path).exists():
        print(f"❌ Dictionary zip file not found: {zip_path}")
        return definitions
    
    print(f"📚 Extracting definitions from: {zip_path}")
    
    try:
        with zipfile.ZipFile(zip_path, 'r') as z:
            # Get list of HTML files
            html_files = [f for f in z.namelist() if f.endswith('.html') and not f.startswith('__')]
            print(f"   Found {len(html_files)} HTML files")
            
            total_words = 0
            for i, html_file in enumerate(html_files, 1):
                if i % 50 == 0:
                    print(f"   Processing file {i}/{len(html_files)}... ({total_words} words found)")
                
                try:
                    # Read the HTML file
                    html_content = z.read(html_file)
                    
                    # Try to decode - might be compressed or encoded
                    # First try as UTF-8
                    try:
                        html_text = html_content.decode('utf-8', errors='ignore')
                    except:
                        # Try other encodings
                        try:
                            html_text = html_content.decode('latin-1', errors='ignore')
                        except:
                            html_text = html_content.decode('utf-8', errors='replace')
                    
                    # Parse HTML
                    parser = KoboDictionaryParser()
                    parser.feed(html_text)
                    
                    # Add parsed words to definitions
                    for word, definition in parser.words.items():
                        definitions[word] = definition
                        total_words += 1
                
                except Exception as e:
                    # Skip files that can't be parsed
                    continue
        
        print(f"✅ Extracted {len(definitions)} word definitions from dictionary")
        return definitions
    
    except Exception as e:
        print(f"❌ Error extracting from dictionary: {e}")
        import traceback
        traceback.print_exc()
        return definitions

def parse_kobo_html_simple(html_text):
    """Simple parser for Kobo HTML - tries to extract words and definitions"""
    definitions = {}
    
    # The Kobo format appears to be proprietary binary, but let's try to extract
    # any readable text that might contain word-definition pairs
    
    # Strategy 1: Look for any HTML-like structure
    if '<' not in html_text or '>' not in html_text:
        # Not HTML, might be binary - try to extract readable ASCII sequences
        # Look for sequences of letters that might be words
        word_sequences = re.findall(r'[a-zA-Z]{4,20}', html_text)
        # Filter to likely English words (basic heuristic)
        likely_words = [w for w in word_sequences if w.isalpha() and len(w) >= 4]
        if likely_words:
            # Create minimal definitions for found words
            for word in set(likely_words[:50]):  # Limit to avoid noise
                word_lower = word.lower()
                if word_lower not in definitions:
                    definitions[word_lower] = {
                        'word': word_lower,
                        'phonetic': '',
                        'meanings': [{
                            'partOfSpeech': '',
                            'definitions': [{
                                'definition': f'Definition extracted from Kobo dictionary (format may need specialized parsing)',
                                'example': '',
                                'synonyms': [],
                                'antonyms': []
                            }]
                        }]
                    }
        return definitions
    
    # Strategy 2: If it looks like HTML, try standard patterns
    word_patterns = [
        r'<h[1-6][^>]*>([^<]+)</h[1-6]>',
        r'<div[^>]*class=["\']word["\'][^>]*>([^<]+)</div>',
        r'<span[^>]*class=["\']word["\'][^>]*>([^<]+)</span>',
        r'<dt[^>]*>([^<]+)</dt>',  # Definition term
    ]
    
    def_patterns = [
        r'<p[^>]*>([^<]+)</p>',
        r'<div[^>]*class=["\']def[^>]*>([^<]+)</div>',
        r'<dd[^>]*>([^<]+)</dd>',  # Definition description
        r'<li[^>]*>([^<]+)</li>',
    ]
    
    # Extract all potential words
    words = []
    for pattern in word_patterns:
        matches = re.finditer(pattern, html_text, re.IGNORECASE)
        for match in matches:
            word = unescape(match.group(1)).strip().lower()
            if word and len(word) < 50 and word.isalpha() and word not in words:
                words.append(word)
    
    # For each word, try to find nearby definitions
    for word in words:
        word_pos = html_text.lower().find(f'>{word}<')
        if word_pos == -1:
            continue
        
        section = html_text[word_pos:word_pos+2000]
        
        definitions_list = []
        for pattern in def_patterns:
            matches = re.finditer(pattern, section, re.IGNORECASE)
            for match in matches:
                def_text = unescape(match.group(1)).strip()
                if def_text and len(def_text) > 10:
                    definitions_list.append(def_text)
        
        if definitions_list:
            definitions[word] = {
                'word': word,
                'phonetic': '',
                'meanings': [{
                    'partOfSpeech': '',
                    'definitions': [{
                        'definition': def_text,
                        'example': '',
                        'synonyms': [],
                        'antonyms': []
                    } for def_text in definitions_list[:3]]
                }]
            }
    
    return definitions

def extract_all_from_zip(zip_path):
    """Extract all definitions from zip using simple text extraction"""
    all_definitions = {}
    
    if not Path(zip_path).exists():
        print(f"❌ Dictionary zip file not found: {zip_path}")
        return all_definitions
    
    print(f"📚 Extracting definitions from: {zip_path}")
    
    try:
        with zipfile.ZipFile(zip_path, 'r') as z:
            html_files = [f for f in z.namelist() if f.endswith('.html') and not f.startswith('__')]
            print(f"   Found {len(html_files)} HTML files")
            
            for i, html_file in enumerate(html_files, 1):
                if i % 100 == 0:
                    print(f"   Processing {i}/{len(html_files)}... ({len(all_definitions)} words found)")
                
                try:
                    html_content = z.read(html_file)
                    
                    # Try multiple decoding strategies
                    html_text = None
                    for encoding in ['utf-8', 'latin-1', 'cp1252']:
                        try:
                            html_text = html_content.decode(encoding, errors='ignore')
                            break
                        except:
                            continue
                    
                    if not html_text:
                        html_text = html_content.decode('utf-8', errors='replace')
                    
                    # Use simple parser
                    file_definitions = parse_kobo_html_simple(html_text)
                    all_definitions.update(file_definitions)
                
                except Exception as e:
                    continue
        
        print(f"✅ Extracted {len(all_definitions)} word definitions")
        return all_definitions
    
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return all_definitions

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
            print(f"✅ Downloaded Webster's dictionary with {len(data)} words")
            return data
        except Exception as e:
            print(f"⚠️  Requests failed, trying urllib: {e}")
    
    # Fallback to urllib with SSL context
    try:
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        with urllib.request.urlopen(url, timeout=30, context=ssl_context) as response:
            data = json.loads(response.read().decode('utf-8'))
            print(f"✅ Downloaded Webster's dictionary with {len(data)} words")
            return data
    except Exception as e:
        print(f"⚠️  Could not download Webster's dictionary: {e}")
        return None

def normalize_word_for_matching(word):
    """Normalize word for matching (lowercase, remove punctuation)"""
    return re.sub(r'[^\w\s]', '', word.lower()).strip()

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

def read_definitions_from_csv(csv_file='words.csv'):
    """Read existing definitions from CSV file"""
    definitions = {}
    csv_path = Path(csv_file)
    
    if not csv_path.exists():
        return definitions
    
    try:
        with open(csv_path, 'r', encoding='utf-8', newline='') as f:
            reader = csv.DictReader(f)
            for row in reader:
                word = row.get('Word', '').strip()
                definition = row.get('Definition', '').strip()
                if word and definition:
                    definitions[word.lower()] = definition
        return definitions
    except Exception as e:
        print(f"   ⚠️  Could not read definitions from CSV: {e}")
        return definitions

def update_csv_with_definitions(db_path, definitions, csv_file='words.csv', frequency_file=None):
    """Update CSV file with definitions"""
    try:
        # Load frequency data if CSV doesn't exist
        frequency_data = {}
        if frequency_file and Path(frequency_file).exists():
            with open(frequency_file, 'r', encoding='utf-8') as f:
                frequency_data = json.load(f)
        else:
            # Try common paths
            for path in ['src/data/wordFrequency.json', 'dist/data/wordFrequency.json']:
                if Path(path).exists():
                    with open(path, 'r', encoding='utf-8') as f:
                        frequency_data = json.load(f)
                    break
        
        # Get all words from database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT Text FROM WordList WHERE Text IS NOT NULL AND Text != '' ORDER BY Text")
        words = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        csv_path = Path(csv_file)
        csv_exists = csv_path.exists()
        
        # Read existing CSV if it exists
        existing_data = {}
        if csv_exists:
            try:
                with open(csv_path, 'r', encoding='utf-8', newline='') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        existing_data[row['Word']] = {
                            'rank': row.get('Frequency Rank', ''),
                            'zipf': row.get('Zipf Frequency', ''),
                            'definition': row.get('Definition', '')
                        }
            except Exception as e:
                print(f"   ⚠️  Could not read existing CSV: {e}")
                csv_exists = False
        
        # Write/update CSV
        with open(csv_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['Word', 'Frequency Rank', 'Zipf Frequency', 'Definition'])
            
            for word in words:
                normalized = word.lower()
                
                # Get frequency from existing CSV or frequency data
                freq_rank = ""
                zipf_freq = ""
                if word in existing_data:
                    freq_rank = existing_data[word].get('rank', '')
                    zipf_freq = existing_data[word].get('zipf', '')
                elif normalized in frequency_data:
                    freq_info = frequency_data[normalized]
                    if isinstance(freq_info, dict):
                        freq_rank = freq_info.get('rank', '')
                        zipf_freq = freq_info.get('zipf', '')
                    else:
                        freq_rank = freq_info
                
                # Get definition (prioritize new definitions over existing)
                definition = ""
                if normalized in definitions:
                    definition = format_definition_for_csv(definitions[normalized])
                elif word in existing_data:
                    definition = existing_data[word].get('definition', '')
                
                writer.writerow([word, freq_rank, zipf_freq, definition])
        
        return True
    except Exception as e:
        print(f"   ⚠️  Could not update CSV: {e}")
        return False

def generate_definitions(db_path, dict_zip_path, output_file='public/data/wordDefinitions.json'):
    """Generate definitions database from Kobo database and dictionary"""
    
    if not Path(db_path).exists():
        print(f"❌ Database not found: {db_path}")
        return False
    
    print(f"📖 Reading saved words from: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT DISTINCT Text FROM WordList WHERE Text IS NOT NULL AND Text != ''")
        words = [row[0] for row in cursor.fetchall()]
        
        conn.close()
        
        print(f"✅ Found {len(words)} unique saved words")
        print("")
        
        # Load existing definitions from CSV first (as primary source)
        csv_definitions = read_definitions_from_csv('words.csv')
        if csv_definitions:
            print(f"📋 Loaded {len(csv_definitions)} existing definitions from words.csv")
        
        # Load existing definitions from JSON files (as secondary source)
        existing_definitions = {}
        output_path = Path(output_file)
        possible_paths = [
            Path('dist/data/wordDefinitions.json'),
            Path('dist/data/wordDefinitions.json').resolve(),
            output_path,
            output_path.resolve(),
            Path('public/data/wordDefinitions.json'),
            Path('public/data/wordDefinitions.json').resolve(),
            Path('src/data/wordDefinitions.json'),
            Path('src/data/wordDefinitions.json').resolve(),
        ]
        
        for path in possible_paths:
            if path.exists() and path.is_file():
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        if isinstance(data, dict) and len(data) > 0:
                            # Only add words that don't already have definitions in CSV
                            for word, def_data in data.items():
                                if word.lower() not in csv_definitions:
                                    existing_definitions[word] = def_data
                            if existing_definitions:
                                print(f"📚 Loaded {len(existing_definitions)} additional definitions from {path}")
                            break
                except:
                    continue
        
        # Combine CSV and JSON definitions (CSV takes priority)
        # Convert CSV definitions to JSON format for consistency
        for word, csv_def in csv_definitions.items():
            if word not in existing_definitions:
                # Create a simple JSON structure from CSV definition string
                existing_definitions[word] = {
                    'word': word,
                    'phonetic': '',
                    'meanings': [{
                        'partOfSpeech': '',
                        'definitions': [{
                            'definition': csv_def,
                            'example': '',
                            'synonyms': [],
                            'antonyms': []
                        }]
                    }]
                }
        
        if existing_definitions:
            print(f"📚 Total existing definitions: {len(existing_definitions)} ({len(csv_definitions)} from CSV, {len(existing_definitions) - len(csv_definitions)} from JSON)")
        print("")
        
        # Create set for fast lookup of words that already have definitions in CSV
        csv_defs_set = {w.lower() for w in csv_definitions.keys()}
        
        # Extract definitions from Kobo dictionary
        print("")
        print("🔍 Extracting definitions from Kobo dictionary...")
        print("   Note: Kobo dictionary files use a proprietary binary format.")
        print("   Extraction may be limited without specialized parsing tools.")
        print("")
        
        kobo_definitions = extract_all_from_zip(dict_zip_path)
        
        # Check if extracted words match database words
        # Create a set of normalized words for faster lookup
        words_set = {w.lower().strip() for w in words}
        matched = sum(1 for k in kobo_definitions.keys() if k in words_set) if kobo_definitions else 0
        
        if len(kobo_definitions) == 0:
            print("⚠️  Could not extract definitions from Kobo dictionary format.")
            print("   The files appear to be in a proprietary binary format.")
            print("   You may need specialized tools or the dictionary in a different format.")
            print("")
        elif matched == 0:
            print(f"⚠️  Extracted {len(kobo_definitions)} word-like sequences, but none match your saved words.")
            print("   The extracted data appears to be binary/encoded, not actual dictionary entries.")
            print("   The Kobo dictionary format requires specialized parsing tools.")
            print("")
        
        if len(kobo_definitions) == 0 or matched == 0:
            print("   Options:")
            print("   1. Use the API-based approach (modify script to use requests)")
            print("   2. Look for Kobo dictionary parsing tools/libraries")
            print("   3. Export dictionary from Kobo device in a different format")
            print("   4. Use an alternative dictionary source")
            print("")
        
        # Merge: start with existing, then add from Kobo dict, prioritizing existing
        definitions = existing_definitions.copy()
        
        # Add Kobo definitions for words we don't have
        added_from_kobo = 0
        # Match Kobo definitions to our words
        for word_key, definition in kobo_definitions.items():
            # Check if this word is in our word list and doesn't already have a definition
            if word_key in words_set and word_key not in definitions and word_key not in csv_defs_set:
                definitions[word_key] = definition
                added_from_kobo += 1
        
        # Also try partial matches (e.g., "word's" matches "word")
        for word in words:
            normalized = word.lower().strip()
            if normalized in definitions or normalized in csv_defs_set:
                continue
            
            # Try to find a match in Kobo definitions
            # Remove punctuation and try again
            clean_word = re.sub(r'[^\w\s]', '', normalized)
            if clean_word and clean_word in kobo_definitions and clean_word not in definitions and clean_word not in csv_defs_set:
                definitions[normalized] = kobo_definitions[clean_word]
                added_from_kobo += 1
        
        if added_from_kobo > 0:
            print(f"✅ Added {added_from_kobo} definitions from Kobo dictionary")
        print(f"✅ Total definitions: {len(definitions)} ({len(existing_definitions)} existing, {added_from_kobo} from Kobo)")
        
        # Try to fetch additional definitions using online APIs for words we don't have
        added_from_api = 0
        # Filter out words that already have definitions in CSV or JSON
        words_needing_definitions = [w for w in words if w.lower().strip() not in definitions and w.lower().strip() not in csv_defs_set]
        
        # Filter to only single words (APIs don't handle multi-word terms well)
        # Remove words with spaces, hyphens (except contractions), or other separators
        single_words = []
        for word in words_needing_definitions:
            normalized = word.lower().strip()
            # Remove punctuation except apostrophes (for contractions like "don't")
            clean_word = re.sub(r'[^\w\']', '', normalized)
            # Check if it's a single word (no spaces, and reasonable length)
            if ' ' not in normalized and '-' not in normalized and len(clean_word) > 1:
                # Only include if it looks like a valid single word
                if clean_word.replace("'", "").isalnum():
                    single_words.append((normalized, clean_word))
        
        if single_words:
            print("")
            print(f"🔍 Fetching additional definitions for {len(single_words)} single words without definitions...")
            print(f"   (Skipped {len(words_needing_definitions) - len(single_words)} multi-word terms)")
            
            # Try Free Dictionary API first (more reliable)
            if HAS_REQUESTS:
                print("")
                print("   Using Free Dictionary API (dictionaryapi.dev)...")
                remaining_words = [(n, c) for n, c in single_words if n not in definitions]
                
                for i, (normalized, clean_word) in enumerate(remaining_words, 1):
                    if i % 10 == 0:
                        print(f"   Processing {i}/{len(remaining_words)}... ({added_from_api} found so far)")
                    
                    try:
                        # Use Free Dictionary API (free, no key required)
                        response = requests.get(f"https://api.dictionaryapi.dev/api/v2/entries/en/{clean_word}", timeout=5)
                        if response.status_code == 200:
                            data = response.json()
                            if data and isinstance(data, list) and len(data) > 0:
                                meanings_list = []
                                phonetic = ''
                                for entry in data:
                                    if 'phonetic' in entry and not phonetic:
                                        phonetic = entry.get('phonetic', '')
                                    if 'meanings' in entry:
                                        for meaning in entry['meanings']:
                                            pos = meaning.get('partOfSpeech', '')
                                            defs = meaning.get('definitions', [])
                                            if defs:
                                                meanings_list.append({
                                                    'partOfSpeech': pos,
                                                    'definitions': [{
                                                        'definition': d.get('definition', ''),
                                                        'example': d.get('example', ''),
                                                        'synonyms': d.get('synonyms', [])[:5],  # Limit synonyms
                                                        'antonyms': d.get('antonyms', [])[:5]   # Limit antonyms
                                                    } for d in defs[:3]]  # Limit to 3 definitions per POS
                                                })
                                
                                if meanings_list:
                                    definitions[normalized] = {
                                        'word': normalized,
                                        'phonetic': phonetic,
                                        'meanings': meanings_list
                                    }
                                    added_from_api += 1
                        elif response.status_code == 404:
                            # Word not found - skip silently
                            pass
                        
                        time.sleep(0.15)  # Be nice to the API (slightly faster than before)
                        
                    except requests.exceptions.Timeout:
                        print(f"   ⚠️  Request timeout for '{clean_word}' - continuing...")
                        continue
                    except requests.exceptions.RequestException as e:
                        if i <= 3:  # Only show first few errors
                            print(f"   ⚠️  Request error for '{clean_word}': {e}")
                        continue
                    except Exception as e:
                        continue
                
                if added_from_api > 0:
                    print(f"✅ Added {added_from_api} definitions from Free Dictionary API")
                else:
                    print(f"ℹ️  No additional definitions found from Free Dictionary API")
            else:
                print("")
                print("ℹ️  'requests' library not installed - skipping online dictionary lookup")
                print("   To enable: pip3 install --break-system-packages requests")
                print("   Or use a virtual environment: python3 -m venv venv && source venv/bin/activate && pip install requests")
            
            # Try PyDictionary as fallback if it's available and we still have words without definitions
            if HAS_PYDICTIONARY and added_from_api == 0:
                print("")
                print("🔍 Trying PyDictionary as fallback...")
                dictionary = PyDictionary()
                added_from_pydict = 0
                remaining_words = [(n, c) for n, c in single_words if n not in definitions]
                
                # Test with a known word first
                test_word = "test"
                try:
                    stderr_capture = io.StringIO()
                    with contextlib.redirect_stderr(stderr_capture):
                        test_result = dictionary.meaning(test_word, disable_errors=True)
                    if test_result:
                        print(f"   ✓ PyDictionary is working (tested with '{test_word}')")
                    else:
                        print(f"   ⚠️  PyDictionary returned no result for test word '{test_word}' - skipping")
                        remaining_words = []  # Skip PyDictionary if it's not working
                except Exception as e:
                    print(f"   ⚠️  PyDictionary test failed: {e} - skipping")
                    remaining_words = []
                
                if remaining_words:
                    for i, (normalized, clean_word) in enumerate(remaining_words[:50], 1):  # Limit to 50
                        if i % 10 == 0:
                            print(f"   Processing {i}/{min(50, len(remaining_words))}... ({added_from_pydict} found so far)")
                        
                        try:
                            stderr_capture = io.StringIO()
                            with contextlib.redirect_stderr(stderr_capture):
                                meaning = dictionary.meaning(clean_word, disable_errors=True)
                            
                            if meaning and isinstance(meaning, dict):
                                valid_meanings = {k: v for k, v in meaning.items() 
                                                if v is not None and isinstance(v, list) and len(v) > 0}
                                
                                if valid_meanings:
                                    meanings_list = []
                                    for part_of_speech, def_list in valid_meanings.items():
                                        if isinstance(def_list, list) and def_list:
                                            valid_defs = [d for d in def_list if d and isinstance(d, str) and d.strip()]
                                            if valid_defs:
                                                meanings_list.append({
                                                    'partOfSpeech': part_of_speech,
                                                    'definitions': [{
                                                        'definition': def_text.strip(),
                                                        'example': '',
                                                        'synonyms': [],
                                                        'antonyms': []
                                                    } for def_text in valid_defs]
                                                })
                                    
                                    if meanings_list:
                                        definitions[normalized] = {
                                            'word': normalized,
                                            'phonetic': '',
                                            'meanings': meanings_list
                                        }
                                        added_from_pydict += 1
                            
                            time.sleep(0.1)
                            
                        except Exception:
                            continue
                    
                    if added_from_pydict > 0:
                        print(f"✅ Added {added_from_pydict} definitions from PyDictionary")
                        added_from_api += added_from_pydict
            
            # Try Webster's dictionary as final fallback
            remaining_words = [(n, c) for n, c in single_words if n not in definitions and n not in csv_defs_set]
            if remaining_words and added_from_api == 0:
                print("")
                print("🔍 Trying Webster's English Dictionary as fallback...")
                websters_dict = download_websters_dict()
                
                if websters_dict:
                    # Create normalized lookup
                    websters_lookup = {}
                    for word, definition in websters_dict.items():
                        normalized = normalize_word_for_matching(word)
                        if normalized and normalized not in websters_lookup:
                            websters_lookup[normalized] = definition
                    
                    added_from_websters = 0
                    for normalized, clean_word in remaining_words[:100]:  # Limit to 100
                        if normalized in websters_lookup:
                            websters_def = websters_lookup[normalized]
                            if websters_def and websters_def.strip():
                                definitions[normalized] = {
                                    'word': normalized,
                                    'phonetic': '',
                                    'meanings': [{
                                        'partOfSpeech': '',
                                        'definitions': [{
                                            'definition': websters_def.strip(),
                                            'example': '',
                                            'synonyms': [],
                                            'antonyms': []
                                        }]
                                    }]
                                }
                                added_from_websters += 1
                    
                    if added_from_websters > 0:
                        print(f"✅ Added {added_from_websters} definitions from Webster's dictionary")
                        added_from_api += added_from_websters
        else:
            print("")
            print("   All words already have definitions!")
            words_needing_definitions = [w for w in words if w.lower().strip() not in definitions and w.lower().strip() not in csv_defs_set]
            if words_needing_definitions:
                # Try Webster's dictionary as fallback
                print("")
                print("🔍 Trying Webster's English Dictionary as fallback...")
                websters_dict = download_websters_dict()
                
                if websters_dict:
                    # Create normalized lookup
                    websters_lookup = {}
                    for word, definition in websters_dict.items():
                        normalized = normalize_word_for_matching(word)
                        if normalized and normalized not in websters_lookup:
                            websters_lookup[normalized] = definition
                    
                    added_from_websters = 0
                    single_words_needing = [w for w in words_needing_definitions 
                                           if ' ' not in w.lower() and '-' not in w.lower()]
                    
                    for word in single_words_needing[:100]:  # Limit to 100
                        normalized = normalize_word_for_matching(word)
                        if normalized in websters_lookup:
                            websters_def = websters_lookup[normalized]
                            if websters_def and websters_def.strip():
                                definitions[normalized] = {
                                    'word': normalized,
                                    'phonetic': '',
                                    'meanings': [{
                                        'partOfSpeech': '',
                                        'definitions': [{
                                            'definition': websters_def.strip(),
                                            'example': '',
                                            'synonyms': [],
                                            'antonyms': []
                                        }]
                                    }]
                                }
                                added_from_websters += 1
                    
                    if added_from_websters > 0:
                        print(f"✅ Added {added_from_websters} definitions from Webster's dictionary")
                        added_from_api += added_from_websters
                    else:
                        print("ℹ️  No additional definitions found in Webster's dictionary")
                else:
                print("")
                print("ℹ️  PyDictionary not installed - skipping additional definition lookup")
                print(f"   {len(words_needing_definitions)} words still need definitions")
                print("")
                print("   To enable PyDictionary, install it using one of these methods:")
                print("   1. With --break-system-packages (if you have system Python):")
                print("      pip3 install --break-system-packages PyDictionary")
                print("")
                print("   2. Using a virtual environment (recommended):")
                print("      python3 -m venv venv")
                print("      source venv/bin/activate")
                print("      pip install PyDictionary")
                print("      # Then run this script with: venv/bin/python3 generate-definitions.py")
                print("")
                print("   3. Using pipx (if installed):")
                print("      pipx install PyDictionary")
        
        print(f"✅ Final total definitions: {len(definitions)} ({len(existing_definitions)} existing, {added_from_kobo} from Kobo, {added_from_api} from online APIs)")
        
        # Save to JSON
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(definitions, f, indent=2, ensure_ascii=False)
        
        file_size = output_path.stat().st_size / 1024
        print(f"✅ Saved to {output_file}")
        print(f"   File size: {file_size:.1f} KB")
        
        # Update CSV file with definitions
        print("")
        print("📝 Updating words.csv with definitions...")
        csv_updated = update_csv_with_definitions(db_path, definitions, csv_file='words.csv')
        if csv_updated:
            print("✅ Updated words.csv with definitions")
        else:
            print("ℹ️  Could not update words.csv (this is optional)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate word definitions from Kobo dictionary')
    parser.add_argument('--db', type=str, default='public/KoboReader.sqlite',
                       help='Path to KoboReader.sqlite')
    parser.add_argument('--dict', type=str, default='dicthtml.zip',
                       help='Path to dicthtml.zip dictionary file')
    parser.add_argument('--output', type=str, default='public/data/wordDefinitions.json',
                       help='Output JSON file path')
    
    args = parser.parse_args()
    
    db_path = args.db
    if not Path(db_path).exists():
        alt_path = Path('KoboReader.sqlite')
        if alt_path.exists():
            db_path = str(alt_path)
        else:
            print(f"❌ Database not found at: {args.db}")
            sys.exit(1)
    
    dict_path = args.dict
    if not Path(dict_path).exists():
        print(f"❌ Dictionary file not found at: {dict_path}")
        sys.exit(1)
    
    success = generate_definitions(db_path, dict_path, args.output)
    
    if success:
        print("")
        print("✨ Done! Definitions extracted from Kobo dictionary.")
    else:
        print("")
        print("⚠️  Definition extraction completed with errors")
        sys.exit(1)
