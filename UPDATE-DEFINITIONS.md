# Updating Word Definitions

## Quick Start

Run the definition generator script:

```bash
python3 generate-definitions.py --db public/KoboReader.sqlite
```

This will:
1. Read all saved words from your Kobo database
2. Fetch definitions from Free Dictionary API
3. Save them to `src/data/wordDefinitions.json`
4. The app will automatically use these definitions (much faster!)

## What It Does

- **Fetches definitions** for all your saved words
- **Saves to local file** - no need to fetch live in the app
- **Works offline** - definitions are stored locally
- **Much faster** - instant loading instead of API calls

## Integration with Sync Script

You can add this to your `kobo-sync-improved.sh` script to automatically update definitions when syncing:

```bash
# After copying database
python3 generate-definitions.py --db "$DB_DEST_PATH"
```

## File Location

- **Definitions file**: `src/data/wordDefinitions.json`
- **Format**: JSON object with word → definition mapping

## Benefits

✅ **Faster** - No API delays when viewing definitions  
✅ **Offline** - Works without internet  
✅ **Complete** - All definitions pre-loaded  
✅ **Reliable** - No rate limiting issues  

## Updating Definitions

When you add new words to your Kobo, run the script again to fetch definitions for new words:

```bash
python3 generate-definitions.py --db public/KoboReader.sqlite
```

The script will only fetch definitions for words that don't already have them (you can modify it to update all if needed).



