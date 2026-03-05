import React, { useState, useEffect, useMemo } from 'react'
import { loadWordsCSV, getDefinition } from '../utils/loadWordsCSV'
import './StoryViewer.css'

function StoryViewer() {
  const [storyText, setStoryText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [vocabWords, setVocabWords] = useState(new Set())
  const [definitions, setDefinitions] = useState({})
  const [hoveredWord, setHoveredWord] = useState(null)
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 })

  // Load story and vocabulary data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load story (use BASE_URL so it works when deployed under a subpath, e.g. /personal-tools/)
        const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
        const storyResponse = await fetch(`${base}/story.txt`)
        if (!storyResponse.ok) {
          throw new Error('Failed to load story.txt')
        }
        const text = await storyResponse.text()
        setStoryText(text)

        // Load vocabulary words from CSV
        const csvData = await loadWordsCSV()
        if (csvData && csvData.words) {
          // Create a set of all vocabulary words (normalized)
          const vocabSet = new Set(Object.keys(csvData.words))
          setVocabWords(vocabSet)
          setDefinitions(csvData.definitions || {})
        }

        setLoading(false)
      } catch (err) {
        setError(err.message)
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Parse story and identify vocabulary words
  const parsedStory = useMemo(() => {
    if (!storyText || vocabWords.size === 0) return []

    // Split story into words while preserving punctuation and whitespace
    const parts = []
    // Match words, whitespace, and punctuation separately
    const tokens = storyText.match(/\S+|\s+/g) || []
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      
      // Skip whitespace-only tokens
      if (/^\s+$/.test(token)) {
        parts.push({ type: 'text', content: token })
        continue
      }

      // Extract word and trailing punctuation
      const match = token.match(/^([\w'-]+)([.,;:!?'"()—–-]*)$/)
      if (!match) {
        // If it doesn't match word pattern, treat as regular text
        parts.push({ type: 'text', content: token })
        continue
      }

      const [, wordPart, punctuation] = match
      const cleanWord = wordPart.toLowerCase()
      
      if (vocabWords.has(cleanWord)) {
        parts.push({ 
          type: 'vocab', 
          content: wordPart,
          punctuation: punctuation,
          cleanWord: cleanWord
        })
      } else {
        parts.push({ type: 'text', content: token })
      }
    }

    return parts
  }, [storyText, vocabWords])

  const handleWordHover = (e, cleanWord) => {
    const definition = definitions[cleanWord]
    if (definition) {
      setHoveredWord({ word: cleanWord, definition })
      // Position tooltip near cursor, but keep it on screen
      const x = Math.min(e.clientX + 10, window.innerWidth - 420)
      const y = Math.min(e.clientY + 10, window.innerHeight - 200)
      setHoverPosition({ x, y })
    }
  }

  const handleWordLeave = () => {
    setHoveredWord(null)
  }

  if (loading) {
    return (
      <div className="story-viewer-container">
        <div className="loading">Loading story...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="story-viewer-container">
        <div className="error">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="story-viewer-container">
      <div className="story-header">
        <h2>📖 Interactive Story</h2>
        <p>Hover over highlighted words to see their definitions</p>
      </div>

      <div className="story-content">
        {parsedStory.map((part, index) => {
          if (part.type === 'vocab') {
            return (
              <span key={index}>
                <span
                  className="vocab-word"
                  onMouseEnter={(e) => handleWordHover(e, part.cleanWord)}
                  onMouseLeave={handleWordLeave}
                >
                  {part.content}
                </span>
                {part.punctuation}
              </span>
            )
          } else {
            return <span key={index}>{part.content}</span>
          }
        })}
      </div>

      {hoveredWord && (
        <div
          className="definition-tooltip"
          style={{
            left: `${hoverPosition.x + 10}px`,
            top: `${hoverPosition.y + 10}px`
          }}
        >
          <div className="tooltip-word">{hoveredWord.word}</div>
          <div className="tooltip-definition">
            {hoveredWord.definition.meanings && hoveredWord.definition.meanings.length > 0 ? (
              hoveredWord.definition.meanings.map((meaning, idx) => (
                <div key={idx} className="meaning">
                  {meaning.partOfSpeech && (
                    <span className="part-of-speech">{meaning.partOfSpeech}</span>
                  )}
                  <ul className="definitions-list">
                    {meaning.definitions.map((def, defIdx) => (
                      <li key={defIdx}>{def.definition}</li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <div>No definition available</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default StoryViewer

