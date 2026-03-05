// Load words, frequency, and definitions from words.csv (source of truth)

let cachedCSVData = null;

/**
 * Parse CSV text into structured data
 */
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return { words: {}, frequency: {}, zipf: {}, definitions: {} };
  
  // Parse header
  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const wordIndex = header.indexOf('Word');
  const rankIndex = header.indexOf('Frequency Rank');
  const zipfIndex = header.indexOf('Zipf Frequency');
  const defIndex = header.indexOf('Definition');
  
  if (wordIndex === -1) {
    console.error('CSV header missing "Word" column');
    return { words: {}, frequency: {}, zipf: {}, definitions: {} };
  }
  
  const words = {};
  const frequency = {};
  const zipf = {};
  const definitions = {};
  
  // Parse CSV rows (handle quoted fields with commas)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Simple CSV parser that handles quoted fields
    const row = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = j < line.length - 1 ? line[j + 1] : '';
      
      if (char === '"') {
        // Handle escaped quotes ("")
        if (inQuotes && nextChar === '"') {
          current += '"';
          j++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim()); // Add last field
    
    if (row.length <= wordIndex) continue;
    
    const word = row[wordIndex].replace(/^"|"$/g, '').trim();
    if (!word) continue;
    
    const normalized = word.toLowerCase();
    words[normalized] = word; // Store original case
    
    // Parse frequency rank
    if (rankIndex !== -1 && rankIndex < row.length && row[rankIndex]) {
      const rank = row[rankIndex].replace(/^"|"$/g, '').trim();
      if (rank && rank !== '' && rank !== '100000') { // Skip placeholder ranks
        const rankNum = parseInt(rank, 10);
        if (!isNaN(rankNum) && rankNum > 0) {
          frequency[normalized] = rankNum;
        }
      }
    }
    
    // Parse Zipf frequency
    if (zipfIndex !== -1 && zipfIndex < row.length && row[zipfIndex]) {
      const zipfVal = row[zipfIndex].replace(/^"|"$/g, '').trim();
      if (zipfVal && zipfVal !== '' && zipfVal !== '0') {
        const zipfNum = parseFloat(zipfVal);
        if (!isNaN(zipfNum) && zipfNum > 0) {
          zipf[normalized] = zipfNum;
        }
      }
    }
    
    // Parse definition
    if (defIndex !== -1 && defIndex < row.length && row[defIndex]) {
      const def = row[defIndex].replace(/^"|"$/g, '').trim();
      if (def && def !== '') {
        // Convert CSV definition string to JSON format for compatibility
        definitions[normalized] = convertCSVDefinitionToJSON(def, word);
      }
    }
  }
  
  return { words, frequency, zipf, definitions };
}

/**
 * Convert CSV definition string to JSON format compatible with existing code
 */
function convertCSVDefinitionToJSON(csvDef, word) {
  // CSV format: "(noun) def1; def2 | (verb) def3; def4"
  const meanings = [];
  
  // Split by | to get different parts of speech
  const parts = csvDef.split('|').map(p => p.trim());
  
  for (const part of parts) {
    // Check if it starts with (partOfSpeech)
    const posMatch = part.match(/^\(([^)]+)\)\s*(.+)$/);
    
    if (posMatch) {
      const pos = posMatch[1].trim();
      const defsText = posMatch[2].trim();
      const defs = defsText.split(';').map(d => d.trim()).filter(d => d);
      
      meanings.push({
        partOfSpeech: pos,
        definitions: defs.map(def => ({
          definition: def,
          example: '',
          synonyms: [],
          antonyms: []
        }))
      });
    } else {
      // No part of speech specified, treat as general definition
      const defs = part.split(';').map(d => d.trim()).filter(d => d);
      if (defs.length > 0) {
        meanings.push({
          partOfSpeech: '',
          definitions: defs.map(def => ({
            definition: def,
            example: '',
            synonyms: [],
            antonyms: []
          }))
        });
      }
    }
  }
  
  return {
    word: word.toLowerCase(),
    phonetic: '',
    meanings: meanings.length > 0 ? meanings : [{
      partOfSpeech: '',
      definitions: [{
        definition: csvDef,
        example: '',
        synonyms: [],
        antonyms: []
      }]
    }]
  };
}

/**
 * Load words.csv file and parse it
 */
export async function loadWordsCSV() {
  if (cachedCSVData) {
    return cachedCSVData;
  }
  
  const pathsToTry = [
    '/words.csv',  // If file is in public/
    '/public/words.csv',
    './words.csv',
    '/src/words.csv'
  ];
  
  for (const path of pathsToTry) {
    try {
      const response = await fetch(path);
      
      if (response.ok) {
        const csvText = await response.text();
        const parsed = parseCSV(csvText);
        cachedCSVData = parsed;
        console.log(`✅ Loaded words.csv from ${path} with ${Object.keys(parsed.words).length} words`);
        return parsed;
      }
    } catch (error) {
      // Try next path
      continue;
    }
  }
  
  console.warn('⚠️ Could not load words.csv from any path');
  return { words: {}, frequency: {}, zipf: {}, definitions: {} };
}

/**
 * Get frequency rank for a word
 */
export function getFrequencyRank(word) {
  if (!word || !cachedCSVData) return null;
  const normalized = word.toLowerCase().trim();
  return cachedCSVData.frequency[normalized] || null;
}

/**
 * Get Zipf frequency for a word
 */
export function getZipfFrequency(word) {
  if (!word || !cachedCSVData) return null;
  const normalized = word.toLowerCase().trim();
  return cachedCSVData.zipf[normalized] || null;
}

/**
 * Get definition for a word
 */
export function getDefinition(word) {
  if (!word || !cachedCSVData) return null;
  const normalized = word.toLowerCase().trim();
  return cachedCSVData.definitions[normalized] || null;
}

/**
 * Get all frequency data (rank map)
 */
export function getFrequencyData() {
  if (!cachedCSVData) return null;
  return cachedCSVData.frequency;
}

/**
 * Get all definitions data
 */
export function getDefinitionsData() {
  if (!cachedCSVData) return null;
  return cachedCSVData.definitions;
}

/**
 * Get full frequency data (with both rank and zipf)
 */
export function getFullFrequencyData() {
  if (!cachedCSVData) return null;
  
  // Convert to format expected by existing code: { word: { rank: X, zipf: Y } }
  const fullData = {};
  for (const [word, rank] of Object.entries(cachedCSVData.frequency)) {
    fullData[word] = {
      rank: rank,
      zipf: cachedCSVData.zipf[word] || 0
    };
  }
  
  return fullData;
}

