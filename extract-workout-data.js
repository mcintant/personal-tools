#!/usr/bin/env node
/**
 * Extract workout records from Apple Health XML and calculate correlations with sleep
 */

import { createReadStream, writeFileSync, statSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Apple Health workout activity types
// Running types
const RUNNING_TYPES = [
  'HKWorkoutActivityTypeRunning',
  'HKWorkoutActivityTypeRunningTreadmill',
  'HKWorkoutActivityTypeRunningTrail',
  'HKWorkoutActivityTypeRunningTrack',
  'HKWorkoutActivityTypeRunningRoad'
]

// Strength training types
const STRENGTH_TYPES = [
  'HKWorkoutActivityTypeTraditionalStrengthTraining',
  'HKWorkoutActivityTypeFunctionalStrengthTraining',
  'HKWorkoutActivityTypeCoreTraining',
  'HKWorkoutActivityTypeFlexibility',
  'HKWorkoutActivityTypeYoga'
]

function extractWorkouts(filePath) {
  return new Promise((resolve, reject) => {
    const workouts = []
    let inWorkout = false
    let workoutBuffer = ''
    let processed = 0
    let totalWorkouts = 0
    
    const rl = createInterface({
      input: createReadStream(filePath),
      crlfDelay: Infinity
    })
    
    rl.on('line', (line) => {
      // Check if this line starts a new workout
      if (line.includes('<Workout') && !line.includes('</Workout>')) {
        // If we were already in a workout, process the previous one first
        if (inWorkout) {
          processWorkout(workoutBuffer)
          workoutBuffer = ''
        }
        inWorkout = true
        workoutBuffer = line.trim()
        totalWorkouts++
      } else if (line.includes('<Workout') && line.includes('</Workout>')) {
        // Self-closing workout tag (shouldn't happen but handle it)
        if (inWorkout) {
          processWorkout(workoutBuffer)
          workoutBuffer = ''
        }
        workoutBuffer = line.trim()
        processWorkout(workoutBuffer)
        workoutBuffer = ''
        inWorkout = false
        totalWorkouts++
      } else if (inWorkout) {
        workoutBuffer += ' ' + line.trim()
        
        // Check if workout is complete
        if (line.includes('</Workout>')) {
          processWorkout(workoutBuffer)
          inWorkout = false
          workoutBuffer = ''
        }
      }
    })
    
    function processWorkout(workoutXml) {
      // Extract attributes - handle both single-line and multi-line XML
      const startDateMatch = workoutXml.match(/startDate="([^"]*)"/)
      const endDateMatch = workoutXml.match(/endDate="([^"]*)"/)
      const activityTypeMatch = workoutXml.match(/workoutActivityType="([^"]*)"/)
      const durationMatch = workoutXml.match(/duration="([^"]*)"/)
      const totalEnergyBurnedMatch = workoutXml.match(/totalEnergyBurned="([^"]*)"/)
      const totalDistanceMatch = workoutXml.match(/totalDistance="([^"]*)"/)
      
      if (startDateMatch && activityTypeMatch) {
        try {
          const startDate = new Date(startDateMatch[1])
          const endDate = endDateMatch ? new Date(endDateMatch[1]) : null
          
          if (!isNaN(startDate.getTime())) {
            const activityType = activityTypeMatch[1]
            const isRunning = RUNNING_TYPES.includes(activityType)
            const isStrength = STRENGTH_TYPES.includes(activityType)
            
            if (isRunning || isStrength) {
              const workout = {
                startDate: startDate.toISOString(),
                endDate: endDate ? endDate.toISOString() : null,
                activityType: activityType,
                type: isRunning ? 'running' : 'strength',
                duration: durationMatch ? parseFloat(durationMatch[1]) : null,
                totalEnergyBurned: totalEnergyBurnedMatch ? parseFloat(totalEnergyBurnedMatch[1]) : null,
                totalDistance: totalDistanceMatch ? parseFloat(totalDistanceMatch[1]) : null
              }
              
              workouts.push(workout)
              processed++
              
              if (processed % 50 === 0) {
                process.stdout.write(`\r⏳ Processed ${processed} workouts (${totalWorkouts} total found)...`)
              }
            }
          }
        } catch (e) {
          // Skip invalid dates
        }
      }
    }
    
    rl.on('close', () => {
      console.log(`\r✅ Extracted ${workouts.length} workouts (${workouts.filter(w => w.type === 'running').length} running, ${workouts.filter(w => w.type === 'strength').length} strength) out of ${totalWorkouts} total workouts`)
      resolve(workouts)
    })
    
    rl.on('error', reject)
  })
}

