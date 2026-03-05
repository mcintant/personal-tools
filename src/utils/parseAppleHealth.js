// Utility to parse Apple Health export XML file

/**
 * Parse Apple Health XML export from a File object
 * @param {File} file - The XML file
 * @returns {Promise<Object>} Object with sleep and health records
 */
export async function parseAppleHealthXML(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const xmlText = e.target.result
        parseXMLString(xmlText).then(resolve).catch(reject)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsText(file)
  })
}

/**
 * Parse Apple Health XML export from a URL
 * @param {string} url - The URL to fetch the XML from
 * @returns {Promise<Object>} Object with sleep and health records
 */
export async function parseAppleHealthXMLFromURL(url) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch XML: ${response.statusText}`)
    }
    const xmlText = await response.text()
    return await parseXMLString(xmlText)
  } catch (error) {
    throw new Error(`Failed to load XML from URL: ${error.message}`)
  }
}

/**
 * Parse XML string and extract health data
 * @param {string} xmlText - The XML content as a string
 * @returns {Promise<Object>} Object with sleep and health records
 */
async function parseXMLString(xmlText) {
  return new Promise((resolve, reject) => {
    try {
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
      
      // Check for parsing errors
      const parserError = xmlDoc.querySelector('parsererror')
      if (parserError) {
        reject(new Error('Failed to parse XML: ' + parserError.textContent))
        return
      }
      
      // Extract sleep records
      const sleepRecords = extractSleepData(xmlDoc)
      
      // Extract other health data for correlation
      const healthRecords = extractHealthData(xmlDoc)
      
      resolve({
        sleep: sleepRecords,
        health: healthRecords
      })
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Extract sleep analysis records from XML
 */
function extractSleepData(xmlDoc) {
  const records = []
  const recordElements = xmlDoc.querySelectorAll('Record[type="HKCategoryTypeIdentifierSleepAnalysis"]')
  
  recordElements.forEach(record => {
    const type = record.getAttribute('type')
    const sourceName = record.getAttribute('sourceName')
    const startDate = record.getAttribute('startDate')
    const endDate = record.getAttribute('endDate')
    const value = record.getAttribute('value')
    
    // Process sleep records - values can be:
    // - HKCategoryValueSleepAnalysisAsleepCore
    // - HKCategoryValueSleepAnalysisAsleepREM
    // - HKCategoryValueSleepAnalysisAsleepDeep
    // - HKCategoryValueSleepAnalysisAsleepUnspecified
    // - HKCategoryValueSleepAnalysisAwake
    // - HKCategoryValueSleepAnalysisInBed
    // We want to include all "Asleep" variants
    if (type === 'HKCategoryTypeIdentifierSleepAnalysis' && 
        value && value.includes('Asleep')) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const duration = (end - start) / (1000 * 60) // Duration in minutes
      
      records.push({
        startDate: start,
        endDate: end,
        duration: duration,
        sourceName: sourceName,
        value: value
      })
    }
  })
  
  // Group consecutive sleep records into sleep sessions
  return groupSleepSessions(records)
}

/**
 * Group consecutive sleep records into sleep sessions
 */
function groupSleepSessions(records) {
  if (records.length === 0) return []
  
  // Sort by start date
  const sorted = [...records].sort((a, b) => a.startDate - b.startDate)
  
  const sessions = []
  let currentSession = null
  
  sorted.forEach(record => {
    if (!currentSession) {
      // Start new session
      currentSession = {
        startDate: record.startDate,
        endDate: record.endDate,
        duration: record.duration,
        sourceName: record.sourceName
      }
    } else {
      // Check if this record continues the session (within 30 minutes)
      const gap = (record.startDate - currentSession.endDate) / (1000 * 60)
      
      if (gap <= 30) {
        // Continue session
        currentSession.endDate = record.endDate
        currentSession.duration += record.duration
      } else {
        // End current session, start new one
        sessions.push(currentSession)
        currentSession = {
          startDate: record.startDate,
          endDate: record.endDate,
          duration: record.duration,
          sourceName: record.sourceName
        }
      }
    }
  })
  
  // Add last session
  if (currentSession) {
    sessions.push(currentSession)
  }
  
  return sessions.map(session => {
    // Calculate time to fall asleep (bedtime)
    const fallAsleepTime = session.startDate
    const wakeTime = session.endDate
    
    // Get date for the sleep session (the date when you went to bed)
    const sleepDate = new Date(fallAsleepTime)
    sleepDate.setHours(0, 0, 0, 0)
    
    // If fall asleep time is before 6 AM, consider it part of previous day
    if (fallAsleepTime.getHours() < 6) {
      sleepDate.setDate(sleepDate.getDate() - 1)
    }
    
    return {
      ...session,
      fallAsleepTime: fallAsleepTime,
      wakeTime: wakeTime,
      sleepDate: sleepDate,
      durationHours: session.duration / 60
    }
  })
}

/**
 * Extract other health data for correlation analysis
 */
function extractHealthData(xmlDoc) {
  const healthData = {
    steps: [],
    activeEnergy: [],
    dietaryEnergy: [],
    heartRate: [],
    workouts: []
  }
  
  // Extract steps
  const stepRecords = xmlDoc.querySelectorAll('Record[type="HKQuantityTypeIdentifierStepCount"]')
  stepRecords.forEach(record => {
    const date = new Date(record.getAttribute('startDate'))
    const value = parseFloat(record.getAttribute('value') || 0)
    healthData.steps.push({ date, value })
  })
  
  // Extract active energy (calories)
  const energyRecords = xmlDoc.querySelectorAll('Record[type="HKQuantityTypeIdentifierActiveEnergyBurned"]')
  energyRecords.forEach(record => {
    const date = new Date(record.getAttribute('startDate'))
    const value = parseFloat(record.getAttribute('value') || 0)
    healthData.activeEnergy.push({ date, value })
  })
  
  // Extract dietary energy
  const dietaryRecords = xmlDoc.querySelectorAll('Record[type="HKQuantityTypeIdentifierDietaryEnergyConsumed"]')
  dietaryRecords.forEach(record => {
    const date = new Date(record.getAttribute('startDate'))
    const value = parseFloat(record.getAttribute('value') || 0)
    healthData.dietaryEnergy.push({ date, value })
  })
  
  // Extract heart rate
  const heartRateRecords = xmlDoc.querySelectorAll('Record[type="HKQuantityTypeIdentifierHeartRate"]')
  heartRateRecords.forEach(record => {
    const date = new Date(record.getAttribute('startDate'))
    const value = parseFloat(record.getAttribute('value') || 0)
    healthData.heartRate.push({ date, value })
  })
  
  // Extract workouts
  const workoutRecords = xmlDoc.querySelectorAll('Workout')
  workoutRecords.forEach(record => {
    const date = new Date(record.getAttribute('startDate'))
    const workoutType = record.getAttribute('workoutActivityType')
    healthData.workouts.push({ date, type: workoutType })
  })
  
  return healthData
}

/**
 * Calculate correlation coefficient between two arrays
 */
export function calculateCorrelation(x, y) {
  if (x.length !== y.length || x.length === 0) return null
  
  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0)
  
  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  
  if (denominator === 0) return null
  
  return numerator / denominator
}

/**
 * Round time to nearest 15-minute increment
 */
export function roundTo15Minutes(date) {
  const minutes = date.getMinutes()
  const rounded = Math.floor(minutes / 15) * 15
  const roundedDate = new Date(date)
  roundedDate.setMinutes(rounded, 0, 0)
  return roundedDate
}

/**
 * Get EST hour from a date (0-23)
 */
export function getESTHour(date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    hour12: false
  })
  return parseInt(formatter.format(date))
}

/**
 * Get EST minute from a date (0-59)
 */
export function getESTMinute(date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    minute: 'numeric'
  })
  return parseInt(formatter.format(date))
}

/**
 * Format time in 12-hour AM/PM format
 */
export function formatTime12Hour(date) {
  const estDate = toEST(date)
  return estDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  })
}

/**
 * Get 15-minute time bucket label in EST with AM/PM
 */
export function getTimeBucketLabel(date) {
  const rounded = roundTo15Minutes(date)
  const estDate = toEST(rounded)
  return estDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  })
}

/**
 * Get time bucket range label in EST with AM/PM
 */
export function getTimeBucketRangeLabel(date) {
  const rounded = roundTo15Minutes(date)
  const next = new Date(rounded)
  next.setMinutes(next.getMinutes() + 15)
  
  const time1 = rounded.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  })
  const time2 = next.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  })
  
  return `${time1} - ${time2}`
}

