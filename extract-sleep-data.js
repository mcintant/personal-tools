#!/usr/bin/env node
/**
 * Extract sleep records from Apple Health XML and save to a smaller JSON file
 */

import { createReadStream, writeFileSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function extractSleepRecords(filePath) {
  return new Promise((resolve, reject) => {
    const sleepRecords = []
    let currentRecord = null
    let inRecord = false
    let recordBuffer = ''
    let processed = 0
    
    const rl = createInterface({
      input: createReadStream(filePath),
      crlfDelay: Infinity
    })
    
    rl.on('line', (line) => {
      if (line.includes('type="HKCategoryTypeIdentifierSleepAnalysis"')) {
        inRecord = true
        currentRecord = {}
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
            // Include all sleep-related records (Asleep, Awake, InBed)
            if (value && (value.includes('Asleep') || value.includes('Awake') || value.includes('InBed'))) {
              try {
                const startDate = new Date(startDateMatch[1])
                const endDate = new Date(endDateMatch[1])
                
                if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                  sleepRecords.push({
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    value: value,
                    sourceName: sourceNameMatch ? sourceNameMatch[1] : 'Unknown'
                  })
                  processed++
                  
                  if (processed % 100 === 0) {
                    process.stdout.write(`\r⏳ Processed ${processed} sleep records...`)
                  }
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
    })
    
    rl.on('close', () => {
      console.log(`\r✅ Extracted ${sleepRecords.length} sleep records`)
      resolve(sleepRecords)
    })
    
    rl.on('error', reject)
  })
}

function groupSleepSessions(records) {
  if (records.length === 0) return []
  
  // Convert ISO strings back to Date objects
  const recordsWithDates = records.map(r => ({
    ...r,
    startDate: new Date(r.startDate),
    endDate: new Date(r.endDate)
  }))
  
  // Sort by start date
  const sorted = [...recordsWithDates].sort((a, b) => a.startDate - b.startDate)
  
  // Filter to only ASLEEP records for grouping
  const asleepRecords = sorted.filter(r => r.value.includes('Asleep'))
  
  const sessions = []
  let currentSession = null
  
  asleepRecords.forEach(record => {
    if (!currentSession) {
      currentSession = {
        startDate: record.startDate.toISOString(),
        endDate: record.endDate.toISOString(),
        duration: (record.endDate - record.startDate) / (1000 * 60), // minutes
        sourceName: record.sourceName
      }
    } else {
      const currentEnd = new Date(currentSession.endDate)
      // Check if this record continues the session (within 30 minutes)
      const gap = (record.startDate - currentEnd) / (1000 * 60)
      
      if (gap <= 30) {
        // Continue session
        currentSession.endDate = record.endDate.toISOString()
        currentSession.duration += (record.endDate - record.startDate) / (1000 * 60)
      } else {
        // End current session, start new one
        sessions.push(currentSession)
        currentSession = {
          startDate: record.startDate.toISOString(),
          endDate: record.endDate.toISOString(),
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
  
  // Process sessions to add metadata
  return sessions.map(session => {
    const fallAsleepTime = new Date(session.startDate)
    const wakeTime = new Date(session.endDate)
    
    // Get date for the sleep session
    const sleepDate = new Date(fallAsleepTime)
    sleepDate.setHours(0, 0, 0, 0)
    
    // If fall asleep time is before 6 AM, consider it part of previous day
    if (fallAsleepTime.getHours() < 6) {
      sleepDate.setDate(sleepDate.getDate() - 1)
    }
    
    return {
      startDate: session.startDate,
      endDate: session.endDate,
      fallAsleepTime: fallAsleepTime.toISOString(),
      wakeTime: wakeTime.toISOString(),
      sleepDate: sleepDate.toISOString(),
      duration: session.duration,
      durationHours: session.duration / 60,
      sourceName: session.sourceName
    }
  })
}

async function main() {
  const xmlPath = join(__dirname, 'healthdata', 'apple_health_export', 'export.xml')
  const outputPath = join(__dirname, 'public', 'data', 'sleepData.json')
  
  console.log('🔍 Extracting sleep records from Apple Health XML...')
  console.log(`📁 Input: ${xmlPath}`)
  console.log(`📁 Output: ${outputPath}`)
  console.log('')
  
  try {
    console.log('⏳ Parsing XML file (this may take a moment)...')
    const startTime = Date.now()
    
    const allSleepRecords = await extractSleepRecords(xmlPath)
    
    console.log('')
    console.log('📊 Grouping sleep records into sessions...')
    const groupedSessions = groupSleepSessions(allSleepRecords)
    
    // Also extract other health data for correlation (simplified - just counts per day)
    console.log('📊 Extracting health data summaries...')
    
    // Create the output data structure
    const outputData = {
      sleepSessions: groupedSessions,
      rawSleepRecords: allSleepRecords,
      metadata: {
        extractedAt: new Date().toISOString(),
        totalSleepRecords: allSleepRecords.length,
        totalSessions: groupedSessions.length,
        dateRange: groupedSessions.length > 0 ? {
          earliest: groupedSessions[0].sleepDate,
          latest: groupedSessions[groupedSessions.length - 1].sleepDate
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
    console.log(`Total sleep records: ${allSleepRecords.length.toLocaleString()}`)
    console.log(`Grouped sessions: ${groupedSessions.length.toLocaleString()}`)
    console.log(`Output file size: ${fileSize} MB`)
    console.log(`Time elapsed: ${elapsed} seconds`)
    console.log('')
    console.log(`📁 Saved to: ${outputPath}`)
    console.log('')
    console.log('💡 The web app will now load from this smaller JSON file!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main().catch(console.error)

