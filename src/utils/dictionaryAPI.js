// Dictionary API utilities for fetching word definitions
// Uses Free Dictionary API (no API key required)

const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';

// Cache for definitions to avoid repeated API calls
const definitionCache = new Map();

/**
 * Fetch word definition from Free Dictionary API
 * @param {string} word - The word to look up
 * @returns {Promise<Object|null>} Definition object or null if not found
 */
export async function fetchWordDefinition(word) {
  if (!word || !word.trim()) {
    return null;
  }

  const normalizedWord = word.toLowerCase().trim();

  // Check cache first
  if (definitionCache.has(normalizedWord)) {
    return definitionCache.get(normalizedWord);
  }

  try {
    const response = await fetch(`${API_BASE}/${encodeURIComponent(normalizedWord)}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        // Word not found
        definitionCache.set(normalizedWord, null);
        return null;
      }
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (Array.isArray(data) && data.length > 0) {
      const definition = parseDefinition(data[0]);
      definitionCache.set(normalizedWord, definition);
      return definition;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching definition for "${word}":`, error);
    return null;
  }
}

/**
 * Parse API response into a simpler format
 * @param {Object} apiData - Raw API response
 * @returns {Object} Parsed definition
 */
function parseDefinition(apiData) {
  const result = {
    word: apiData.word || '',
    phonetic: apiData.phonetic || (apiData.phonetics && apiData.phonetics[0]?.text) || '',
    meanings: [],
    source: 'Free Dictionary API'
  };

  if (apiData.meanings && Array.isArray(apiData.meanings)) {
    result.meanings = apiData.meanings.map(meaning => ({
      partOfSpeech: meaning.partOfSpeech || '',
      definitions: (meaning.definitions || []).map(def => ({
        definition: def.definition || '',
        example: def.example || null,
        synonyms: def.synonyms || [],
        antonyms: def.antonyms || []
      }))
    }));
  }

  return result;
}

/**
 * Get a short definition (first definition) for quick display
 * @param {Object} definition - Full definition object
 * @returns {string} Short definition text
 */
export function getShortDefinition(definition) {
  if (!definition || !definition.meanings || definition.meanings.length === 0) {
    return null;
  }

  const firstMeaning = definition.meanings[0];
  if (firstMeaning.definitions && firstMeaning.definitions.length > 0) {
    return firstMeaning.definitions[0].definition;
  }

  return null;
}

/**
 * Format definition for display
 * @param {Object} definition - Full definition object
 * @returns {string} Formatted definition text
 */
export function formatDefinition(definition) {
  if (!definition) return 'No definition available';

  let formatted = '';

  if (definition.phonetic) {
    formatted += `[${definition.phonetic}]\n\n`;
  }

  definition.meanings.forEach((meaning, index) => {
    if (index > 0) formatted += '\n';
    formatted += `(${meaning.partOfSpeech})\n`;
    
    meaning.definitions.forEach((def, defIndex) => {
      formatted += `${defIndex + 1}. ${def.definition}\n`;
      if (def.example) {
        formatted += `   Example: "${def.example}"\n`;
      }
    });
  });

  return formatted.trim();
}

/**
 * Clear the definition cache
 */
export function clearDefinitionCache() {
  definitionCache.clear();
}



