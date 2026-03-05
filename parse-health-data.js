#!/usr/bin/env node
/**
 * Script to parse and validate Apple Health export XML file
 * Uses streaming to handle large files efficiently
 */

import { createReadStream } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function parseHealthXMLStream(filePath) {
  return new Promise((resolve, reject) => {
    const stats = {
      totalRecords: 0,
      sleepRecords: 0,
      sleepAsleepRecords: 0,
      stepsRecords: 0,
      heartRateRecords: 0,
      activeEnergyRecords: 0,
      workoutRecords: 0,
      dateRange: { earliest: null, latest: null }
    }
    
    const sleepRecords = []
    let currentRecord = null
    let inRecord = false
    let recordBuffer = ''
    
    const rl = createInterface({
      input: createReadStream(filePath),
      crlfDelay: Infinity
    })
    
    rl.on('line', (line) => {
      // Count record types using simple string matching
      if (line.includes('type="HKCategoryTypeIdentifierSleepAnalysis"')) {
        stats.sleepRecords++
        inRecord = true
        currentRecord = { line: line.trim() }
        recordBuffer = line
      } else if (inRecord) {
        recordBuffer += ' ' + line.trim()
        if (line.includes('</Record>')) {
          // Process the complete record
          const recordXml = recordBuffer
          
          // Extract attributes
          const valueMatch = recordXml.match(/value="([^"]*)"/)
          const startDateMatch = recordXml.match(/startDate="([^"]*)"/)
          const endDateMatch = recordXml.match(/endDate="([^"]*)"/)
          const sourceNameMatch = recordXml.match(/sourceName="([^"]*)"/)
          
          if (valueMatch && startDateMatch && endDateMatch) {
            const value = valueMatch[1]
            // Check for any "Asleep" variant (Core, REM, Deep, Unspecified)
            if (value && value.includes('Asleep')) {
              stats.sleepAsleepRecords++
              try {
                const startDate = new Date(startDateMatch[1])
                const endDate = new Date(endDateMatch[1])
                
                if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                  if (!stats.dateRange.earliest || startDate < stats.dateRange.earliest) {
                    stats.dateRange.earliest = startDate
                  }
                  if (!stats.dateRange.latest || endDate > stats.dateRange.latest) {
                    stats.dateRange.latest = endDate
                  }
                  
                  sleepRecords.push({
                    startDate,
                    endDate,
                    value,
                    sourceName: sourceNameMatch ? sourceNameMatch[1] : 'Unknown'
                  })
                }
              } catch (e) {
                // Skip invalid dates
              }
            }
          }
          
          inRecord = false
          recordBuffer = ''
          currentRecord = null
        }
      }
      
      // Count other record types (simple line-based matching)
      if (line.includes('<Record')) {
        stats.totalRecords++
      }
      if (line.includes('type="HKQuantityTypeIdentifierStepCount"')) {
        stats.stepsRecords++
      }
      if (line.includes('type="HKQuantityTypeIdentifierHeartRate"')) {
        stats.heartRateRecords++
      }
      if (line.includes('type="HKQuantityTypeIdentifierActiveEnergyBurned"')) {
        stats.activeEnergyRecords++
      }
      if (line.includes('<Workout')) {
        stats.workoutRecords++
      }
    })
    
    rl.on('close', () => {
      // Group sleep records into sessions
      const groupedSessions = groupSleepSessions(sleepRecords)
      resolve({
        stats,
        sleepRecords,
        groupedSessions
      })
    })
    
    rl.on('error', reject)
  })
}