function loadSleepData() {
  try {
    const sleepDataPath = join(__dirname, 'public', 'data', 'sleepData.json')
    const sleepData = JSON.parse(readFileSync(sleepDataPath, 'utf-8'))
    return sleepData.sleepSessions || []
  } catch (e) {
    console.error('⚠️  Could not load sleep data:', e.message)
    return []
  }
}

function calculateCorrelation(x, y) {
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

function matchWorkoutsToSleep(workouts, sleepSessions) {
  // Group workouts by date
  const workoutsByDate = new Map()
  
  workouts.forEach(workout => {
    const workoutDate = new Date(workout.startDate)
    const dateKey = workoutDate.toISOString().split('T')[0] // YYYY-MM-DD
    
    if (!workoutsByDate.has(dateKey)) {
      workoutsByDate.set(dateKey, {
        running: [],
        strength: []
      })
    }
    
    const dayWorkouts = workoutsByDate.get(dateKey)
    if (workout.type === 'running') {
      dayWorkouts.running.push(workout)
    } else if (workout.type === 'strength') {
      dayWorkouts.strength.push(workout)
    }
  })
  
  // Match sleep sessions with workouts
  const matchedData = []
  
  sleepSessions.forEach(session => {
    // Handle both ISO string and Date object formats
    const sleepDate = session.sleepDate instanceof Date ? session.sleepDate : new Date(session.sleepDate)
    const dateKey = sleepDate.toISOString().split('T')[0]
    
    // Check for workouts on the same day (workout day = sleep day)
    // Also check previous day (workout day before sleep)
    const workoutDay = workoutsByDate.get(dateKey)
    const prevDate = new Date(sleepDate)
    prevDate.setDate(prevDate.getDate() - 1)
    const prevDateKey = prevDate.toISOString().split('T')[0]
    const prevWorkoutDay = workoutsByDate.get(prevDateKey)
    
    // Debug: log first few matches to verify
    if (matchedData.length < 3) {
      console.log(`Sleep date: ${dateKey}, Has workout today: ${!!workoutDay}, Has workout yesterday: ${!!prevWorkoutDay}`)
    }
    
    const hasRunningToday = workoutDay && workoutDay.running.length > 0
    const hasStrengthToday = workoutDay && workoutDay.strength.length > 0
    const hasRunningYesterday = prevWorkoutDay && prevWorkoutDay.running.length > 0
    const hasStrengthYesterday = prevWorkoutDay && prevWorkoutDay.strength.length > 0
    
    matchedData.push({
      sleepDate: session.sleepDate,
      fallAsleepTime: session.fallAsleepTime,
      wakeTime: session.wakeTime,
      durationHours: session.durationHours,
      hasRunningToday: hasRunningToday,
      hasStrengthToday: hasStrengthToday,
      hasRunningYesterday: hasRunningYesterday,
      hasStrengthYesterday: hasStrengthYesterday,
      runningCountToday: workoutDay ? workoutDay.running.length : 0,
      strengthCountToday: workoutDay ? workoutDay.strength.length : 0,
      runningCountYesterday: prevWorkoutDay ? prevWorkoutDay.running.length : 0,
      strengthCountYesterday: prevWorkoutDay ? prevWorkoutDay.strength.length : 0
    })
  })
  
  return matchedData
}

function calculateCorrelations(matchedData) {
  const correlations = {}
  
  // Sleep duration correlations
  const sleepDurations = matchedData.map(d => d.durationHours)
  
  // Running today vs sleep duration
  const runningToday = matchedData.map(d => d.hasRunningToday ? 1 : 0)
  correlations.runningToday_vs_duration = calculateCorrelation(runningToday, sleepDurations)
  
  // Running yesterday vs sleep duration
  const runningYesterday = matchedData.map(d => d.hasRunningYesterday ? 1 : 0)
  correlations.runningYesterday_vs_duration = calculateCorrelation(runningYesterday, sleepDurations)
  
  // Strength today vs sleep duration
  const strengthToday = matchedData.map(d => d.hasStrengthToday ? 1 : 0)
  correlations.strengthToday_vs_duration = calculateCorrelation(strengthToday, sleepDurations)
  
  // Strength yesterday vs sleep duration
  const strengthYesterday = matchedData.map(d => d.hasStrengthYesterday ? 1 : 0)
  correlations.strengthYesterday_vs_duration = calculateCorrelation(strengthYesterday, sleepDurations)
  
  // Fall asleep time correlations (convert to hours from midnight)
  const fallAsleepHours = matchedData.map(d => {
    const date = new Date(d.fallAsleepTime)
    return date.getHours() + date.getMinutes() / 60
  })
  
  correlations.runningToday_vs_fallAsleepTime = calculateCorrelation(runningToday, fallAsleepHours)
  correlations.runningYesterday_vs_fallAsleepTime = calculateCorrelation(runningYesterday, fallAsleepHours)
  correlations.strengthToday_vs_fallAsleepTime = calculateCorrelation(strengthToday, fallAsleepHours)
  correlations.strengthYesterday_vs_fallAsleepTime = calculateCorrelation(strengthYesterday, fallAsleepHours)
  
  return correlations
}

async function main() {
  const xmlPath = join(__dirname, 'healthdata', 'apple_health_export', 'export.xml')
  const outputPath = join(__dirname, 'public', 'data', 'workoutData.json')
  
  console.log('🔍 Extracting workout records from Apple Health XML...')
  console.log(`📁 Input: ${xmlPath}`)
  console.log(`📁 Output: ${outputPath}`)
  console.log('')
  
  try {
    console.log('⏳ Parsing XML file (this may take a moment)...')
    const startTime = Date.now()
    
    const workouts = await extractWorkouts(xmlPath)
    
    console.log('')
    console.log('📊 Loading sleep data...')
    const sleepSessions = loadSleepData()
    
    if (sleepSessions.length === 0) {
      console.log('⚠️  No sleep data found. Run extract-sleep-data.js first.')
    }
    
    console.log('📊 Matching workouts to sleep sessions...')
    const matchedData = matchWorkoutsToSleep(workouts, sleepSessions)
    
    console.log('📊 Calculating correlations...')
    const correlations = calculateCorrelations(matchedData)
    
    // Create the output data structure
    const outputData = {
      workouts: workouts,
      matchedData: matchedData,
      correlations: correlations,
      metadata: {
        extractedAt: new Date().toISOString(),
        totalWorkouts: workouts.length,
        runningWorkouts: workouts.filter(w => w.type === 'running').length,
        strengthWorkouts: workouts.filter(w => w.type === 'strength').length,
        matchedSleepSessions: matchedData.length,
        dateRange: workouts.length > 0 ? {
          earliest: workouts[0].startDate,
          latest: workouts[workouts.length - 1].startDate
        } : null
      }
    }
    
    // Ensure output directory exists
    const outputDir = join(__dirname, 'public', 'data')
    try {
      await import('fs').then(fs => fs.promises.mkdir(outputDir, { recursive: true }))
    } catch (e) {
      // Directory might already exist
    }
    
    // Write to JSON file
    console.log('💾 Saving to JSON file...')
    writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8')
    
    const fileSize = (statSync(outputPath).size / (1024 * 1024)).toFixed(2)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
    
    console.log('')
    console.log('✅ Extraction complete!')
    console.log('='.repeat(50))
    console.log(`Total workouts: ${workouts.length.toLocaleString()}`)
    console.log(`  - Running: ${workouts.filter(w => w.type === 'running').length.toLocaleString()}`)
    console.log(`  - Strength: ${workouts.filter(w => w.type === 'strength').length.toLocaleString()}`)
    console.log(`Matched sleep sessions: ${matchedData.length.toLocaleString()}`)
    console.log(`Output file size: ${fileSize} MB`)
    console.log(`Time elapsed: ${elapsed} seconds`)
    console.log('')
    console.log('📊 Correlations:')
    console.log(`  Running Today vs Sleep Duration: ${correlations.runningToday_vs_duration?.toFixed(3) || 'N/A'}`)
    console.log(`  Running Yesterday vs Sleep Duration: ${correlations.runningYesterday_vs_duration?.toFixed(3) || 'N/A'}`)
    console.log(`  Strength Today vs Sleep Duration: ${correlations.strengthToday_vs_duration?.toFixed(3) || 'N/A'}`)
    console.log(`  Strength Yesterday vs Sleep Duration: ${correlations.strengthYesterday_vs_duration?.toFixed(3) || 'N/A'}`)
    console.log('')
    console.log(`📁 Saved to: ${outputPath}`)
    console.log('')
    console.log('💡 The web app can now load workout correlations!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main().catch(console.error)

