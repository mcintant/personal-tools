#!/usr/bin/env python3
"""
Export all words from Kobo database to a text file, one per line
"""

import sqlite3
import sys
from pathlib import Path

def export_words(db_path, output_file='words.txt'):
    """Export all words from Kobo database to text file"""
    
    if not Path(db_path).exists():
        print(f"❌ Database not found: {db_path}")
        return False
    
    print(f"📖 Reading words from: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT DISTINCT Text FROM WordList WHERE Text IS NOT NULL AND Text != '' ORDER BY Text")
        words = [row[0] for row in cursor.fetchall()]
        
        conn.close()
        
        print(f"✅ Found {len(words)} unique words")
        
        # Write to file
        output_path = Path(output_file)
        with open(output_path, 'w', encoding='utf-8') as f:
            for word in words:
                f.write(f"{word}\n")
        
        print(f"✅ Exported to {output_file}")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Export words from Kobo database to text file')
    parser.add_argument('--db', type=str, default='public/KoboReader.sqlite',
                       help='Path to KoboReader.sqlite')
    parser.add_argument('--output', type=str, default='words.txt',
                       help='Output text file path')
    
    args = parser.parse_args()
    
    db_path = args.db
    if not Path(db_path).exists():
        alt_path = Path('KoboReader.sqlite')
        if alt_path.exists():
            db_path = str(alt_path)
        else:
            print(f"❌ Database not found at: {args.db}")
            sys.exit(1)
    
    success = export_words(db_path, args.output)
    
    if success:
        print("")
        print("✨ Done!")
    else:
        print("")
        print("⚠️  Export failed")
        sys.exit(1)


