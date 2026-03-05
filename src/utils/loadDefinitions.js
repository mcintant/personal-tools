// Load word definitions from words.csv (source of truth)

import { loadWordsCSV, getDefinitionsData } from './loadWordsCSV';

let cachedDefinitions = null;

export async function loadDefinitionsDatabase() {
  // Return cached data if available
  if (cachedDefinitions) {
    return cachedDefinitions;
  }

  // Try to load from CSV first (source of truth)
  try {
    const csvData = await loadWordsCSV();
    if (csvData && Object.keys(csvData.definitions).length > 0) {
      cachedDefinitions = csvData.definitions;
      console.log(`✅ Loaded definitions database from CSV with ${Object.keys(csvData.definitions).length} words`);
      return csvData.definitions;
    }
  } catch (error) {
    console.log('Could not load from CSV, trying JSON fallback:', error);
  }

  // Fallback to JSON files
  const pathsToTry = [
    '/data/wordDefinitions.json',  // If file is in public/data/
    '/src/data/wordDefinitions.json',  // If file is in src/data/ (dev mode)
    './data/wordDefinitions.json',  // Relative path
  ];

  for (const path of pathsToTry) {
    try {
      const response = await fetch(path);
      
      if (response.ok) {
        const data = await response.json();
        cachedDefinitions = data;
        console.log(`✅ Loaded definitions database from ${path} with ${Object.keys(data).length} words`);
        return data;
      }
    } catch (error) {
      // Try next path
      continue;
    }
  }

  console.warn('⚠️ Could not load definitions database from any path, will fetch live from API');
  return null;
}

// Get definition for a word from local database
export function getLocalDefinition(word, definitionsData) {
  if (!word || !definitionsData) return null;
  
  const normalized = word.toLowerCase().trim();
  return definitionsData[normalized] || null;
}

