# Saved Words Analysis Feature

This feature extracts your saved words from the Kobo database and prioritizes them by frequency to help you learn the most valuable vocabulary first.

## How It Works

1. **Extracts Words**: Reads all saved words from the `WordList` table in your Kobo database
2. **Frequency Analysis**: Compares each word against a frequency database to determine how common it is
3. **Prioritization**: Sorts words by rarity - less common words are prioritized for learning
4. **Categorization**: Words are grouped into 5 categories:
   - **Very Common** (rank 1-100): Basic words you likely know
   - **Common** (rank 101-1000): Everyday vocabulary
   - **Uncommon** (rank 1001-10000): Less frequent but useful
   - **Rare** (rank 10001-50000): Advanced vocabulary
   - **Very Rare** (rank 50000+): Specialized or obscure words

## Features

- **Filter by Language**: View words from specific dictionaries
- **Filter by Category**: Focus on rare/uncommon words to learn
- **Sort Options**:
  - **Priority** (default): Shows rare words first - best for learning
  - **Alphabetical**: Browse alphabetically
  - **Date Saved**: See recently saved words
- **Category Summary**: Quick overview of word distribution
- **Visual Indicators**: Color-coded categories for easy identification

## Learning Strategy

**Focus on Rare Words First**: Words marked as "Very Rare" or "Rare" are less common in everyday English. Learning these will:
- Expand your vocabulary significantly
- Help you understand advanced texts
- Make you stand out in writing and conversation

**Common Words**: If you see common words in your list, you might want to review them to ensure you understand all their meanings and usage.

## Frequency Database

The current frequency database includes:
- Top 100 most common English words
- Sample of words ranked 101-1000
- Your saved words (automatically added)

### Expanding the Database

To improve accuracy, you can:

1. **Add More Words**: Edit `src/utils/wordFrequency.js` and add more words with their ranks
2. **Import External Data**: Use frequency lists from:
   - Google Books Ngram Viewer
   - COCA (Corpus of Contemporary American English)
   - BNC (British National Corpus)
   - Wiktionary frequency lists

3. **Load from File**: Modify `loadFrequencyDatabase()` to fetch from a JSON/CSV file

## Example Usage

1. **View All Words**: See all your saved words sorted by priority
2. **Focus on Learning**: Filter to show only "Very Rare" and "Rare" words
3. **Review by Language**: Filter by dictionary suffix (e.g., "-en" for English)
4. **Track Progress**: See when words were saved to track your learning journey

## Technical Details

- **Table**: `WordList` in KoboReader.sqlite
- **Columns Used**: `Text`, `VolumeId`, `DictSuffix`, `DateCreated`
- **Frequency Source**: Embedded database in `wordFrequency.js`
- **Priority Algorithm**: Lower frequency rank = higher learning priority

## Future Enhancements

Possible improvements:
- [ ] Import full frequency database from external source
- [ ] Track word learning progress (mark as learned)
- [ ] Spaced repetition reminders
- [ ] Export word lists for flashcards
- [ ] Definitions integration
- [ ] Usage examples from your books



