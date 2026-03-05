// IndexedDB utility for storing health data
// Uses IndexedDB for persistent client-side storage

const DB_NAME = 'KoboReaderHealth'
const DB_VERSION = 1
const STORE_NAME = 'healthData'

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
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
        objectStore.createIndex('date', 'date', { unique: false })
        objectStore.createIndex('type', 'type', { unique: false })
      }
    }
  })
}

/**
 * Add health data entry
 * @param {Object} data - Health data object with date, type, and value
 * @returns {Promise<number>} ID of the added entry
 */
export async function addHealthData(data) {
  try {
    const db = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      
      const entry = {
        date: data.date || new Date().toISOString(),
        type: data.type, // e.g., 'weight', 'blood_pressure', 'heart_rate', 'steps', etc.
        value: data.value,
        notes: data.notes || '',
        createdAt: new Date().toISOString()
      }

      const request = store.add(entry)

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        reject(new Error('Failed to add health data'))
      }
    })
  } catch (error) {
    console.error('Error adding health data:', error)
    throw error
  }
}

/**
 * Get all health data
 * @param {string} type - Optional filter by type
 * @returns {Promise<Array>}
 */
export async function getAllHealthData(type = null) {
  try {
    const db = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        let data = request.result
        
        // Sort by date (newest first)
        data.sort((a, b) => new Date(b.date) - new Date(a.date))
        
        // Filter by type if provided
        if (type) {
          data = data.filter(entry => entry.type === type)
        }
        
        resolve(data)
      }

      request.onerror = () => {
        reject(new Error('Failed to get health data'))
      }
    })
  } catch (error) {
    console.error('Error getting health data:', error)
    return []
  }
}

/**
 * Get health data by date range
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {string} type - Optional filter by type
 * @returns {Promise<Array>}
 */
export async function getHealthDataByDateRange(startDate, endDate, type = null) {
  try {
    const allData = await getAllHealthData(type)
    return allData.filter(entry => {
      const entryDate = new Date(entry.date)
      return entryDate >= startDate && entryDate <= endDate
    })
  } catch (error) {
    console.error('Error getting health data by date range:', error)
    return []
  }
}

/**
 * Delete health data entry
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteHealthData(id) {
  try {
    const db = await initDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(new Error('Failed to delete health data'))
      }
    })
  } catch (error) {
    console.error('Error deleting health data:', error)
    throw error
  }
}

/**
 * Get available health data types
 * @returns {Promise<Array<string>>}
 */
export async function getHealthDataTypes() {
  try {
    const allData = await getAllHealthData()
    const types = new Set(allData.map(entry => entry.type))
    return Array.from(types).sort()
  } catch (error) {
    console.error('Error getting health data types:', error)
    return []
  }
}

