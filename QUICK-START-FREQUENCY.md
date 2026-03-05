# Quick Start: Generate Frequency Database

## Easiest Method (Recommended)

1. **Install wordfreq library:**
   ```bash
   pip3 install wordfreq
   ```

2. **Run the automated script:**
   ```bash
   ./convert-frequency-db.sh
   ```

3. **Choose option 1** (Generate from your saved words) - This is the best option!
   - It reads your saved words from the Kobo database
   - Looks up frequencies using wordfreq
   - Creates a personalized frequency database
   - Only processes words you've actually saved (fast!)

## Manual Generation

**From your saved words (recommended):**
```bash
python3 generate-frequency-db.py --db public/KoboReader.sqlite
```

**Full database (slower but comprehensive):**
```bash
python3 generate-frequency-db.py
```

## What Happens

1. Script reads your saved words from Kobo database
2. Looks up each word's frequency using wordfreq library
3. Creates ranked JSON database
4. Saves to `src/data/wordFrequency.json`
5. App automatically loads it on next refresh

## Verify It's Working

After downloading, refresh your app. You should see:
- ✅ "Using full frequency database" badge in the word list
- ✅ More accurate word prioritization
- ✅ Better categorization of rare vs common words

## File Locations

- **Generated JSON**: `src/data/wordFrequency.json` (used by app)
- **Scripts**: 
  - `convert-frequency-db.sh` (automated)
  - `generate-frequency-db.py` (manual)

## Troubleshooting

**wordfreq not found?**
```bash
# Install it
pip3 install wordfreq

# Or with user flag
pip3 install --user wordfreq
```

**Database not found?**
- Make sure your Kobo database is at `public/KoboReader.sqlite`
- Or provide path manually: `python3 generate-frequency-db.py --db /path/to/KoboReader.sqlite`

**Generation fails?**
- Make sure Python 3 is installed: `python3 --version`
- Check that wordfreq is installed: `python3 -c "import wordfreq"`

**App not using new database?**
- Clear browser cache
- Restart dev server: `npm run dev`
- Check browser console for errors

## Database Sources

See `FREQUENCY-DATABASE-GUIDE.md` for all available sources and detailed instructions.

