// Word frequency data - Common English words ranked by frequency
// Lower rank = more common, higher rank = less common
// This is a simplified list - you can expand it with a full frequency database

export const wordFrequencyRank = {
  // Most common words (rank 1-100)
  'the': 1, 'be': 2, 'to': 3, 'of': 4, 'and': 5, 'a': 6, 'in': 7, 'that': 8, 'have': 9, 'i': 10,
  'it': 11, 'for': 12, 'not': 13, 'on': 14, 'with': 15, 'he': 16, 'as': 17, 'you': 18, 'do': 19, 'at': 20,
  'this': 21, 'but': 22, 'his': 23, 'by': 24, 'from': 25, 'they': 26, 'we': 27, 'say': 28, 'her': 29, 'she': 30,
  'or': 31, 'an': 32, 'will': 33, 'my': 34, 'one': 35, 'all': 36, 'would': 37, 'there': 38, 'their': 39, 'what': 40,
  'so': 41, 'up': 42, 'out': 43, 'if': 44, 'about': 45, 'who': 46, 'get': 47, 'which': 48, 'go': 49, 'me': 50,
  'when': 51, 'make': 52, 'can': 53, 'like': 54, 'time': 55, 'no': 56, 'just': 57, 'him': 58, 'know': 59, 'take': 60,
  'people': 61, 'into': 62, 'year': 63, 'your': 64, 'good': 65, 'some': 66, 'could': 67, 'them': 68, 'see': 69, 'other': 70,
  'than': 71, 'then': 72, 'now': 73, 'look': 74, 'only': 75, 'come': 76, 'its': 77, 'over': 78, 'think': 79, 'also': 80,
  'back': 81, 'after': 82, 'use': 83, 'two': 84, 'how': 85, 'our': 86, 'work': 87, 'first': 88, 'well': 89, 'way': 90,
  'even': 91, 'new': 92, 'want': 93, 'because': 94, 'any': 95, 'these': 96, 'give': 97, 'day': 98, 'most': 99, 'us': 100,
  
  // Common words (rank 101-1000) - sample
  'man': 150, 'world': 200, 'life': 250, 'hand': 300, 'part': 350, 'child': 400, 'eye': 450, 'woman': 500,
  'place': 550, 'work': 600, 'week': 650, 'case': 700, 'point': 750, 'government': 800, 'company': 850, 'number': 900, 'group': 950, 'problem': 1000,
  
  // Less common words get higher ranks
  'intimations': 50000, 'meretricious': 60000, 'sardonic': 40000, 'distended': 45000, 'strychnine': 70000
};

// Get frequency rank for a word (case-insensitive)
// This is the synchronous version - use loadFrequencyData.js for async loading
export function getWordFrequencyRank(word, frequencyData = null) {
  if (!word) return 100000; // Unknown words get high rank (less common)
  const normalized = word.toLowerCase().trim();
  const data = frequencyData || wordFrequencyRank;
  
  // Handle enhanced format (with rank and zipf)
  if (data[normalized] && typeof data[normalized] === 'object' && 'rank' in data[normalized]) {
    return data[normalized].rank;
  }
  
  // Handle simple format (just rank number)
  return data[normalized] || 100000;
}

// Categorize words by frequency
// Uses Zipf scale if available, otherwise falls back to rank
export function categorizeWord(word, frequencyData = null, zipfFrequency = null) {
  // If we have Zipf frequency (from wordfreq), use that for more accurate categorization
  // Zipf scale: 0-8, where higher = more common
  // 7-8: Very common (the, be, to, etc.)
  // 5-6: Common (everyday words)
  // 3-4: Uncommon (less frequent but still used)
  // 1-2: Rare (specialized vocabulary)
  // 0: Very rare or not found
  
  if (zipfFrequency !== null && zipfFrequency > 0) {
    if (zipfFrequency >= 6.5) {
      return { category: 'very-common', label: 'Very Common', priority: 1 };
    } else if (zipfFrequency >= 5.0) {
      return { category: 'common', label: 'Common', priority: 2 };
    } else if (zipfFrequency >= 3.5) {
      return { category: 'uncommon', label: 'Uncommon', priority: 3 };
    } else if (zipfFrequency >= 2.0) {
      return { category: 'rare', label: 'Rare', priority: 4 };
    } else {
      return { category: 'very-rare', label: 'Very Rare', priority: 5 };
    }
  }
  
  // Fallback to rank-based categorization (for words not in frequency database)
  const rank = getWordFrequencyRank(word, frequencyData);
  
  // Adjusted thresholds based on typical word frequency distributions
  // Most words will be in the middle categories
  if (rank <= 50) return { category: 'very-common', label: 'Very Common', priority: 1 };
  if (rank <= 200) return { category: 'common', label: 'Common', priority: 2 };
  if (rank <= 500) return { category: 'uncommon', label: 'Uncommon', priority: 3 };
  if (rank <= 1000) return { category: 'rare', label: 'Rare', priority: 4 };
  return { category: 'very-rare', label: 'Very Rare', priority: 5 };
}

// Prioritize words for learning (less common = higher priority)
export function prioritizeWords(words, frequencyData = null, fullFrequencyData = null) {
  // fullFrequencyData contains the enhanced format with {rank, zipf}
  // frequencyData is just the rank map (for backward compatibility)
  
  return words.map(word => {
    const normalized = word.text.toLowerCase().trim()
    let zipf = null
    let rank = 100000
    
    // Try to get from fullFrequencyData first (enhanced format)
    if (fullFrequencyData && fullFrequencyData[normalized]) {
      const wordData = fullFrequencyData[normalized]
      if (typeof wordData === 'object' && 'rank' in wordData) {
        rank = wordData.rank
        zipf = wordData.zipf || null
      } else {
        rank = wordData
      }
    } else if (frequencyData) {
      // Fallback to simple format
      rank = getWordFrequencyRank(word.text, frequencyData)
    }
    
    return {
      ...word,
      frequencyRank: rank,
      zipfFrequency: zipf,
      category: categorizeWord(word.text, frequencyData, zipf)
    }
  }).sort((a, b) => {
    // Sort by priority (higher priority = less common = should learn first)
    // Then by date (newer words first)
    if (b.category.priority !== a.category.priority) {
      return b.category.priority - a.category.priority;
    }
    // If same priority, newer words first
    return new Date(b.dateCreated) - new Date(a.dateCreated);
  });
}

// Load a more comprehensive frequency list (optional - can be loaded from a file)
export async function loadFrequencyDatabase() {
  // In the future, you could load a full frequency database from:
  // - Google Books Ngram data
  // - COCA (Corpus of Contemporary American English)
  // - BNC (British National Corpus)
  // For now, we use the embedded list above
  return wordFrequencyRank;
}

