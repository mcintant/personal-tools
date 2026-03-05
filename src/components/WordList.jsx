import React, { useState, useMemo, useEffect } from 'react'
import { prioritizeWords, categorizeWord } from '../utils/wordFrequency'
import { loadFrequencyDatabase, loadFullFrequencyData } from '../utils/loadFrequencyData'
import { loadDefinitionsDatabase, getLocalDefinition } from '../utils/loadDefinitions'
import { getFavorites, toggleFavorite, isFavorite } from '../utils/favoritesDB'
// Removed API imports - only using local definitions
import './WordList.css'

function WordList({ words, languages, onFilterChange }) {
  const [selectedLanguage, setSelectedLanguage] = useState('all')
  const [selectedBook, setSelectedBook] = useState('all')
  const [sortBy, setSortBy] = useState('priority') // 'priority', 'rank', 'alphabetical', 'date'
  const [showCategory, setShowCategory] = useState('all')
  const [frequencyData, setFrequencyData] = useState(null)
  const [fullFrequencyData, setFullFrequencyData] = useState(null)
  const [loadingFrequency, setLoadingFrequency] = useState(true)
  const [localDefinitions, setLocalDefinitions] = useState(null)
  const [expandedWords, setExpandedWords] = useState(new Set())
  const [wordDefinitions, setWordDefinitions] = useState(new Map())
  const [loadingDefinitions, setLoadingDefinitions] = useState(new Set())
  const [showAllDefinitions, setShowAllDefinitions] = useState(false)
  const [favorites, setFavorites] = useState(new Set())
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  // Load frequency database and definitions on mount
  useEffect(() => {
    Promise.all([
      loadFrequencyDatabase(),
      loadFullFrequencyData(),
      loadDefinitionsDatabase()
    ]).then(([rankData, fullData, definitionsData]) => {
      setFrequencyData(rankData)
      setFullFrequencyData(fullData)
      setLocalDefinitions(definitionsData)
      setLoadingFrequency(false)
      
      // If definitions loaded, populate the definitions map
      if (definitionsData) {
        const definitionsMap = new Map()
        Object.entries(definitionsData).forEach(([word, definition]) => {
          definitionsMap.set(word, definition)
        })
        setWordDefinitions(definitionsMap)
      }
    }).catch(err => {
      console.error('Failed to load databases:', err)
      setLoadingFrequency(false)
    })
  }, [])

  // Load favorites on mount
  useEffect(() => {
    getFavorites().then(favs => {
      setFavorites(favs)
    }).catch(err => {
      console.error('Failed to load favorites:', err)
    })
  }, [])

  // Filter and prioritize words
  const processedWords = useMemo(() => {
    let filtered = words

    // Filter by language
    if (selectedLanguage !== 'all') {
      filtered = filtered.filter(word => word.language === selectedLanguage)
    }

    // Filter by book
    if (selectedBook !== 'all') {
      filtered = filtered.filter(word => word.bookTitle === selectedBook)
    }

    // Prioritize words (use loaded frequency data if available)
    // fullFrequencyData contains Zipf frequencies for better categorization
    const prioritized = prioritizeWords(filtered, frequencyData, fullFrequencyData)

    // Filter by category
    if (showCategory !== 'all') {
      filtered = prioritized.filter(word => word.category.category === showCategory)
    } else {
      filtered = prioritized
    }

    // Filter by favorites
    if (showFavoritesOnly) {
      filtered = filtered.filter(word => favorites.has(word.text.toLowerCase().trim()))
    }

    // Sort
    if (sortBy === 'alphabetical') {
      filtered.sort((a, b) => a.text.localeCompare(b.text))
    } else if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))
    } else if (sortBy === 'rank') {
      // Sort by frequency rank (ascending: most common first, descending: least common first)
      filtered.sort((a, b) => {
        const rankA = a.frequencyRank || 100000
        const rankB = b.frequencyRank || 100000
        return rankA - rankB // Lower rank (more common) first
      })
    }
    // 'priority' is already sorted by prioritizeWords (rare words first)

    return filtered
  }, [words, selectedLanguage, selectedBook, sortBy, showCategory, frequencyData, fullFrequencyData, showFavoritesOnly, favorites])

  // Notify parent of filtered word count changes
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange({
        filteredCount: processedWords.length,
        totalCount: words.length,
        selectedBook,
        selectedLanguage,
        showCategory
      })
    }
  }, [processedWords.length, words.length, selectedBook, selectedLanguage, showCategory, onFilterChange])

  const categoryCounts = useMemo(() => {
    const counts = {
      'very-rare': 0,
      'rare': 0,
      'uncommon': 0,
      'common': 0,
      'very-common': 0
    }
    // Count categories based on filtered words (before category filter is applied)
    let filtered = words
    
    if (selectedLanguage !== 'all') {
      filtered = filtered.filter(word => word.language === selectedLanguage)
    }
    
    if (selectedBook !== 'all') {
      filtered = filtered.filter(word => word.bookTitle === selectedBook)
    }
    
    filtered.forEach(word => {
      // Try to get Zipf frequency from fullFrequencyData if available
      let zipf = null
      if (fullFrequencyData && typeof fullFrequencyData === 'object') {
        const normalized = word.text.toLowerCase().trim()
        const wordData = fullFrequencyData[normalized]
        if (wordData && typeof wordData === 'object' && 'zipf' in wordData) {
          zipf = wordData.zipf
        }
      }
      const cat = categorizeWord(word.text, frequencyData, zipf)
      counts[cat.category] = (counts[cat.category] || 0) + 1
    })
    return counts
  }, [words, selectedLanguage, selectedBook, frequencyData, fullFrequencyData])

  const getCategoryColor = (category) => {
    const colors = {
      'very-rare': '#d32f2f',
      'rare': '#f57c00',
      'uncommon': '#fbc02d',
      'common': '#388e3c',
      'very-common': '#1976d2'
    }
    return colors[category] || '#666'
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateString
    }
  }

  const toggleWordExpansion = (wordText) => {
    const normalized = wordText.toLowerCase().trim()
    
    if (expandedWords.has(normalized)) {
      // Collapse
      const newExpanded = new Set(expandedWords)
      newExpanded.delete(normalized)
      setExpandedWords(newExpanded)
    } else {
      // Expand - only use local definitions
      setExpandedWords(new Set([...expandedWords, normalized]))
      
      // Check if definition exists in local database
      const localDef = localDefinitions ? getLocalDefinition(wordText, localDefinitions) : null
      
      if (localDef) {
        // Found in local database, add to cache for consistency
        if (!wordDefinitions.has(normalized)) {
          setWordDefinitions(new Map([...wordDefinitions, [normalized, localDef]]))
        }
      }
      // No API calls - only use local definitions
    }
  }

  const isWordExpanded = (wordText) => {
    return expandedWords.has(wordText.toLowerCase().trim())
  }

  const getWordDefinition = (wordText) => {
    const normalized = wordText.toLowerCase().trim()
    
    // First try local definitions (from local JSON file)
    if (localDefinitions) {
      const localDef = getLocalDefinition(wordText, localDefinitions)
      if (localDef) {
        return localDef
      }
    }
    
    // Fallback to in-memory cache (populated from local definitions)
    return wordDefinitions.get(normalized)
  }

  const isDefinitionLoading = (wordText) => {
    return loadingDefinitions.has(wordText.toLowerCase().trim())
  }

  const handleToggleFavorite = async (wordText) => {
    const normalized = wordText.toLowerCase().trim()
    try {
      const isFav = await toggleFavorite(wordText)
      setFavorites(prev => {
        const newFavs = new Set(prev)
        if (isFav) {
          newFavs.add(normalized)
        } else {
          newFavs.delete(normalized)
        }
        return newFavs
      })
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const isWordFavorite = (wordText) => {
    return favorites.has(wordText.toLowerCase().trim())
  }

  return (
    <div className="word-list-container">
      <div className="word-list-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ margin: 0 }}>📚 Saved Words</h2>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={showAllDefinitions}
              onChange={(e) => {
                setShowAllDefinitions(e.target.checked)
                if (e.target.checked) {
                  // Expand all words
                  const allWords = new Set(processedWords.map(w => w.text.toLowerCase().trim()))
                  setExpandedWords(allWords)
                } else {
                  // Collapse all
                  setExpandedWords(new Set())
                }
              }}
              style={{ cursor: 'pointer' }}
            />
            <span>Show all definitions</span>
          </label>
        </div>
        <p className="word-count">
          {processedWords.length} {selectedBook !== 'all' || selectedLanguage !== 'all' || showCategory !== 'all' ? 'filtered' : ''} words
          {selectedBook !== 'all' && ` from "${selectedBook}"`}
          {loadingFrequency && <span className="loading-badge">Loading frequency data...</span>}
          {!loadingFrequency && frequencyData && Object.keys(frequencyData).length > 1000 && (
            <span className="frequency-badge">✓ Using full frequency database</span>
          )}
          {localDefinitions && (
            <span className="frequency-badge" style={{ backgroundColor: '#d4edda', color: '#155724' }}>
              ✓ {Object.keys(localDefinitions).length} definitions loaded
            </span>
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="word-filters">
        <div className="filter-group">
          <label>Language:</label>
          <select 
            value={selectedLanguage} 
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Languages</option>
            {languages.map(lang => (
              <option key={lang} value={lang}>{lang || 'Unknown'}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Book:</label>
          <select 
            value={selectedBook || 'all'} 
            onChange={(e) => setSelectedBook(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Books</option>
            {Array.from(new Set(words.map(w => w.bookTitle).filter(Boolean))).sort().map(book => (
              <option key={book} value={book}>{book}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Category:</label>
          <select 
            value={showCategory} 
            onChange={(e) => setShowCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            <option value="very-rare">Very Rare ({categoryCounts['very-rare']})</option>
            <option value="rare">Rare ({categoryCounts['rare']})</option>
            <option value="uncommon">Uncommon ({categoryCounts['uncommon']})</option>
            <option value="common">Common ({categoryCounts['common']})</option>
            <option value="very-common">Very Common ({categoryCounts['very-common']})</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Sort by:</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="priority">Priority (Learn First)</option>
            <option value="rank">Rank (Most Common First)</option>
            <option value="alphabetical">Alphabetical</option>
            <option value="date">Date Saved</option>
          </select>
        </div>

        <div className="filter-group">
          <label>
            <input
              type="checkbox"
              checked={showFavoritesOnly}
              onChange={(e) => setShowFavoritesOnly(e.target.checked)}
              style={{ marginRight: '8px', cursor: 'pointer' }}
            />
            Show Favorites Only ({favorites.size})
          </label>
        </div>
      </div>

      {/* Category Summary */}
      <div className="category-summary">
        <div className="category-badge" style={{ backgroundColor: getCategoryColor('very-rare') + '20', borderColor: getCategoryColor('very-rare') }}>
          <span className="category-label">Very Rare:</span>
          <span className="category-count">{categoryCounts['very-rare']}</span>
        </div>
        <div className="category-badge" style={{ backgroundColor: getCategoryColor('rare') + '20', borderColor: getCategoryColor('rare') }}>
          <span className="category-label">Rare:</span>
          <span className="category-count">{categoryCounts['rare']}</span>
        </div>
        <div className="category-badge" style={{ backgroundColor: getCategoryColor('uncommon') + '20', borderColor: getCategoryColor('uncommon') }}>
          <span className="category-label">Uncommon:</span>
          <span className="category-count">{categoryCounts['uncommon']}</span>
        </div>
        <div className="category-badge" style={{ backgroundColor: getCategoryColor('common') + '20', borderColor: getCategoryColor('common') }}>
          <span className="category-label">Common:</span>
          <span className="category-count">{categoryCounts['common']}</span>
        </div>
        <div className="category-badge" style={{ backgroundColor: getCategoryColor('very-common') + '20', borderColor: getCategoryColor('very-common') }}>
          <span className="category-label">Very Common:</span>
          <span className="category-count">{categoryCounts['very-common']}</span>
        </div>
      </div>

      {/* Word List */}
      <div className="word-list">
        {processedWords.length === 0 ? (
          <div className="no-words">No words found matching your filters.</div>
        ) : (
          processedWords.map((word, index) => {
            const normalized = word.text.toLowerCase().trim()
            const isExpanded = showAllDefinitions || isWordExpanded(word.text)
            const definition = getWordDefinition(word.text)
            const isLoading = isDefinitionLoading(word.text)
            
            // No auto-fetch - only use local definitions
            // If showAllDefinitions is enabled and definition exists locally, it will be shown via getWordDefinition
            
            return (
              <div 
                key={`${word.text}-${word.dateCreated}-${index}`} 
                className="word-item"
                style={{ borderLeftColor: getCategoryColor(word.category.category) }}
              >
                <div className="word-main">
                  <div className="word-header-left">
                    <span className="word-text">{word.text}</span>
                    <button
                      className="word-definition-toggle"
                      onClick={() => toggleWordExpansion(word.text)}
                      title={isExpanded ? 'Hide definition' : 'Show definition'}
                    >
                      {isExpanded ? '▼' : '▶'} Definition
                    </button>
                    <button
                      className={`favorite-button ${isWordFavorite(word.text) ? 'favorited' : ''}`}
                      onClick={() => handleToggleFavorite(word.text)}
                      title={isWordFavorite(word.text) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {isWordFavorite(word.text) ? '★' : '☆'}
                    </button>
                  </div>
                  <span 
                    className="word-category-badge"
                    style={{ 
                      backgroundColor: getCategoryColor(word.category.category),
                      color: 'white'
                    }}
                  >
                    {word.category.label}
                  </span>
                </div>
              <div className="word-meta">
                <span className="word-language">{word.language || 'Unknown'}</span>
                <span className="word-date">{formatDate(word.dateCreated)}</span>
                {word.bookTitle && word.bookTitle !== 'Unknown Book' && (
                  <span className="word-book" title={`From: ${word.bookTitle}`}>
                    📖 {word.bookTitle.length > 30 ? word.bookTitle.substring(0, 30) + '...' : word.bookTitle}
                  </span>
                )}
                {(sortBy === 'rank' || (word.frequencyRank && word.frequencyRank < 100000)) && (
                  <span 
                    className="word-rank" 
                    title={`Frequency rank: ${word.frequencyRank?.toLocaleString() || 'Unknown'} (lower = more common)`}
                    style={sortBy === 'rank' ? { fontWeight: 'bold', fontSize: '0.9rem' } : {}}
                  >
                    Rank: {word.frequencyRank ? word.frequencyRank.toLocaleString() : 'N/A'}
                  </span>
                )}
              </div>
                {isExpanded && (
                  <div className="word-definition">
                    {isLoading ? (
                      <div className="definition-loading">Loading definition...</div>
                    ) : definition ? (
                      <div className="definition-content">
                        {definition.phonetic && (
                          <div className="definition-phonetic">[{definition.phonetic}]</div>
                        )}
                        {definition.meanings.map((meaning, mIndex) => (
                          <div key={mIndex} className="meaning-group">
                            <div className="part-of-speech">{meaning.partOfSpeech}</div>
                            <ol className="definitions-list">
                              {meaning.definitions.map((def, dIndex) => (
                                <li key={dIndex} className="definition-item">
                                  <div className="definition-text">{def.definition}</div>
                                  {def.example && (
                                    <div className="definition-example">
                                      <em>Example: "{def.example}"</em>
                                    </div>
                                  )}
                                  {def.synonyms && def.synonyms.length > 0 && (
                                    <div className="definition-synonyms">
                                      <strong>Synonyms:</strong> {def.synonyms.slice(0, 5).join(', ')}
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ol>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="definition-not-found">
                        No definition found for this word.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Learning Priority Info */}
      <div className="learning-info">
        <h3>💡 Learning Priority & Vocabulary Building</h3>
        <p>
          <strong>Current Priority Logic:</strong> Words are sorted by <strong>rarity</strong> (less common = higher priority).
          The "Priority (Learn First)" sort shows:
        </p>
        <ul style={{ marginLeft: '20px', marginTop: '10px', marginBottom: '10px' }}>
          <li><strong>Very Rare</strong> words first (Zipf &lt; 2.0) - Specialized/obscure vocabulary</li>
          <li><strong>Rare</strong> words next (Zipf 2.0-3.4) - Advanced vocabulary</li>
          <li><strong>Uncommon</strong> words (Zipf 3.5-4.9) - Less frequent but useful</li>
          <li><strong>Common</strong> words (Zipf 5.0-6.4) - Everyday vocabulary</li>
          <li><strong>Very Common</strong> words last (Zipf ≥ 6.5) - Basic words you likely know</li>
        </ul>
        <p className="priority-hint">
          <strong>💡 To Increase Your Vocabulary:</strong>
        </p>
        <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
          <li><strong>Use "Priority (Learn First)" sort</strong> - This shows rare words first, which will expand your vocabulary the most</li>
          <li><strong>Filter by "Very Rare" or "Rare"</strong> - Focus on these categories for maximum vocabulary growth</li>
          <li><strong>Learn rare words first</strong> - They're less common, so learning them provides more value</li>
          <li><strong>Review common words</strong> - Make sure you understand all meanings and usage patterns</li>
        </ul>
        <p style={{ marginTop: '15px', padding: '12px', background: '#e3f2fd', borderRadius: '6px', borderLeft: '3px solid #1976d2' }}>
          <strong>🎯 Best Strategy:</strong> Start with "Priority (Learn First)" sort and filter to "Very Rare" + "Rare" categories. 
          These words will have the biggest impact on expanding your vocabulary!
        </p>
      </div>
    </div>
  )
}

export default WordList

