import React, { useState, useEffect } from 'react'
import initSqlJs from 'sql.js'
import { analyzeReadingData } from './utils/analyzeData'
import { extractSavedWords } from './utils/analyzeWords'
import { extractHighlights } from './utils/analyzeHighlights'
import ReadingProgressChart from './components/ReadingProgressChart'
import SessionTimesChart from './components/SessionTimesChart'
import WordList from './components/WordList'
import WordGame from './components/WordGame'
import HealthData from './components/HealthData'
import Highlights from './components/Highlights'
import JazzStandards from './components/JazzStandards'
import StoryViewer from './components/StoryViewer'
import './App.css'

function App() {
  const [db, setDb] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [readingData, setReadingData] = useState(null)
  const [wordData, setWordData] = useState(null)
  const [highlightsData, setHighlightsData] = useState(null)
  const [sqlJs, setSqlJs] = useState(null)
  const [filteredWordCount, setFilteredWordCount] = useState(null)
  const [activeTab, setActiveTab] = useState(() => {
    // Load saved tab from localStorage
    const savedTab = localStorage.getItem('koboActiveTab')
    return savedTab || 'overview'
  })

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('koboActiveTab', activeTab)
  }, [activeTab])

  useEffect(() => {
    // Initialize sql.js
    initSqlJs({
      locateFile: (file) => `https://sql.js.org/dist/${file}`
    }).then((SQL) => {
      setSqlJs(SQL)
      loadDatabase(SQL)
    }).catch(err => {
      setError(`Failed to load sql.js: ${err.message}`)
      setLoading(false)
    })
  }, [])

  const loadDatabase = async (SQL) => {
    try {
      setLoading(true)
      setError(null)

      // Load the default SQLite file (put KoboReader.sqlite in public/ to ship a default)
      const base = import.meta.env.BASE_URL
      const dbPath = `${base}KoboReader.sqlite`
      const response = await fetch(dbPath)
      if (!response.ok) {
        setError('No database loaded. Upload your KoboReader.sqlite file below.')
        setLoading(false)
        return
      }

      const buffer = await response.arrayBuffer()
      const db = new SQL.Database(new Uint8Array(buffer))
      setDb(db)
      
      // Analyze the data
      const data = analyzeReadingData(db)
      setReadingData(data)
      
      // Extract saved words
      const words = extractSavedWords(db)
      setWordData(words)
      
      // Extract highlights
      const highlights = extractHighlights(db)
      setHighlightsData(highlights)
      
      setLoading(false)
    } catch (err) {
      setError(`Failed to load database: ${err.message}`)
      setLoading(false)
    }
  }

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file || !sqlJs) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const buffer = e.target.result
        const db = new sqlJs.Database(new Uint8Array(buffer))
        setDb(db)
        
        const data = analyzeReadingData(db)
        setReadingData(data)
        
        // Extract saved words
        const words = extractSavedWords(db)
        setWordData(words)
        
        // Extract highlights
        const highlights = extractHighlights(db)
        setHighlightsData(highlights)
        
        setError(null)
      } catch (err) {
        setError(`Failed to process file: ${err.message}`)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  if (loading) {
    return (
      <div className="app">
        <div className="container">
          <div className="loading">Loading database...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app">
        <div className="container">
          <div className="error">{error}</div>
          <input
            type="file"
            accept=".sqlite,.db"
            onChange={handleFileUpload}
            className="file-input"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="container">
        <header>
          <h1>📚 Personal Dashboard</h1>
          <p>Reading, Words, Games & Health Tracking</p>
          {activeTab === 'overview' && (
            <input
              type="file"
              accept=".sqlite,.db"
              onChange={handleFileUpload}
              className="file-input"
            />
          )}
        </header>

        {/* Tab Navigation */}
        <div className="tabs">
          <button
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          {wordData && wordData.totalWords > 0 && (
            <button
              className={`tab-button ${activeTab === 'words' ? 'active' : ''}`}
              onClick={() => setActiveTab('words')}
            >
              📚 Words
            </button>
          )}
          {wordData && wordData.totalWords > 0 && (
            <button
              className={`tab-button ${activeTab === 'game' ? 'active' : ''}`}
              onClick={() => setActiveTab('game')}
            >
              🎮 Game
            </button>
          )}
          {highlightsData && highlightsData.totalHighlights > 0 && (
            <button
              className={`tab-button ${activeTab === 'highlights' ? 'active' : ''}`}
              onClick={() => setActiveTab('highlights')}
            >
              📖 Highlights
            </button>
          )}
          <button
            className={`tab-button ${activeTab === 'jazz' ? 'active' : ''}`}
            onClick={() => setActiveTab('jazz')}
          >
            🎷 Jazz Standards
          </button>
          <button
            className={`tab-button ${activeTab === 'health' ? 'active' : ''}`}
            onClick={() => setActiveTab('health')}
          >
            💊 Health
          </button>
          <button
            className={`tab-button ${activeTab === 'story' ? 'active' : ''}`}
            onClick={() => setActiveTab('story')}
          >
            📖 Story
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'overview' && (
            <>
              {readingData && (
                <div className="stats-grid">
                  <div className="stat-card">
                    <h3>Total Books</h3>
                    <p className="stat-value">{readingData.totalBooks}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Total Pages Read</h3>
                    <p className="stat-value">{readingData.totalPages.toLocaleString()}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Reading Days</h3>
                    <p className="stat-value">{readingData.readingDays}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Total Sessions</h3>
                    <p className="stat-value">{readingData.totalSessions}</p>
                  </div>
                  {wordData && wordData.totalWords > 0 && (
                    <div className="stat-card">
                      <h3>Saved Words</h3>
                      <p className="stat-value">
                        {filteredWordCount !== null ? filteredWordCount : wordData.totalWords}
                      </p>
                      {filteredWordCount !== null && filteredWordCount !== wordData.totalWords && (
                        <p style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '4px' }}>
                          of {wordData.totalWords} total
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {readingData && (
                <>
                  <div className="chart-container">
                    <h2>Pages Read Per Day</h2>
                    <ReadingProgressChart data={readingData.pagesPerDay} />
                  </div>

                  <div className="chart-container">
                    <h2>Reading Session Times</h2>
                    <SessionTimesChart data={readingData.sessions} />
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === 'words' && wordData && wordData.totalWords > 0 && (
            <WordList 
              words={wordData.words} 
              languages={wordData.languages}
              onFilterChange={(filterInfo) => {
                setFilteredWordCount(filterInfo.filteredCount)
              }}
            />
          )}

          {activeTab === 'game' && wordData && wordData.totalWords > 0 && (
            <WordGame 
              words={wordData.words} 
              languages={wordData.languages}
            />
          )}

          {activeTab === 'highlights' && highlightsData && highlightsData.totalHighlights > 0 && (
            <Highlights 
              highlights={highlightsData.highlights}
              books={highlightsData.books}
            />
          )}

          {activeTab === 'jazz' && (
            <JazzStandards />
          )}

          {activeTab === 'health' && (
            <HealthData />
          )}

          {activeTab === 'story' && (
            <StoryViewer />
          )}
        </div>
      </div>
    </div>
  )
}

export default App

