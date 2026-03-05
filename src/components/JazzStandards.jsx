import React, { useState, useEffect, useMemo } from 'react'
import { parseJazzStandardsPDF } from '../utils/parseJazzStandards'
import './JazzStandards.css'

function JazzStandards() {
  const [standards, setStandards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedFrequency, setSelectedFrequency] = useState('all')
  const [sortBy, setSortBy] = useState('frequency') // 'frequency', 'alphabetical'
  const [searchQuery, setSearchQuery] = useState('')
  const [randomTune, setRandomTune] = useState(null)
  const [randomFrequencyFilter, setRandomFrequencyFilter] = useState('all')

  useEffect(() => {
    loadStandards()
  }, [])

  const loadStandards = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await parseJazzStandardsPDF()
      setStandards(data.standards)
      setLoading(false)
    } catch (err) {
      setError(`Failed to load jazz standards: ${err.message}`)
      setLoading(false)
    }
  }

  // Filter and sort standards
  const processedStandards = useMemo(() => {
    let filtered = standards

    // Filter by frequency
    if (selectedFrequency !== 'all') {
      filtered = filtered.filter(standard => standard.frequency === selectedFrequency)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(standard => 
        standard.name.toLowerCase().includes(query)
      )
    }

    // Sort
    if (sortBy === 'alphabetical') {
      filtered.sort((a, b) => a.name.localeCompare(b.name))
    } else {
      // Sort by frequency (already sorted, but maintain order)
      filtered.sort((a, b) => {
        if (b.frequencyScore !== a.frequencyScore) {
          return b.frequencyScore - a.frequencyScore
        }
        return a.name.localeCompare(b.name)
      })
    }

    return filtered
  }, [standards, selectedFrequency, sortBy, searchQuery])

  const getFrequencyLabel = (frequency) => {
    const labels = {
      'must-know': '- Must Know NOW!',
      'important-bass': '- Important Bass Line',
      'everyone-plays': 'Bold - everyone plays!',
      'called-often': 'Regular - Have been called often on my gigs',
      'obscure': 'Italic - relatively obscure but good to know'
    }
    return labels[frequency] || frequency
  }

  const getFrequencyColor = (frequency) => {
    const colors = {
      'must-know': '#d32f2f',        // Red - highest priority
      'important-bass': '#f57c00',    // Orange - very important
      'everyone-plays': '#fbc02d',    // Yellow - common
      'called-often': '#388e3c',      // Green - regular
      'obscure': '#1976d2'            // Blue - less common
    }
    return colors[frequency] || '#666'
  }

  const frequencyCounts = useMemo(() => {
    const counts = {
      'must-know': 0,
      'important-bass': 0,
      'everyone-plays': 0,
      'called-often': 0,
      'obscure': 0
    }
    standards.forEach(standard => {
      counts[standard.frequency] = (counts[standard.frequency] || 0) + 1
    })
    return counts
  }, [standards])

  const pickRandomTune = () => {
    // Filter by frequency if specified
    let pool = standards
    if (randomFrequencyFilter !== 'all') {
      pool = standards.filter(s => s.frequency === randomFrequencyFilter)
    }
    
    if (pool.length === 0) {
      setRandomTune(null)
      return
    }
    
    // Weight by obscurity (inverse of frequency score)
    // Lower frequency score = more obscure = less likely to be picked
    // Higher frequency score = less obscure = more likely to be picked
    // We'll use frequency score as weight (higher score = higher weight)
    const weights = pool.map(standard => standard.frequencyScore)
    const totalWeight = weights.reduce((sum, w) => sum + w, 0)
    
    // Generate random number between 0 and totalWeight
    let random = Math.random() * totalWeight
    let selectedIndex = 0
    
    // Find which item the random number falls into
    for (let i = 0; i < pool.length; i++) {
      random -= weights[i]
      if (random <= 0) {
        selectedIndex = i
        break
      }
    }
    
    setRandomTune(pool[selectedIndex])
  }

  if (loading) {
    return (
      <div className="jazz-standards-container">
        <div className="loading">Loading jazz standards...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="jazz-standards-container">
        <div className="error">{error}</div>
        <button onClick={loadStandards} className="retry-button">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="jazz-standards-container">
      <div className="jazz-standards-header">
        <h2>🎷 Jazz Standards</h2>
        <p className="standards-count">
          {processedStandards.length} {selectedFrequency !== 'all' || searchQuery ? 'filtered' : ''} standard{processedStandards.length !== 1 ? 's' : ''}
          {standards.length > 0 && ` of ${standards.length} total`}
        </p>
      </div>

      {/* Random Tune Picker */}
      <div className="random-tune-picker">
        <h3>🎲 Random Tune Picker</h3>
        <div className="random-picker-controls">
          <div className="filter-group">
            <label>Pick from:</label>
            <select 
              value={randomFrequencyFilter} 
              onChange={(e) => setRandomFrequencyFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Frequencies (Weighted)</option>
              <option value="must-know">- Must Know NOW!</option>
              <option value="important-bass">- Important Bass Line</option>
              <option value="everyone-plays">Bold - everyone plays!</option>
              <option value="called-often">Regular - Have been called often on my gigs</option>
              <option value="obscure">Italic - relatively obscure but good to know</option>
            </select>
          </div>
          <button 
            onClick={pickRandomTune}
            className="pick-random-button"
          >
            🎲 Pick Random Tune
          </button>
        </div>
        {randomTune && (
          <div className="random-tune-result">
            <div className="random-tune-name">{randomTune.name}</div>
            <div className="random-tune-meta">
              <span 
                className="random-tune-frequency"
                style={{ 
                  backgroundColor: getFrequencyColor(randomTune.frequency),
                  color: 'white'
                }}
              >
                {getFrequencyLabel(randomTune.frequency)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="jazz-standards-filters">
        <div className="filter-group">
          <label>Search:</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search standards..."
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label>Frequency:</label>
          <select 
            value={selectedFrequency} 
            onChange={(e) => setSelectedFrequency(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Frequencies</option>
            <option value="must-know">- Must Know NOW! ({frequencyCounts['must-know']})</option>
            <option value="important-bass">- Important Bass Line ({frequencyCounts['important-bass']})</option>
            <option value="everyone-plays">Bold - everyone plays! ({frequencyCounts['everyone-plays']})</option>
            <option value="called-often">Regular - Have been called often on my gigs ({frequencyCounts['called-often']})</option>
            <option value="obscure">Italic - relatively obscure but good to know ({frequencyCounts['obscure']})</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Sort by:</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="frequency">Frequency (Highest First)</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Frequency Summary */}
      <div className="frequency-summary">
        <div className="frequency-badge" style={{ backgroundColor: getFrequencyColor('must-know') + '20', borderColor: getFrequencyColor('must-know') }}>
          <span className="frequency-label">- Must Know NOW!:</span>
          <span className="frequency-count">{frequencyCounts['must-know']}</span>
        </div>
        <div className="frequency-badge" style={{ backgroundColor: getFrequencyColor('important-bass') + '20', borderColor: getFrequencyColor('important-bass') }}>
          <span className="frequency-label">- Important Bass Line:</span>
          <span className="frequency-count">{frequencyCounts['important-bass']}</span>
        </div>
        <div className="frequency-badge" style={{ backgroundColor: getFrequencyColor('everyone-plays') + '20', borderColor: getFrequencyColor('everyone-plays') }}>
          <span className="frequency-label">Bold - everyone plays!:</span>
          <span className="frequency-count">{frequencyCounts['everyone-plays']}</span>
        </div>
        <div className="frequency-badge" style={{ backgroundColor: getFrequencyColor('called-often') + '20', borderColor: getFrequencyColor('called-often') }}>
          <span className="frequency-label">Regular - Have been called often on my gigs:</span>
          <span className="frequency-count">{frequencyCounts['called-often']}</span>
        </div>
        <div className="frequency-badge" style={{ backgroundColor: getFrequencyColor('obscure') + '20', borderColor: getFrequencyColor('obscure') }}>
          <span className="frequency-label">Italic - relatively obscure but good to know:</span>
          <span className="frequency-count">{frequencyCounts['obscure']}</span>
        </div>
      </div>

      {/* Standards List */}
      <div className="standards-list">
        {processedStandards.length === 0 ? (
          <div className="no-standards">No standards found matching your filters.</div>
        ) : (
          processedStandards.map((standard, index) => (
            <div 
              key={`${standard.name}-${index}`} 
              className="standard-item"
              style={{ borderLeftColor: getFrequencyColor(standard.frequency) }}
            >
              <div className="standard-main">
                <span className="standard-name">{standard.name}</span>
                <span 
                  className="standard-frequency-badge"
                  style={{ 
                    backgroundColor: getFrequencyColor(standard.frequency),
                    color: 'white'
                  }}
                >
                  {getFrequencyLabel(standard.frequency)}
                </span>
              </div>
              {standard.originalText !== standard.name && (
                <div className="standard-meta">
                  <span className="standard-original">Original: {standard.originalText}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default JazzStandards

