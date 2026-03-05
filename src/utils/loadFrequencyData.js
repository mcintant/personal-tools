// Load frequency database from words.csv (source of truth)

import { loadWordsCSV, getFrequencyData } from './loadWordsCSV';

let cachedFrequencyData = null;
let cachedZipfData = null;

export async function loadFrequencyDatabase() {
  // Return cached data if available
  if (cachedFrequencyData) {
    return cachedFrequencyData;
  }

  // Try to load from CSV first (source of truth)
  try {
    const csvData = await loadWordsCSV();
    if (csvData && Object.keys(csvData.frequency).length > 0) {
      cachedFrequencyData = csvData.frequency;
      cachedZipfData = csvData.zipf;
      console.log(`✅ Loaded frequency database from CSV with ${Object.keys(csvData.frequency).length} words`);
      return csvData.frequency;
    }
  } catch (error) {
    console.log('Could not load from CSV, trying JSON fallback:', error);
  }

  // Fallback to JSON file
  try {
    const response = await fetch('/src/data/wordFrequency.json');
    
    if (response.ok) {
      const data = await response.json();
      
      // Check if data has enhanced format (with zipf) or simple format (just ranks)
      const firstKey = Object.keys(data)[0];
      if (data[firstKey] && typeof data[firstKey] === 'object' && 'rank' in data[firstKey]) {
        // Enhanced format with rank and zipf
        const rankMap = {};
        const zipfMap = {};
        for (const [word, info] of Object.entries(data)) {
          rankMap[word] = info.rank;
          zipfMap[word] = info.zipf;
        }
        cachedFrequencyData = rankMap;
        cachedZipfData = zipfMap;
        console.log(`✅ Loaded frequency database from JSON with ${Object.keys(data).length} words (with Zipf frequencies)`);
        return rankMap;
      } else {
        // Simple format (just ranks)
        cachedFrequencyData = data;
        console.log(`✅ Loaded frequency database from JSON with ${Object.keys(data).length} words`);
        return data;
      }
    }
  } catch (error) {
    console.log('Could not load external frequency database, using embedded list');
  }

  // Fallback to embedded list
  const { wordFrequencyRank } = await import('./wordFrequency.js');
  cachedFrequencyData = wordFrequencyRank;
  return wordFrequencyRank;
}

export async function getZipfFrequency(word) {
  if (!word) return null;
  
  const normalized = word.toLowerCase().trim();
  
  // Try CSV first
  if (cachedZipfData) {
    return cachedZipfData[normalized] || null;
  }
  
  // Try to load from CSV
  try {
    const csvData = await loadWordsCSV();
    if (csvData && csvData.zipf) {
      cachedZipfData = csvData.zipf;
      return csvData.zipf[normalized] || null;
    }
  } catch (error) {
    // Fall through to JSON fallback
  }
  
  // Fallback to JSON
  try {
    const response = await fetch('/src/data/wordFrequency.json');
    if (response.ok) {
      const data = await response.json();
      const firstKey = Object.keys(data)[0];
      if (data[firstKey] && typeof data[firstKey] === 'object' && 'zipf' in data[firstKey]) {
        const zipfMap = {};
        for (const [w, info] of Object.entries(data)) {
          zipfMap[w] = info.zipf;
        }
        cachedZipfData = zipfMap;
        return zipfMap[normalized] || null;
      }
    }
  } catch (error) {
    return null;
  }
  
  return null;
}

// Get the full frequency data (with both rank and zipf if available)
let cachedFullData = null;

export async function loadFullFrequencyData() {
  if (cachedFullData) {
    return cachedFullData;
  }

  // Try CSV first (source of truth)
  try {
    const csvData = await loadWordsCSV();
    if (csvData && Object.keys(csvData.frequency).length > 0) {
      // Convert to format expected by existing code: { word: { rank: X, zipf: Y } }
      const fullData = {};
      for (const [word, rank] of Object.entries(csvData.frequency)) {
        fullData[word] = {
          rank: rank,
          zipf: csvData.zipf[word] || 0
        };
      }
      cachedFullData = fullData;
      console.log(`✅ Loaded full frequency data from CSV with ${Object.keys(fullData).length} words`);
      return fullData;
    }
  } catch (error) {
    console.log('Could not load from CSV, trying JSON fallback:', error);
  }

  // Fallback to JSON
  try {
    const response = await fetch('/src/data/wordFrequency.json');
    if (response.ok) {
      const data = await response.json();
      cachedFullData = data;
      return data;
    }
  } catch (error) {
    console.log('Could not load frequency database');
  }

  return null;
}
