import React, { useState, useMemo, useEffect } from 'react'
import { prioritizeWords, categorizeWord } from '../utils/wordFrequency'
import { loadFrequencyDatabase } from '../utils/loadFrequencyData'
import { loadDefinitionsDatabase, getLocalDefinition } from '../utils/loadDefinitions'
import { getFavorites, toggleFavorite, isFavorite } from '../utils/favoritesDB'
import './WordGame.css'

function WordGame({ words, languages }) {
  const [gameStarted, setGameStarted] = useState(false)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [selectedLanguage, setSelectedLanguage] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [gameWords, setGameWords] = useState([])
  const [currentWord, setCurrentWord] = useState(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [frequencyData, setFrequencyData] = useState(null)
  const [localDefinitions, setLocalDefinitions] = useState(null)
  const [favorites, setFavorites] = useState(new Set())

  // Load frequency database and definitions on mount
  useEffect(() => {
    Promise.all([
      loadFrequencyDatabase(),
      loadDefinitionsDatabase(),
      getFavorites()
    ]).then(([rankData, definitionsData, favs]) => {
      setFrequencyData(rankData)
      setLocalDefinitions(definitionsData)
      setFavorites(new Set(favs))
    }).catch(err => {
      console.error('Failed to load databases:', err)
    })
  }, [])

  // Filter and prioritize words for the game
  const availableWords = useMemo(() => {
    if (!words || !words.length) return []
    
    let filtered = words
    
    // Filter by language
    if (selectedLanguage !== 'all') {
      filtered = filtered.filter(word => word.DictSuffix === selectedLanguage)
    }
    
    // Filter by category if frequency data is available
    if (frequencyData && selectedCategory !== 'all') {
      filtered = filtered.filter(word => {
        const categoryData = categorizeWord(word.Text, frequencyData)
        const categoryLabel = typeof categoryData === 'string' ? categoryData : categoryData.label
        return categoryLabel === selectedCategory
      })
    }
    
    // Prioritize rare words for learning
    if (frequencyData) {
      return prioritizeWords(filtered, frequencyData)
    }
    
    return filtered
  }, [words, selectedLanguage, selectedCategory, frequencyData])

  const handleStartGame = () => {
    if (availableWords.length === 0) {
      alert('No words available with the selected filters. Please adjust your filters.')
      return
    }
    
    // Select random words for the game (up to 20)
    const shuffled = [...availableWords].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(20, shuffled.length))
    setGameWords(selected)
    setCurrentWordIndex(0)
    setCurrentWord(selected[0])
    setScore(0)
    setShowAnswer(false)
    setGameStarted(true)
  }

  const handleNextWord = () => {
    if (currentWordIndex < gameWords.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1)
      setCurrentWord(gameWords[currentWordIndex + 1])
      setShowAnswer(false)
    } else {
      // Game finished
      setGameStarted(false)
      alert(`Game finished! Your score: ${score}/${gameWords.length}`)
    }
  }

  const handleToggleFavorite = async (word) => {
    try {
      await toggleFavorite(word)
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
    // Refresh favorites
    const favs = await getFavorites()
    setFavorites(new Set(favs))
  }

  const progress = gameWords.length > 0 ? ((currentWordIndex + 1) / gameWords.length) * 100 : 0

  if (!gameStarted) {
    return (
      <div className="word-game-container">
        <div className="game-header">
          <h2>🎮 Word Learning Game</h2>
          <p>Test your knowledge of saved words with interactive quizzes</p>
        </div>

        <div className="game-setup">
          <div className="setup-section">
            <label>Language Filter:</label>
            <select
              className="setup-select"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              <option value="all">All Languages</option>
              {languages && languages.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>

          <div className="setup-section">
            <label>Word Category:</label>
            <select
              className="setup-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="Very Rare">Very Rare</option>
              <option value="Rare">Rare</option>
              <option value="Uncommon">Uncommon</option>
              <option value="Common">Common</option>
              <option value="Very Common">Very Common</option>
            </select>
            <p className="setup-hint">
              {selectedCategory === 'all' 
                ? 'All words will be included'
                : `Only ${selectedCategory.toLowerCase()} words will be shown`
              }
            </p>
          </div>

          <div className="setup-info">
            <p><strong>Available words:</strong> {availableWords.length}</p>
            {availableWords.length === 0 && (
              <p className="setup-warning">No words match your filters. Please adjust your selection.</p>
            )}
          </div>

          <button
            className="start-game-button"
            onClick={handleStartGame}
            disabled={availableWords.length === 0}
          >
            {availableWords.length === 0 ? 'No Words Available' : 'Start Game 🎮'}
          </button>
        </div>
      </div>
    )
  }

  if (!currentWord) {
    return (
      <div className="word-game-container">
        <div className="loading">Loading word...</div>
      </div>
    )
  }

  const definition = localDefinitions ? getLocalDefinition(currentWord.Text, localDefinitions) : null
  const categoryData = frequencyData ? categorizeWord(currentWord.Text, frequencyData) : { category: 'unknown', label: 'Unknown', priority: 0 }
  const category = typeof categoryData === 'string' ? categoryData : categoryData.label
  const categoryKey = typeof categoryData === 'string' ? categoryData : categoryData.category
  const isFav = isFavorite(currentWord.Text, favorites)

  return (
    <div className="word-game-container">
      <div className="game-header">
        <h2>🎮 Word Learning Game</h2>
        
        <div className="game-stats">
          <div className="stat-item">
            <span className="stat-label">Score</span>
            <span className="stat-value">{score}/{gameWords.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Progress</span>
            <span className="stat-value">{currentWordIndex + 1}/{gameWords.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Category</span>
            <span className="stat-value">{category}</span>
          </div>
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="game-card">
        <div className="word-display">
          <div className="word-text-large">{currentWord.Text}</div>
          <div>
            <span className={`word-category-badge-large category-${categoryKey.toLowerCase().replace(/\s+/g, '-')}`}>
              {category}
            </span>
            <button
              className={`favorite-button-game ${isFav ? 'favorited' : ''}`}
              onClick={() => handleToggleFavorite(currentWord.Text)}
              title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFav ? '⭐' : '☆'}
            </button>
          </div>
        </div>

        <div className="question-section">
          <h3>Do you know what this word means?</h3>
          
          {!showAnswer ? (
            <div className="options-grid">
              <button
                className="option-button"
                onClick={() => {
                  setShowAnswer(true)
                  setScore(score + 1)
                }}
              >
                ✅ Yes, I know it
              </button>
              <button
                className="option-button"
                onClick={() => setShowAnswer(true)}
              >
                ❌ No, show me the definition
              </button>
            </div>
          ) : (
            <div className="answer-section">
              {definition ? (
                <div className="definition-display">
                  <h4>Definition:</h4>
                  <p>{definition}</p>
                </div>
              ) : (
                <div className="definition-display">
                  <p>No definition available for this word.</p>
                  <p className="hint-text">Try looking it up in a dictionary!</p>
                </div>
              )}
              
              <button
                className="next-button"
                onClick={handleNextWord}
              >
                {currentWordIndex < gameWords.length - 1 ? 'Next Word →' : 'Finish Game 🎉'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default WordGame
