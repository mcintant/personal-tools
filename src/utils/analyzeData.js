export function analyzeReadingData(db) {
  const result = {
    pagesPerDay: [],
    sessions: [],
    totalBooks: 0,
    totalPages: 0,
    readingDays: 0,
    totalSessions: 0
  }

  try {
    // Try to get table names first
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'")
    const tableNames = tables.length > 0 ? tables[0].values.map(row => row[0]) : []
    
    console.log('Available tables:', tableNames)

    // Get books/content for book count
    let books = []
    if (tableNames.includes('content')) {
      try {
        const contentResult = db.exec(`
          SELECT ContentID, Title, ___NumPages, DateLastRead
          FROM content
          WHERE ContentType = 6 AND ___NumPages > 0
        `)
        if (contentResult.length > 0) {
          const columns = contentResult[0].columns
          const rows = contentResult[0].values
          books = rows.map(row => {
            const obj = {}
            columns.forEach((col, i) => {
              obj[col] = row[i]
            })
            return obj
          })
        }
      } catch (e) {
        console.log('Error reading content table:', e)
      }
    }

    result.totalBooks = books.length

    // Get AnalyticsEvents - this is where reading stats are stored
    let analyticsEvents = []
    if (tableNames.includes('AnalyticsEvents')) {
      try {
        // First, get the schema to understand the columns
        const schemaResult = db.exec("PRAGMA table_info(AnalyticsEvents)")
        const columns = schemaResult.length > 0 ? schemaResult[0].values.map(row => row[1]) : []
        console.log('AnalyticsEvents columns:', columns)
        
        // Build a flexible query based on available columns
        // Common columns might be: EventType, Timestamp, Date, ExtraData, etc.
        let selectColumns = '*'
        if (columns.length > 0) {
          // Try to select common column names
          const commonCols = columns.filter(col => 
            ['EventType', 'Timestamp', 'Date', 'ExtraData', 'EventName', 'EventData'].includes(col)
          )
          if (commonCols.length > 0) {
            selectColumns = commonCols.join(', ')
          }
        }
        
        const eventsResult = db.exec(`
          SELECT ${selectColumns}
          FROM AnalyticsEvents
          ORDER BY ${columns.includes('Timestamp') ? 'Timestamp' : columns.includes('Date') ? 'Date' : 'rowid'}
        `)
        
        if (eventsResult.length > 0) {
          const resultColumns = eventsResult[0].columns
          const rows = eventsResult[0].values
          analyticsEvents = rows.map(row => {
            const obj = {}
            resultColumns.forEach((col, i) => {
              obj[col] = row[i]
            })
            return obj
          })
          console.log('Sample AnalyticsEvents:', analyticsEvents.slice(0, 5))
        }
      } catch (e) {
        console.log('Error reading AnalyticsEvents table:', e)
      }
    } else {
      console.log('AnalyticsEvents table not found')
    }

    // Process AnalyticsEvents to calculate pages per day and session times
    const pagesByDate = new Map()
    const sessions = []
    
    // Process analytics events
    // The structure may vary, but typically includes:
    // - Timestamp/Date for when the event occurred
    // - EventType/EventName to identify the type of event
    // - ExtraData/EventData which may contain page information
    
    analyticsEvents.forEach(event => {
      // Get timestamp - could be Timestamp, Date, or similar
      let timestamp = event.Timestamp || event.Date || event.timestamp || event.date
      if (!timestamp) return
      
      // Convert to Date object (handle both Unix timestamp and ISO strings)
      let eventTime
      if (typeof timestamp === 'number') {
        // If it's a Unix timestamp, check if it's in seconds or milliseconds
        eventTime = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000)
      } else if (typeof timestamp === 'string') {
        eventTime = new Date(timestamp)
      } else {
        return
      }
      
      if (isNaN(eventTime.getTime())) return
      
      const dateKey = eventTime.toISOString().split('T')[0]
      
      // Try to extract page information from ExtraData or EventData
      // This might be JSON or a formatted string
      let pagesRead = 0
      const extraData = event.ExtraData || event.EventData || event.extraData || event.eventData
      
      if (extraData) {
        try {
          // Try parsing as JSON
          const parsed = typeof extraData === 'string' ? JSON.parse(extraData) : extraData
          
          // Look for page-related fields
          if (parsed && typeof parsed === 'object') {
            pagesRead = parsed.PagesRead || parsed.pagesRead || parsed.Pages || parsed.pages || 
                       parsed.PageCount || parsed.pageCount || 0
          }
        } catch (e) {
          // If not JSON, try to extract numbers from string
          const match = String(extraData).match(/(\d+)\s*(?:pages?|page)/i)
          if (match) {
            pagesRead = parseInt(match[1]) || 0
          }
        }
      }
      
      // Also check EventType/EventName for page-related events
      const eventType = event.EventType || event.EventName || event.eventType || event.eventName
      if (eventType && String(eventType).toLowerCase().includes('page')) {
        // Try to extract page number from event type or data
        if (!pagesRead && extraData) {
          const numMatch = String(extraData).match(/\d+/)
          if (numMatch) {
            pagesRead = parseInt(numMatch[0]) || 0
          }
        }
      }
      
      // Accumulate pages per day
      if (pagesRead > 0) {
        const current = pagesByDate.get(dateKey) || 0
        pagesByDate.set(dateKey, current + pagesRead)
      }
      
      // For session tracking, use all events and group by time gaps
      // All AnalyticsEvents are reading-related, so we'll track them all
      if (sessions.length === 0) {
        sessions.push({
          start: eventTime,
          end: eventTime,
          events: [eventTime]
        })
      } else {
        const lastSession = sessions[sessions.length - 1]
        const timeDiff = (eventTime - lastSession.end) / 1000 / 60 // minutes
        
        // Group events within 30 minutes as the same session
        if (timeDiff <= 30) {
          // Same session
          lastSession.end = eventTime
          lastSession.events.push(eventTime)
        } else {
          // New session
          sessions.push({
            start: eventTime,
            end: eventTime,
            events: [eventTime]
          })
        }
      }
    })
    
    // Convert pages per day to array
    result.pagesPerDay = Array.from(pagesByDate.entries())
      .map(([date, pages]) => ({
        date,
        pages: Math.round(pages)
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    result.readingDays = result.pagesPerDay.length
    result.totalPages = result.pagesPerDay.reduce((sum, day) => sum + day.pages, 0)
    
    // Convert sessions to final format
    const finalSessions = sessions
      .map(session => {
        const duration = (session.end - session.start) / 1000 / 60 // minutes
        return {
          start: session.start,
          end: session.end,
          duration: Math.round(duration)
        }
      })
      .filter(session => session.duration > 0 && session.duration < 480) // Filter unrealistic sessions

    result.sessions = finalSessions.map(session => ({
      date: session.start.toISOString().split('T')[0],
      startTime: session.start.toLocaleTimeString(),
      duration: session.duration,
      timestamp: session.start.getTime()
    })).sort((a, b) => a.timestamp - b.timestamp)

    result.totalSessions = result.sessions.length
    
    // If no pages found from AnalyticsEvents, try alternative approach
    // Look for any numeric data that might represent pages
    if (result.totalPages === 0 && analyticsEvents.length > 0) {
      console.log('No pages found in standard format, trying alternative parsing...')
      // Try to extract any numeric progress data
      analyticsEvents.forEach(event => {
        const extraData = event.ExtraData || event.EventData || event.extraData || event.eventData
        if (extraData) {
          // Look for any numbers that might be pages
          const numbers = String(extraData).match(/\d+/g)
          if (numbers && numbers.length > 0) {
            const timestamp = event.Timestamp || event.Date || event.timestamp || event.date
            if (timestamp) {
              let eventTime
              if (typeof timestamp === 'number') {
                eventTime = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000)
              } else {
                eventTime = new Date(timestamp)
              }
              if (!isNaN(eventTime.getTime())) {
                const dateKey = eventTime.toISOString().split('T')[0]
                // Use the largest number found as potential pages
                const maxNum = Math.max(...numbers.map(n => parseInt(n)))
                if (maxNum > 0 && maxNum < 10000) { // Reasonable page range
                  const current = pagesByDate.get(dateKey) || 0
                  pagesByDate.set(dateKey, current + 1) // At least 1 page per event
                }
              }
            }
          }
        }
      })
      
      // Recalculate if we found any data
      result.pagesPerDay = Array.from(pagesByDate.entries())
        .map(([date, pages]) => ({
          date,
          pages: Math.round(pages)
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
      result.readingDays = result.pagesPerDay.length
      result.totalPages = result.pagesPerDay.reduce((sum, day) => sum + day.pages, 0)
    }

  } catch (error) {
    console.error('Error analyzing data:', error)
  }

  return result
}

