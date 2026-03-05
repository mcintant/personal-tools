import React, { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ScatterChart, Scatter, Cell, ComposedChart } from 'recharts'
import { parseAppleHealthXML, parseAppleHealthXMLFromURL, calculateCorrelation, getTimeBucketRangeLabel, roundTo15Minutes } from '../utils/parseAppleHealth'
import './SleepAnalysis.css'

function SleepAnalysis() {
  const [sleepData, setSleepData] = useState([])
  const [healthData, setHealthData] = useState(null)
  const [workoutData, setWorkoutData] = useState(null)
  const [loading, setLoading] = useState(false) // Start with false, load on mount
  const [error, setError] = useState(null)
  const [timeFilter, setTimeFilter] = useState('all') // 'all', 'week', or 'month'
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [selectedWeek, setSelectedWeek] = useState(null)

  // Get available months and weeks from data
  const availableMonths = useMemo(() => {
    if (!sleepData || !sleepData.length) return []
    try {
      const months = new Set()
      sleepData.forEach(record => {
        if (!record || !record.sleepDate) return
        const date = new Date(record.sleepDate)
        if (isNaN(date.getTime())) return
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        months.add(monthKey)
      })
      return Array.from(months).sort().reverse()
    } catch (e) {
      console.error('Error calculating months:', e)
      return []
    }
  }, [sleepData])

  // Helper function for week start calculation
  function getWeekStart(date) {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
    return new Date(d.setDate(diff))
  }

  const availableWeeks = useMemo(() => {
    if (!sleepData || !sleepData.length) return []
    try {
      const weeks = new Set()
      sleepData.forEach(record => {
        if (!record || !record.sleepDate) return
        const date = new Date(record.sleepDate)
        if (isNaN(date.getTime())) return
        const weekStart = getWeekStart(date)
        const weekKey = weekStart.toISOString().split('T')[0]
        weeks.add(weekKey)
      })
      return Array.from(weeks).sort().reverse()
    } catch (e) {
      console.error('Error calculating weeks:', e)
      return []
    }
  }, [sleepData])

  // Auto-load JSON file from repo on mount
  useEffect(() => {
    // Use setTimeout to avoid blocking the initial render
    const timer = setTimeout(() => {
      loadHealthDataFromRepo().catch(err => {
        console.error('Failed to load sleep data:', err)
        setError('Failed to load sleep data. You can upload the XML file manually.')
        setLoading(false)
      })
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  // Set default to most recent month/week
  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0])
    }
    if (availableWeeks.length > 0 && !selectedWeek) {
      setSelectedWeek(availableWeeks[0])
    }
  }, [availableMonths, availableWeeks, selectedMonth, selectedWeek])

  const loadHealthDataFromRepo = async () => {
    setLoading(true)
    setError(null)
    try {
      // Load from the pre-extracted JSON file
      const pathsToTry = [
        '/data/sleepData.json',
        './data/sleepData.json'
      ]

      let lastError = null
      for (const path of pathsToTry) {
        try {
          const response = await fetch(path)
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }
          const data = await response.json()
          
          // Validate data structure
          if (!data || !data.sleepSessions || !Array.isArray(data.sleepSessions)) {
            throw new Error('Invalid data format')
          }
          
          // Convert ISO strings back to Date objects
          const sleepSessions = data.sleepSessions.map(session => {
            try {
              return {
                ...session,
                startDate: new Date(session.startDate),
                endDate: new Date(session.endDate),
                fallAsleepTime: new Date(session.fallAsleepTime),
                wakeTime: new Date(session.wakeTime),
                sleepDate: new Date(session.sleepDate)
              }
            } catch (e) {
              console.warn('Invalid date in session:', session, e)
              return null
            }
          }).filter(session => session !== null)
          
          setSleepData(sleepSessions)
          // Health data is not included in the JSON, but that's okay for now
          setHealthData(null)
          setError(null)
          break
        } catch (err) {
          lastError = err
          console.log(`Failed to load from ${path}, trying next...`, err)
        }
      }
      
      // Load workout data
      const workoutPathsToTry = [
        '/data/workoutData.json',
        './data/workoutData.json'
      ]
      
      for (const path of workoutPathsToTry) {
        try {
          const response = await fetch(path)
          if (response.ok) {
            const workoutData = await response.json()
            setWorkoutData(workoutData)
            break
          }
        } catch (err) {
          console.log(`Failed to load workout data from ${path}`, err)
        }
      }
      
      setLoading(false)
      
      if (lastError) {
        // If all paths failed, set error but don't block the UI
        setError(`Could not auto-load health data. You can upload the XML file manually below.`)
        console.warn('Failed to auto-load health data:', lastError)
      }
    } catch (error) {
      console.error('Error loading health data:', error)
      setError(`Failed to load health data: ${error.message}. You can upload the XML file manually below.`)
      setLoading(false)
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setLoading(true)
    setError(null)
    try {
      const result = await parseAppleHealthXML(file)
      setSleepData(result.sleep)
      setHealthData(result.health)
    } catch (error) {
      console.error('Error parsing file:', error)
      setError('Failed to parse Apple Health export. Please make sure it\'s a valid XML file.')
    } finally {
      setLoading(false)
    }
  }

  // Helper functions for EST time conversion (defined before useMemo hooks that use them)
  const getESTHour = (date) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      hour12: false
    })
    return parseInt(formatter.format(date))
  }
  
  const getESTMinute = (date) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      minute: 'numeric'
    })
    return parseInt(formatter.format(date))
  }

  // Filter data by time period
  const filteredSleepData = useMemo(() => {
    if (!sleepData.length) return []
    
    let filtered = sleepData
    
    // If "all" is selected, return all data without filtering
    if (timeFilter === 'all') {
      return filtered
    }
    
    if (timeFilter === 'month' && selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number)
      filtered = filtered.filter(record => {
        const date = new Date(record.sleepDate)
        return date.getFullYear() === year && date.getMonth() + 1 === month
      })
    } else if (timeFilter === 'week' && selectedWeek) {
      const weekStart = new Date(selectedWeek)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)
      
      filtered = filtered.filter(record => {
        const date = new Date(record.sleepDate)
        return date >= weekStart && date < weekEnd
      })
    }
    
    return filtered
  }, [sleepData, timeFilter, selectedMonth, selectedWeek])

  // Group by 15-minute fall asleep time buckets (by time of day, not date)
  const sleepByFallAsleepTime = useMemo(() => {
    if (!filteredSleepData.length) return []
    
    const buckets = new Map()
    
    filteredSleepData.forEach(record => {
      const fallAsleepTime = new Date(record.fallAsleepTime)
      const wakeTime = new Date(record.wakeTime)
      
      // Get EST time components
      const estHour = getESTHour(fallAsleepTime)
      const estMinute = getESTMinute(fallAsleepTime)
      
      // Round to nearest 15 minutes
      const roundedMinute = Math.floor(estMinute / 15) * 15
      
      // Create bucket key based on time of day only (HH:MM format)
      const bucketKey = `${String(estHour).padStart(2, '0')}:${String(roundedMinute).padStart(2, '0')}`
      
      // Create a normalized date for sorting (use a fixed date, just for time comparison)
      const normalizedTime = new Date(2000, 0, 1, estHour, roundedMinute, 0)
      
      if (!buckets.has(bucketKey)) {
        // Create the time range label
        const nextMinute = roundedMinute + 15
        let nextHour = estHour
        let finalNextMinute = nextMinute
        if (nextMinute >= 60) {
          finalNextMinute = 0
          nextHour = estHour + 1
        }
        if (nextHour >= 24) {
          nextHour = 0
        }
        
        const time1 = normalizedTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: 'America/New_York'
        })
        const time2 = new Date(2000, 0, 1, nextHour, finalNextMinute, 0).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: 'America/New_York'
        })
        
        buckets.set(bucketKey, {
          timeRange: `${time1} - ${time2}`,
          fallAsleepTime: normalizedTime,
          durations: [],
          wakeTimes: []
        })
      }
      
      const bucket = buckets.get(bucketKey)
      bucket.durations.push(record.durationHours)
      bucket.wakeTimes.push(wakeTime)
    })
    
    // Calculate averages and filter/sort by time of day
    const result = Array.from(buckets.values())
      .map(bucket => {
        const count = bucket.durations.length
        
        // Calculate average wake time properly by averaging hours and minutes separately in EST
        const wakeTimeHours = []
        const wakeTimeMinutes = []
        
        bucket.wakeTimes.forEach(wakeTime => {
          const estHour = getESTHour(wakeTime)
          const estMinute = getESTMinute(wakeTime)
          wakeTimeHours.push(estHour)
          wakeTimeMinutes.push(estMinute)
        })
        
        const avgHour = Math.round(wakeTimeHours.reduce((a, b) => a + b, 0) / wakeTimeHours.length)
        const avgMinute = Math.round(wakeTimeMinutes.reduce((a, b) => a + b, 0) / wakeTimeMinutes.length)
        
        // Create a normalized date with the average hour and minute (using a fixed date for consistency)
        const avgWakeTime = new Date(2000, 0, 1, avgHour, avgMinute, 0)
        
        return {
          timeRange: bucket.timeRange,
          fallAsleepTime: bucket.fallAsleepTime,
          avgDuration: bucket.durations.reduce((a, b) => a + b, 0) / bucket.durations.length,
          avgWakeTime: avgWakeTime,
          count: count,
          // Color coding based on sample count
          sampleColor: count >= 20 ? '#4caf50' : count >= 10 ? '#8bc34a' : count >= 5 ? '#ffc107' : count >= 2 ? '#ff9800' : '#f44336',
          // Opacity based on sample count (more samples = more opaque)
          sampleOpacity: Math.min(0.3 + (count / 30) * 0.7, 1)
        }
      })
      .filter(bucket => {
        // Only show times between 10 PM (22:00) and 3 AM (03:00)
        const hour = bucket.fallAsleepTime.getHours()
        const minute = bucket.fallAsleepTime.getMinutes()
        const timeInMinutes = hour * 60 + minute
        
        // 10 PM = 22:00 = 1320 minutes, 3 AM = 03:00 = 180 minutes
        // Times between 10 PM and midnight (22:00-23:59) or between midnight and 3 AM (00:00-02:59)
        return (hour >= 22) || (hour < 3)
      })
      .sort((a, b) => {
        // Sort by time of day, starting from 10 PM and going past midnight
        // 10 PM (22:00) = 1320, 11 PM (23:00) = 1380, 12 AM (00:00) = 0, 1 AM (01:00) = 60, etc.
        const hourA = a.fallAsleepTime.getHours()
        const hourB = b.fallAsleepTime.getHours()
        const minuteA = a.fallAsleepTime.getMinutes()
        const minuteB = b.fallAsleepTime.getMinutes()
        
        // Convert to minutes from 10 PM (22:00)
        // Times >= 22:00: use (hour - 22) * 60 + minute
        // Times < 3:00: use (24 - 22) * 60 + hour * 60 + minute = 120 + hour * 60 + minute
        const timeA = hourA >= 22 
          ? (hourA - 22) * 60 + minuteA
          : 120 + hourA * 60 + minuteA // 120 = 2 hours (from 22:00 to 24:00)
        
        const timeB = hourB >= 22
          ? (hourB - 22) * 60 + minuteB
          : 120 + hourB * 60 + minuteB
        
        return timeA - timeB
      })
    
    return result
  }, [filteredSleepData])

  // Format wake time for display in EST with AM/PM
  const chartData = useMemo(() => {
    return sleepByFallAsleepTime.map(item => {
      // Get EST hour and minute
      const estHour = getESTHour(item.avgWakeTime)
      const estMinute = getESTMinute(item.avgWakeTime)
      const hourDecimal = estHour + estMinute / 60
      
      // Format for display with AM/PM in EST
      const timeLabel = item.avgWakeTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/New_York'
      })
      
      return {
        ...item,
        avgWakeTimeHour: hourDecimal,
        avgWakeTimeLabel: timeLabel,
        count: item.count, // Ensure count is included
        sampleColor: item.sampleColor, // Include sample color
        sampleOpacity: item.sampleOpacity // Include sample opacity
      }
    })
  }, [sleepByFallAsleepTime])

  // Calculate correlation between fall asleep time and sleep duration
  const sleepTimeCorrelation = useMemo(() => {
    if (!chartData.length || chartData.length < 2) return null
    
    // Convert fall asleep time to hours from 10 PM (22:00)
    const fallAsleepHours = chartData.map(item => {
      const hour = item.fallAsleepTime.getHours()
      const minute = item.fallAsleepTime.getMinutes()
      // Convert to hours from 10 PM
      if (hour >= 22) {
        return (hour - 22) + minute / 60
      } else {
        return (24 - 22) + hour + minute / 60 // 2 hours from 22:00 to 24:00, then add hours
      }
    })
    
    const durations = chartData.map(item => item.avgDuration)
    
    return calculateCorrelation(fallAsleepHours, durations)
  }, [chartData])

  // Find ideal sleep time that maximizes hours slept
  const idealSleepTime = useMemo(() => {
    if (!chartData.length) return null
    
    // Find the time bucket with the highest average sleep duration
    let maxDuration = 0
    let idealTime = null
    
    chartData.forEach(item => {
      if (item.avgDuration > maxDuration && item.count >= 2) { // Require at least 2 samples for reliability
        maxDuration = item.avgDuration
        idealTime = item
      }
    })
    
    // If no time with 2+ samples, use the one with max duration anyway
    if (!idealTime && chartData.length > 0) {
      chartData.forEach(item => {
        if (item.avgDuration > maxDuration) {
          maxDuration = item.avgDuration
          idealTime = item
        }
      })
    }
    
    return idealTime
  }, [chartData])

  // Calculate linear regression for sleep duration prediction
  const sleepDurationPrediction = useMemo(() => {
    if (!chartData.length || chartData.length < 2) return null
    
    // X: fall asleep time in hours from 10 PM
    // Y: sleep duration in hours
    const xValues = chartData.map(item => {
      const hour = item.fallAsleepTime.getHours()
      const minute = item.fallAsleepTime.getMinutes()
      if (hour >= 22) {
        return (hour - 22) + minute / 60
      } else {
        return (24 - 22) + hour + minute / 60
      }
    })
    
    const yValues = chartData.map(item => item.avgDuration)
    
    // Calculate linear regression: y = mx + b
    const n = xValues.length
    const sumX = xValues.reduce((a, b) => a + b, 0)
    const sumY = yValues.reduce((a, b) => a + b, 0)
    const sumXY = xValues.reduce((sum, xi, i) => sum + xi * yValues[i], 0)
    const sumX2 = xValues.reduce((sum, xi) => sum + xi * xi, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    
    // Generate prediction points for the line
    const predictionData = chartData.map(item => {
      const hour = item.fallAsleepTime.getHours()
      const minute = item.fallAsleepTime.getMinutes()
      let x
      if (hour >= 22) {
        x = (hour - 22) + minute / 60
      } else {
        x = (24 - 22) + hour + minute / 60
      }
      const predictedY = slope * x + intercept
      return {
        ...item,
        predictedDuration: predictedY
      }
    })
    
    return {
      slope,
      intercept,
      predictionData
    }
  }, [chartData])

  // Calculate linear regression for wake time prediction
  const wakeTimePrediction = useMemo(() => {
    if (!chartData.length || chartData.length < 2) return null
    
    // X: fall asleep time in hours from 10 PM
    // Y: wake time in hours (5-10 AM range)
    const xValues = chartData.map(item => {
      const hour = item.fallAsleepTime.getHours()
      const minute = item.fallAsleepTime.getMinutes()
      if (hour >= 22) {
        return (hour - 22) + minute / 60
      } else {
        return (24 - 22) + hour + minute / 60
      }
    })
    
    const yValues = chartData.map(item => item.avgWakeTimeHour)
    
    // Calculate linear regression: y = mx + b
    const n = xValues.length
    const sumX = xValues.reduce((a, b) => a + b, 0)
    const sumY = yValues.reduce((a, b) => a + b, 0)
    const sumXY = xValues.reduce((sum, xi, i) => sum + xi * yValues[i], 0)
    const sumX2 = xValues.reduce((sum, xi) => sum + xi * xi, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    
    // Generate prediction points for the line
    const minX = Math.min(...xValues)
    const maxX = Math.max(...xValues)
    const predictionData = chartData.map(item => {
      const hour = item.fallAsleepTime.getHours()
      const minute = item.fallAsleepTime.getMinutes()
      let x
      if (hour >= 22) {
        x = (hour - 22) + minute / 60
      } else {
        x = (24 - 22) + hour + minute / 60
      }
      const predictedY = slope * x + intercept
      return {
        ...item,
        predictedWakeTime: predictedY
      }
    })
    
    return {
      slope,
      intercept,
      predictionData
    }
  }, [chartData])

  // Calculate optimal sleep time using prediction models
  const optimalSleepTime = useMemo(() => {
    if (!sleepDurationPrediction || !wakeTimePrediction || !chartData.length) return null
    
    // We want to maximize sleep duration while keeping wake time reasonable (6-8 AM)
    // Try different fall asleep times and see which gives best predicted duration
    // while keeping predicted wake time in a good range
    
    let bestTime = null
    let bestScore = -Infinity
    
    // Test times from 10 PM to 2 AM in 15-minute increments
    for (let hour = 22; hour <= 25; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const testHour = hour >= 24 ? hour - 24 : hour
        const testMinute = minute
        
        // Convert to hours from 10 PM
        let x
        if (hour >= 22) {
          x = (hour - 22) + minute / 60
        } else {
          x = (24 - 22) + hour + minute / 60
        }
        
        // Predict sleep duration
        const predictedDuration = sleepDurationPrediction.slope * x + sleepDurationPrediction.intercept
        
        // Predict wake time
        const predictedWakeHour = wakeTimePrediction.slope * x + wakeTimePrediction.intercept
        
        // Score: prioritize duration, but penalize wake times outside 6-8 AM
        let score = predictedDuration
        
        // Prefer wake times between 6-8 AM (6.0 to 8.0)
        if (predictedWakeHour < 6.0) {
          score -= (6.0 - predictedWakeHour) * 0.5 // Penalty for waking too early
        } else if (predictedWakeHour > 8.0) {
          score -= (predictedWakeHour - 8.0) * 0.5 // Penalty for waking too late
        } else {
          score += 0.5 // Bonus for ideal wake time range
        }
        
        if (score > bestScore) {
          bestScore = score
          bestTime = {
            hour: testHour,
            minute: testMinute,
            predictedDuration: predictedDuration,
            predictedWakeHour: predictedWakeHour
          }
        }
      }
    }
    
    if (!bestTime) return null
    
    // Format the time range
    const startTime = new Date(2000, 0, 1, bestTime.hour, bestTime.minute, 0)
    const endTime = new Date(2000, 0, 1, bestTime.hour, bestTime.minute + 15, 0)
    
    const time1 = startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York'
    })
    const time2 = endTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York'
    })
    
    // Format predicted wake time
    const wakeHour = Math.floor(bestTime.predictedWakeHour)
    const wakeMinute = Math.round((bestTime.predictedWakeHour - wakeHour) * 60)
    const wakeDate = new Date(2000, 0, 1, wakeHour, wakeMinute, 0)
    const wakeTimeStr = wakeDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York'
    })
    
    return {
      timeRange: `${time1} - ${time2}`,
      predictedDuration: bestTime.predictedDuration,
      predictedWakeTime: wakeTimeStr
    }
  }, [sleepDurationPrediction, wakeTimePrediction, chartData])

  // Add prediction data to chartData for sleep duration
  const chartDataWithDurationPrediction = useMemo(() => {
    if (!sleepDurationPrediction) return chartData
    
    return sleepDurationPrediction.predictionData.map((predItem, index) => {
      const originalItem = chartData[index]
      return {
        ...originalItem,
        predictedDuration: predItem.predictedDuration
      }
    })
  }, [chartData, sleepDurationPrediction])

  // Add prediction data to chartData for wake time
  const chartDataWithPrediction = useMemo(() => {
    if (!wakeTimePrediction) return chartData
    
    // Use the prediction data which already has predictedWakeTime
    return wakeTimePrediction.predictionData.map((predItem, index) => {
      const originalItem = chartData[index]
      return {
        ...originalItem,
        predictedWakeTime: predItem.predictedWakeTime
      }
    })
  }, [chartData, wakeTimePrediction])

  // Calculate correlations with other health data
  const correlations = useMemo(() => {
    if (!healthData || !filteredSleepData.length) return []
    
    const correlations = []
    
    // Match sleep data with health data by date
    filteredSleepData.forEach(sleep => {
      const sleepDate = new Date(sleep.sleepDate)
      
      // Get steps for the day before sleep (since steps are during the day)
      const prevDate = new Date(sleepDate)
      prevDate.setDate(prevDate.getDate() - 1)
      const daySteps = healthData.steps
        .filter(s => {
          const sDate = new Date(s.date)
          return sDate.toDateString() === prevDate.toDateString()
        })
        .reduce((sum, s) => sum + s.value, 0)
      
      // Get active energy for the day before
      const dayCalories = healthData.activeEnergy
        .filter(e => {
          const eDate = new Date(e.date)
          return eDate.toDateString() === prevDate.toDateString()
        })
        .reduce((sum, e) => sum + e.value, 0)
      
      // Get average heart rate for the day before
      const dayHeartRates = healthData.heartRate
        .filter(h => {
          const hDate = new Date(h.date)
          return hDate.toDateString() === prevDate.toDateString()
        })
        .map(h => h.value)
      const avgHeartRate = dayHeartRates.length > 0
        ? dayHeartRates.reduce((a, b) => a + b, 0) / dayHeartRates.length
        : null
      
      // Get number of workouts
      const workouts = healthData.workouts.filter(w => {
        const wDate = new Date(w.date)
        return wDate.toDateString() === prevDate.toDateString()
      }).length
      
      correlations.push({
        sleepDuration: sleep.durationHours,
        steps: daySteps,
        calories: dayCalories,
        heartRate: avgHeartRate,
        workouts: workouts,
        fallAsleepHour: new Date(sleep.fallAsleepTime).getHours() + new Date(sleep.fallAsleepTime).getMinutes() / 60
      })
    })
    
    // Calculate correlation coefficients
    const validData = correlations.filter(c => 
      c.steps > 0 || c.calories > 0 || c.heartRate !== null || c.workouts > 0
    )
    
    if (validData.length < 2) return []
    
    const sleepDurations = validData.map(d => d.sleepDuration)
    const steps = validData.map(d => d.steps)
    const calories = validData.map(d => d.calories)
    const heartRates = validData.map(d => d.heartRate).filter(h => h !== null)
    const heartRateDurations = validData.filter(d => d.heartRate !== null).map(d => d.sleepDuration)
    const workouts = validData.map(d => d.workouts)
    const fallAsleepHours = validData.map(d => d.fallAsleepHour)
    
    const results = []
    
    if (steps.length > 0) {
      const corr = calculateCorrelation(sleepDurations, steps)
      if (corr !== null) {
        results.push({ metric: 'Steps', correlation: corr, count: validData.length })
      }
    }
    
    if (calories.length > 0) {
      const corr = calculateCorrelation(sleepDurations, calories)
      if (corr !== null) {
        results.push({ metric: 'Active Calories', correlation: corr, count: validData.length })
      }
    }
    
    if (heartRates.length > 0 && heartRateDurations.length === heartRates.length) {
      const corr = calculateCorrelation(heartRateDurations, heartRates)
      if (corr !== null) {
        results.push({ metric: 'Avg Heart Rate', correlation: corr, count: heartRates.length })
      }
    }
    
    if (workouts.length > 0) {
      const corr = calculateCorrelation(sleepDurations, workouts)
      if (corr !== null) {
        results.push({ metric: 'Workouts', correlation: corr, count: validData.length })
      }
    }
    
    if (fallAsleepHours.length > 0) {
      const corr = calculateCorrelation(sleepDurations, fallAsleepHours)
      if (corr !== null) {
        results.push({ metric: 'Fall Asleep Time (hour)', correlation: corr, count: validData.length })
      }
    }
    
    return results.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
  }, [healthData, filteredSleepData])

  // Calculate workout correlations from workoutData
  const workoutCorrelations = useMemo(() => {
    if (!workoutData) return []
    
    const results = []
    const correlations = workoutData.correlations || {}
    
    // Also include workout summary info even if correlations are null
    const hasWorkoutData = workoutData.workouts && workoutData.workouts.length > 0
    const hasMatchedData = workoutData.matchedData && workoutData.matchedData.length > 0
    
    // Running today vs sleep duration
    if (correlations.runningToday_vs_duration !== null && !isNaN(correlations.runningToday_vs_duration)) {
      results.push({
        metric: 'Running Workout (Same Day)',
        correlation: correlations.runningToday_vs_duration,
        count: workoutData.matchedData?.length || 0,
        description: 'Correlation between running on the same day and sleep duration'
      })
    }
    
    // Running yesterday vs sleep duration
    if (correlations.runningYesterday_vs_duration !== null && !isNaN(correlations.runningYesterday_vs_duration)) {
      results.push({
        metric: 'Running Workout (Previous Day)',
        correlation: correlations.runningYesterday_vs_duration,
        count: workoutData.matchedData?.length || 0,
        description: 'Correlation between running the day before and sleep duration'
      })
    }
    
    // Strength today vs sleep duration
    if (correlations.strengthToday_vs_duration !== null && !isNaN(correlations.strengthToday_vs_duration)) {
      results.push({
        metric: 'Strength Workout (Same Day)',
        correlation: correlations.strengthToday_vs_duration,
        count: workoutData.matchedData?.length || 0,
        description: 'Correlation between strength training on the same day and sleep duration'
      })
    }
    
    // Strength yesterday vs sleep duration
    if (correlations.strengthYesterday_vs_duration !== null && !isNaN(correlations.strengthYesterday_vs_duration)) {
      results.push({
        metric: 'Strength Workout (Previous Day)',
        correlation: correlations.strengthYesterday_vs_duration,
        count: workoutData.matchedData?.length || 0,
        description: 'Correlation between strength training the day before and sleep duration'
      })
    }
    
    // Running today vs fall asleep time
    if (correlations.runningToday_vs_fallAsleepTime !== null && !isNaN(correlations.runningToday_vs_fallAsleepTime)) {
      results.push({
        metric: 'Running Workout (Same Day) vs Fall Asleep Time',
        correlation: correlations.runningToday_vs_fallAsleepTime,
        count: workoutData.matchedData?.length || 0,
        description: 'Correlation between running on the same day and fall asleep time'
      })
    }
    
    // Running yesterday vs fall asleep time
    if (correlations.runningYesterday_vs_fallAsleepTime !== null && !isNaN(correlations.runningYesterday_vs_fallAsleepTime)) {
      results.push({
        metric: 'Running Workout (Previous Day) vs Fall Asleep Time',
        correlation: correlations.runningYesterday_vs_fallAsleepTime,
        count: workoutData.matchedData?.length || 0,
        description: 'Correlation between running the day before and fall asleep time'
      })
    }
    
    // Strength today vs fall asleep time
    if (correlations.strengthToday_vs_fallAsleepTime !== null && !isNaN(correlations.strengthToday_vs_fallAsleepTime)) {
      results.push({
        metric: 'Strength Workout (Same Day) vs Fall Asleep Time',
        correlation: correlations.strengthToday_vs_fallAsleepTime,
        count: workoutData.matchedData?.length || 0,
        description: 'Correlation between strength training on the same day and fall asleep time'
      })
    }
    
    // Strength yesterday vs fall asleep time
    if (correlations.strengthYesterday_vs_fallAsleepTime !== null && !isNaN(correlations.strengthYesterday_vs_fallAsleepTime)) {
      results.push({
        metric: 'Strength Workout (Previous Day) vs Fall Asleep Time',
        correlation: correlations.strengthYesterday_vs_fallAsleepTime,
        count: workoutData.matchedData?.length || 0,
        description: 'Correlation between strength training the day before and fall asleep time'
      })
    }
    
    // If no correlations but we have workout data, show a summary
    if (results.length === 0 && hasWorkoutData) {
      const runningCount = workoutData.workouts.filter(w => w.type === 'running').length
      const strengthCount = workoutData.workouts.filter(w => w.type === 'strength').length
      const daysWithWorkouts = workoutData.matchedData ? 
        workoutData.matchedData.filter(d => d.hasRunningToday || d.hasStrengthToday || d.hasRunningYesterday || d.hasStrengthYesterday).length : 0
      
      results.push({
        metric: 'Workout Data Summary',
        correlation: null,
        count: workoutData.matchedData?.length || 0,
        description: `${workoutData.workouts.length} total workouts (${runningCount} running, ${strengthCount} strength). ${daysWithWorkouts} sleep days matched with workouts.`,
        isSummary: true
      })
    }
    
    return results.sort((a, b) => {
      // Put summaries at the end
      if (a.isSummary) return 1
      if (b.isSummary) return -1
      // Sort by correlation strength
      if (a.correlation === null) return 1
      if (b.correlation === null) return -1
      return Math.abs(b.correlation) - Math.abs(a.correlation)
    })
  }, [workoutData, filteredSleepData])

  return (
    <div className="sleep-analysis-container">
      <div className="sleep-header">
        <h2>😴 Sleep Analysis</h2>
        <p>Analyze your sleep patterns from Apple Health data</p>
      </div>

      <div className="file-upload-section">
        {loading && (
          <p className="data-info">
            ⏳ Loading health data from repository...
          </p>
        )}
        {error && (
          <p className="data-info" style={{ color: '#f44336' }}>
            ⚠️ {error}
          </p>
        )}
        <label className="file-upload-label">
          <input
            type="file"
            accept=".xml"
            onChange={handleFileUpload}
            className="file-input"
            disabled={loading}
          />
          {loading ? 'Loading...' : '📤 Upload Apple Health Export (export.xml)'}
        </label>
        {sleepData.length > 0 && !loading && (
          <p className="data-info" style={{ color: '#4caf50' }}>
            ✅ Loaded {sleepData.length} sleep sessions
          </p>
        )}
      </div>

      {sleepData.length > 0 && (
        <>
          {/* Optimal Sleep Time Prediction */}
          {optimalSleepTime && (
            <div style={{
              marginBottom: '30px',
              padding: '20px 30px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}>
              <h2 style={{ margin: '0 0 15px 0', fontSize: '1.5rem', fontWeight: '700' }}>
                🌙 Optimal Sleep Time Prediction
              </h2>
              <div style={{ fontSize: '1.2rem', marginBottom: '10px' }}>
                <strong>Recommended Sleep Window:</strong> {optimalSleepTime.timeRange} EST
              </div>
              <div style={{ fontSize: '1rem', opacity: 0.95 }}>
                Predicted Sleep Duration: <strong>{optimalSleepTime.predictedDuration.toFixed(2)} hours</strong>
                <span style={{ marginLeft: '20px' }}>
                  Predicted Wake Time: <strong>{optimalSleepTime.predictedWakeTime} EST</strong>
                </span>
              </div>
              <div style={{ marginTop: '15px', fontSize: '0.9rem', opacity: 0.9, fontStyle: 'italic' }}>
                Based on your sleep patterns, this time maximizes sleep duration while keeping wake time in the ideal 6-8 AM range
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="filters-section">
            <div className="filter-group">
              <label>Time Period:</label>
              <select
                value={timeFilter}
                onChange={(e) => {
                  setTimeFilter(e.target.value)
                  // Clear month/week selection when switching to "all"
                  if (e.target.value === 'all') {
                    setSelectedMonth(null)
                    setSelectedWeek(null)
                  }
                }}
                className="filter-select"
              >
                <option value="all">All Data</option>
                <option value="month">Month</option>
                <option value="week">Week</option>
              </select>
              <span className="filter-selected-value">
                Selected: {timeFilter === 'all' ? 'All Data' : timeFilter === 'month' ? 'Month' : 'Week'}
              </span>
            </div>

            {timeFilter === 'month' && (
              <div className="filter-group">
                <label>Month:</label>
                <select
                  value={selectedMonth || ''}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="filter-select"
                >
                  {availableMonths.map(month => {
                    const [year, m] = month.split('-')
                    const monthName = new Date(year, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    return (
                      <option key={month} value={month}>{monthName}</option>
                    )
                  })}
                </select>
                {selectedMonth && (
                  <span className="filter-selected-value">
                    Selected: {(() => {
                      const [year, m] = selectedMonth.split('-')
                      return new Date(year, m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    })()}
                  </span>
                )}
              </div>
            )}

            {timeFilter === 'week' && (
              <div className="filter-group">
                <label>Week:</label>
                <select
                  value={selectedWeek || ''}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="filter-select"
                >
                  {availableWeeks.map(week => {
                    const weekStart = new Date(week)
                    const weekEnd = new Date(weekStart)
                    weekEnd.setDate(weekEnd.getDate() + 6)
                    const label = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    return (
                      <option key={week} value={week}>{label}</option>
                    )
                  })}
                </select>
                {selectedWeek && (
                  <span className="filter-selected-value">
                    Selected: {(() => {
                      const weekStart = new Date(selectedWeek)
                      const weekEnd = new Date(weekStart)
                      weekEnd.setDate(weekEnd.getDate() + 6)
                      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    })()}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Average Sleep Duration by Fall Asleep Time */}
          <div className="chart-section">
            <h3>Average Sleep Duration by Time to Fall Asleep (15-min intervals)</h3>
            {idealSleepTime && (
              <div style={{ 
                marginBottom: '15px', 
                padding: '12px 20px', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600'
              }}>
                💤 <strong>Ideal Sleep Time:</strong> {idealSleepTime.timeRange} 
                <span style={{ marginLeft: '15px' }}>
                  (Average: {idealSleepTime.avgDuration.toFixed(2)} hours, {idealSleepTime.count} samples)
                </span>
              </div>
            )}
            <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: '#666' }}>
              <strong>Sample Count Color Guide:</strong>
              <span style={{ marginLeft: '15px', color: '#4caf50' }}>● 20+ samples</span>
              <span style={{ marginLeft: '15px', color: '#8bc34a' }}>● 10-19 samples</span>
              <span style={{ marginLeft: '15px', color: '#ffc107' }}>● 5-9 samples</span>
              <span style={{ marginLeft: '15px', color: '#ff9800' }}>● 2-4 samples</span>
              <span style={{ marginLeft: '15px', color: '#f44336' }}>● 1 sample</span>
              <span style={{ marginLeft: '15px' }}>(Darker = more samples)</span>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={chartDataWithDurationPrediction}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timeRange" 
                    angle={-45}
                    textAnchor="end"
                    height={200}
                    interval={0}
                    tickFormatter={(value, index) => {
                      return value
                    }}
                  />
                  <YAxis 
                    label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
                    width={60}
                    domain={[5, 9]}
                    ticks={[5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9]}
                  />
                  <Tooltip 
                    formatter={(value, name, props) => {
                      if (name === 'Predicted Duration') {
                        return [`${value.toFixed(2)} hours`, name]
                      }
                      const count = props.payload?.count || 0
                      return [
                        `${value.toFixed(2)} hours (${count} ${count === 1 ? 'sample' : 'samples'})`,
                        'Avg Duration'
                      ]
                    }}
                    labelFormatter={(label) => `Time: ${label}`}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px', marginBottom: '50px', paddingBottom: '30px' }} />
                  <Bar dataKey="avgDuration" name="Avg Sleep Duration (hours)">
                    {chartDataWithDurationPrediction.map((entry, index) => {
                      // Use sample count color with opacity
                      const finalColor = entry.sampleColor || '#667eea'
                      const opacity = entry.sampleOpacity || 1
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={finalColor}
                          opacity={opacity}
                          stroke={finalColor}
                          strokeWidth={2}
                        />
                      )
                    })}
                  </Bar>
                  {sleepDurationPrediction && (
                    <Line
                      type="monotone"
                      dataKey="predictedDuration"
                      stroke="#ff7300"
                      strokeDasharray="3 4"
                      strokeWidth={2}
                      dot={false}
                      name={`Predicted Duration (y=${sleepDurationPrediction.slope.toFixed(2)}x + ${sleepDurationPrediction.intercept.toFixed(2)})`}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={{ height: '100px' }}></div>
          </div>

          {/* Average Wake Time by Fall Asleep Time */}
          <div className="chart-section">
            <h3>Average Wake Time by Time to Fall Asleep (15-min intervals)</h3>
            {sleepTimeCorrelation !== null && (
              <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: '#666' }}>
                <strong>Correlation (Fall Asleep Time vs Sleep Duration):</strong>
                <span style={{ 
                  marginLeft: '10px', 
                  color: Math.abs(sleepTimeCorrelation) > 0.7 ? '#4caf50' : Math.abs(sleepTimeCorrelation) > 0.4 ? '#ffc107' : '#999',
                  fontWeight: 'bold'
                }}>
                  {sleepTimeCorrelation.toFixed(3)}
                </span>
                <span style={{ marginLeft: '10px', fontSize: '0.85rem' }}>
                  ({Math.abs(sleepTimeCorrelation) > 0.7 ? 'Strong' : Math.abs(sleepTimeCorrelation) > 0.4 ? 'Moderate' : 'Weak'} 
                  {sleepTimeCorrelation > 0 ? ' positive' : ' negative'} correlation)
                </span>
              </div>
            )}
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartDataWithPrediction}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timeRange" 
                    angle={-45}
                    textAnchor="end"
                    height={120}
                    interval={0}
                  />
                  <YAxis 
                    label={{ value: 'Time of Day (EST)', angle: -90, position: 'insideLeft' }}
                    domain={[5, 10]}
                    width={80}
                    ticks={[5, 5.25, 5.5, 5.75, 6, 6.25, 6.5, 6.75, 7, 7.25, 7.5, 7.75, 8, 8.25, 8.5, 8.75, 9, 9.25, 9.5, 9.75, 10]}
                    tickFormatter={(value) => {
                      const hour = Math.floor(value)
                      const minute = Math.round((value - hour) * 60)
                      const date = new Date()
                      date.setHours(hour, minute, 0)
                      const timeStr = date.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })
                      return timeStr
                    }}
                  />
                  <Tooltip 
                    formatter={(value, name, props) => {
                      const hour = Math.floor(value)
                      const minute = Math.round((value - hour) * 60)
                      const date = new Date()
                      date.setHours(hour, minute, 0)
                      const timeStr = date.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })
                      return [`${timeStr} EST`, 'Avg Wake Time']
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="avgWakeTimeHour" 
                    stroke="#764ba2" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Avg Wake Time"
                  />
                  {wakeTimePrediction && (
                    <Line 
                      type="linear" 
                      dataKey="predictedWakeTime" 
                      stroke="#ff9800" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Predicted Wake Time"
                      connectNulls={false}
                    />
                  )}
                  {wakeTimePrediction && (
                    <Line 
                      type="linear" 
                      dataKey="predictedWakeTime" 
                      stroke="#ff9800" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Predicted Wake Time"
                      connectNulls={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Correlations */}
          {(correlations.length > 0 || workoutCorrelations.length > 0) && (
            <div className="correlations-section">
              <h3>Sleep Duration Correlations</h3>
              <p className="correlation-description">
                Correlation coefficient ranges from -1 (strong negative) to +1 (strong positive). 
                Values closer to 0 indicate no correlation.
              </p>
              
              {correlations.length > 0 && (
                <>
                  <h4 style={{ marginTop: '20px', marginBottom: '10px', fontSize: '1.1rem' }}>General Health Metrics</h4>
                  <div className="correlations-grid">
                    {correlations.map((corr, index) => {
                      const absCorr = Math.abs(corr.correlation)
                      const strength = absCorr > 0.7 ? 'Strong' : absCorr > 0.4 ? 'Moderate' : 'Weak'
                      const direction = corr.correlation > 0 ? 'Positive' : 'Negative'
                      const color = absCorr > 0.7 ? '#4caf50' : absCorr > 0.4 ? '#ffc107' : '#999'
                      
                      return (
                        <div key={index} className="correlation-card">
                          <div className="correlation-metric">{corr.metric}</div>
                          <div className="correlation-value" style={{ color }}>
                            {corr.correlation.toFixed(3)}
                          </div>
                          <div className="correlation-strength">
                            {strength} {direction} ({corr.count} data points)
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
              
              {workoutCorrelations.length > 0 && (
                <>
                  <h4 style={{ marginTop: '30px', marginBottom: '10px', fontSize: '1.1rem' }}>Workout Correlations</h4>
                  <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px' }}>
                    How running and strength training workouts correlate with your sleep patterns
                  </p>
                  <div className="correlations-grid">
                    {workoutCorrelations.map((corr, index) => {
                      // Handle summary cards (no correlation value)
                      if (corr.isSummary || corr.correlation === null) {
                        return (
                          <div key={`workout-${index}`} className="correlation-card" style={{ border: '2px solid #667eea' }}>
                            <div className="correlation-metric">{corr.metric}</div>
                            <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '10px' }}>
                              {corr.description}
                            </div>
                            {corr.count > 0 && (
                              <div style={{ fontSize: '0.85rem', color: '#999', marginTop: '5px' }}>
                                Based on {corr.count} sleep sessions
                              </div>
                            )}
                          </div>
                        )
                      }
                      
                      const absCorr = Math.abs(corr.correlation)
                      const strength = absCorr > 0.7 ? 'Strong' : absCorr > 0.4 ? 'Moderate' : 'Weak'
                      const direction = corr.correlation > 0 ? 'Positive' : 'Negative'
                      const color = absCorr > 0.7 ? '#4caf50' : absCorr > 0.4 ? '#ffc107' : '#999'
                      
                      return (
                        <div key={`workout-${index}`} className="correlation-card">
                          <div className="correlation-metric">{corr.metric}</div>
                          <div className="correlation-value" style={{ color }}>
                            {corr.correlation.toFixed(3)}
                          </div>
                          <div className="correlation-strength">
                            {strength} {direction} ({corr.count} data points)
                          </div>
                          {corr.description && (
                            <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '5px' }}>
                              {corr.description}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default SleepAnalysis

