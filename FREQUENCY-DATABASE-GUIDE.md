# Word Frequency Database Guide

## Using wordfreq Library (Recommended)

The easiest and best way to get word frequencies is using the [`wordfreq`](https://pypi.org/project/wordfreq/) Python library, which combines data from multiple sources including:

- Google Books Ngram
- SUBTLEX (movie/TV subtitles)
- OpenSubtitles
- Wikipedia
- And many more sources

### Quick Start

1. **Install wordfreq:**
   ```bash
   pip3 install wordfreq
   # or if you need user install:
   pip3 install --user wordfreq
   ```

2. **Generate frequency database:**
   ```bash
   ./convert-frequency-db.sh
   ```
   
   Choose option 1 to generate from your saved words (recommended), or option 2 for a full database.

### Manual Generation

**From your saved words (best option):**
```bash
python3 generate-frequency-db.py --db public/KoboReader.sqlite
```

**Full database:**
```bash
python3 generate-frequency-db.py
```

### Why wordfreq is Better

✅ **Multiple sources** - Combines data from many corpora for accuracy  
✅ **40+ languages** - Supports many languages, not just English  
✅ **Well-maintained** - Actively developed and updated  
✅ **Easy to use** - Simple Python API  
✅ **No manual downloads** - Everything handled automatically  

### Supported Languages

wordfreq supports 40+ languages including:
- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)
- And many more...

See: https://pypi.org/project/wordfreq/ for full list

### How It Works

1. **From Saved Words (Recommended):**
   - Reads your saved words from `WordList` table
   - Looks up each word's frequency using wordfreq
   - Creates a ranked JSON database
   - Only processes words you've actually saved (faster!)

2. **Full Database:**
   - Attempts to access wordfreq's full word list
   - Creates a comprehensive frequency database
   - Takes longer but covers all words

### Example Usage

```python
from wordfreq import word_frequency, zipf_frequency

# Get word frequency (0-1 scale)
freq = word_frequency('cafe', 'en')  # 1.23e-05

# Get Zipf frequency (logarithmic scale, 0-8)
zipf = zipf_frequency('cafe', 'en')  # ~4.5
```

### Troubleshooting

**Installation fails?**
```bash
# Try with user flag
pip3 install --user wordfreq

# Or use system Python
python3 -m pip install wordfreq
```

**Database not generating?**
- Make sure wordfreq is installed: `python3 -c "import wordfreq"`
- Check that your Kobo database path is correct
- Try the manual generation command

**App not using new database?**
- Clear browser cache
- Restart dev server
- Check that `src/data/wordFrequency.json` exists

## Alternative: Manual Downloads (Older Method)

If you prefer not to use wordfreq, see the original methods below:

### Option 1: COCA (Corpus of Contemporary American English)

**Download:**
- Website: https://www.wordfrequency.info/
- Direct: https://www.wordfrequency.info/files/u/CoCA/CoCA-1grams.txt

### Option 2: Google Books Ngram

**Download:**
- Website: https://storage.googleapis.com/books/ngrams/books/datasetsv3.html
- Very large dataset (multiple GB)

### Option 3: Simple Word Lists

**GitHub:**
- https://github.com/first20hours/google-10000-english
- 10,000 most common words

---

**Recommendation:** Use wordfreq - it's easier, more accurate, and handles everything automatically!
