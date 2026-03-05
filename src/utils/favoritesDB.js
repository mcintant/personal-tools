// IndexedDB utility for storing favorite words
// Uses IndexedDB for persistent client-side storage

const DB_NAME = 'KoboReaderFavorites'
const DB_VERSION = 1
const STORE_NAME = 'favorites'

let dbInstance = null

/**
 * Initialize IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
function initDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'))
    }

    request.onsuccess = (event) => {
      dbInstance = event.target.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'word' })
        objectStore.createIndex('word', 'word', { unique: true })
        objectStore.createIndex('dateAdded', 'dateAdded', { unique: false })
      }
    }
  })
}

/**
 * Get all favorite words
 * @returns {Promise<Set<string>>}
 */
export async function getFavorites() {
  try {
    const db = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        const favorites = new Set(request.result.map(item => item.word.toLowerCase().trim()))
        resolve(favorites)
      }

      request.onerror = () => {
        reject(new Error('Failed to get favorites'))
      }
    })
  } catch (error) {
    console.error('Error getting favorites:', error)
    return new Set()
  }
}

/**
 * Check if a word is favorited
 * @param {string} word
 * @returns {Promise<boolean>}
 */
export async function isFavorite(word) {
  if (!word) return false
  
  try {
    const db = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const normalized = word.toLowerCase().trim()
      const request = store.get(normalized)

      request.onsuccess = () => {
        resolve(!!request.result)
      }

      request.onerror = () => {
        reject(new Error('Failed to check favorite'))
      }
    })
  } catch (error) {
    console.error('Error checking favorite:', error)
    return false
  }
}

/**
 * Add a word to favorites
 * @param {string} word
 * @returns {Promise<void>}
 */
export async function addFavorite(word) {
  if (!word) return

  try {
    const db = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const normalized = word.toLowerCase().trim()
      
      const favorite = {
        word: normalized,
        originalWord: word,
        dateAdded: new Date().toISOString()
      }

      const request = store.put(favorite)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(new Error('Failed to add favorite'))
      }
    })
  } catch (error) {
    console.error('Error adding favorite:', error)
    throw error
  }
}

/**
 * Remove a word from favorites
 * @param {string} word
 * @returns {Promise<void>}
 */
export async function removeFavorite(word) {
  if (!word) return

  try {
    const db = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const normalized = word.toLowerCase().trim()
      const request = store.delete(normalized)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(new Error('Failed to remove favorite'))
      }
    })
  } catch (error) {
    console.error('Error removing favorite:', error)
    throw error
  }
}

/**
 * Toggle favorite status of a word
 * @param {string} word
 * @returns {Promise<boolean>} Returns true if favorited, false if unfavorited
 */
export async function toggleFavorite(word) {
  if (!word) return false

  const isFav = await isFavorite(word)
  if (isFav) {
    await removeFavorite(word)
    return false
  } else {
    await addFavorite(word)
    return true
  }
}

/**
 * Get favorite count
 * @returns {Promise<number>}
 */
export async function getFavoriteCount() {
  try {
    const favorites = await getFavorites()
    return favorites.size
  } catch (error) {
    console.error('Error getting favorite count:', error)
    return 0
  }
}