function groupSleepSessions(records) {
  if (records.length === 0) return []
  
  // Sort by start date
  const sorted = [...records].sort((a, b) => a.startDate - b.startDate)
  
  const sessions = []
  let currentSession = null
  
  sorted.forEach(record => {
    if (!currentSession) {
      currentSession = {
        startDate: record.startDate,
        endDate: record.endDate,
        duration: (record.endDate - record.startDate) / (1000 * 60), // minutes
        sourceName: record.sourceName
      }
    } else {
      // Check if this record continues the session (within 30 minutes)
      const gap = (record.startDate - currentSession.endDate) / (1000 * 60)
      
      if (gap <= 30) {
        // Continue session
        currentSession.endDate = record.endDate
        currentSession.duration += (record.endDate - record.startDate) / (1000 * 60)
      } else {
        // End current session, start new one
        sessions.push(currentSession)
        currentSession = {
          startDate: record.startDate,
          endDate: record.endDate,
          duration: (record.endDate - record.startDate) / (1000 * 60),
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
    const fallAsleepTime = session.startDate
    const wakeTime = session.endDate
    
    // Get date for the sleep session
    const sleepDate = new Date(fallAsleepTime)
    sleepDate.setHours(0, 0, 0, 0)
    
    // If fall asleep time is before 6 AM, consider it part of previous day
    if (fallAsleepTime.getHours() < 6) {
      sleepDate.setDate(sleepDate.getDate() - 1)
    }
    
    return {
      ...session,
      fallAsleepTime,
      wakeTime,
      sleepDate,
      durationHours: session.duration / 60
    }
  })
}

async function main() {
  const xmlPath = join(__dirname, 'healthdata', 'apple_health_export', 'export.xml')
  
  console.log('🔍 Checking health data XML file...')
  console.log(`📁 Path: ${xmlPath}`)
  console.log('')
  
  try {
    console.log('⏳ Parsing file with streaming parser (this may take a moment)...')
    const startTime = Date.now()
    
    const result = await parseHealthXMLStream(xmlPath)
    
    const parseTime = ((Date.now() - startTime) / 1000).toFixed(2)
    
    console.log('')
    console.log('📈 Parsing Results:')
    console.log('='.repeat(50))
    console.log(`Total Records: ${result.stats.totalRecords.toLocaleString()}`)
    console.log(`Sleep Analysis Records: ${result.stats.sleepRecords.toLocaleString()}`)
    console.log(`  └─ ASLEEP records: ${result.stats.sleepAsleepRecords.toLocaleString()}`)
    console.log(`Steps Records: ${result.stats.stepsRecords.toLocaleString()}`)
    console.log(`Heart Rate Records: ${result.stats.heartRateRecords.toLocaleString()}`)
    console.log(`Active Energy Records: ${result.stats.activeEnergyRecords.toLocaleString()}`)
    console.log(`Workout Records: ${result.stats.workoutRecords.toLocaleString()}`)
    console.log('')
    
    if (result.groupedSessions.length > 0) {
      console.log('😴 Sleep Sessions:')
      console.log(`  Total grouped sessions: ${result.groupedSessions.length}`)
      
      const avgDuration = result.groupedSessions.reduce((sum, s) => sum + s.durationHours, 0) / result.groupedSessions.length
      const minDuration = Math.min(...result.groupedSessions.map(s => s.durationHours))
      const maxDuration = Math.max(...result.groupedSessions.map(s => s.durationHours))
      
      console.log(`  Average duration: ${avgDuration.toFixed(2)} hours`)
      console.log(`  Min duration: ${minDuration.toFixed(2)} hours`)
      console.log(`  Max duration: ${maxDuration.toFixed(2)} hours`)
      
      if (result.stats.dateRange.earliest && result.stats.dateRange.latest) {
        console.log(`  Date range: ${result.stats.dateRange.earliest.toLocaleDateString()} to ${result.stats.dateRange.latest.toLocaleDateString()}`)
      }
      
      // Show sample of recent sessions
      const recentSessions = result.groupedSessions
        .sort((a, b) => b.sleepDate - a.sleepDate)
        .slice(0, 5)
      
      console.log('')
      console.log('  Recent sessions (last 5):')
      recentSessions.forEach((session, i) => {
        const dateStr = session.sleepDate.toLocaleDateString()
        const startStr = session.fallAsleepTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        const endStr = session.wakeTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        console.log(`    ${i + 1}. ${dateStr}: ${startStr} - ${endStr} (${session.durationHours.toFixed(2)}h)`)
      })
    }
    
    console.log('')
    console.log(`⏱️  Parsing completed in ${parseTime} seconds`)
    console.log('')
    console.log('✅ File can be parsed successfully!')
    console.log('')
    console.log('💡 The file is ready to use in the web app.')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main().catch(console.error)
