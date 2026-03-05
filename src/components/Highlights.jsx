import React, { useState, useMemo } from 'react'
import { exportHighlightsToPDF } from '../utils/exportHighlightsPDF'
import { exportHighlightsToText } from '../utils/exportHighlightsText'
import './Highlights.css'

function Highlights({ highlights, books }) {
  const [selectedBook, setSelectedBook] = useState('all')
  const [sortBy, setSortBy] = useState('date') // 'date', 'book', 'alphabetical'

  // Filter and sort highlights
  const processedHighlights = useMemo(() => {
    let filtered = highlights

    // Filter by book
    if (selectedBook !== 'all') {
      filtered = filtered.filter(highlight => highlight.bookTitle === selectedBook)
    }

    // Sort
    if (sortBy === 'book') {
      filtered.sort((a, b) => {
        const bookCompare = a.bookTitle.localeCompare(b.bookTitle)
        if (bookCompare !== 0) return bookCompare
        return new Date(b.dateCreated) - new Date(a.dateCreated)
      })
    } else if (sortBy === 'alphabetical') {
      filtered.sort((a, b) => a.text.localeCompare(b.text))
    } else {
      // Sort by date (newest first)
      filtered.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))
    }

    return filtered
  }, [highlights, selectedBook, sortBy])

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const formatChapterProgress = (progress) => {
    if (progress === null || progress === undefined) return ''
    return `${Math.round(progress * 100)}%`
  }

  const handleExportPDF = () => {
    const bookTitle = selectedBook !== 'all' ? selectedBook : 'All Books'
    exportHighlightsToPDF(processedHighlights, bookTitle)
  }

  const handleExportText = () => {
    const bookTitle = selectedBook !== 'all' ? selectedBook : 'All Books'
    exportHighlightsToText(processedHighlights, bookTitle)
  }

  return (
    <div className="highlights-container">
      <div className="highlights-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ margin: 0 }}>📖 Highlights</h2>
          {processedHighlights.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                onClick={handleExportText}
                className="export-text-button"
                title="Export highlights to text file"
              >
                📝 Export as Text
              </button>
              <button 
                onClick={handleExportPDF}
                className="export-pdf-button"
                title="Export highlights to PDF"
              >
                📄 Export to PDF
              </button>
            </div>
          )}
        </div>
        <p className="highlight-count">
          {processedHighlights.length} {selectedBook !== 'all' ? 'filtered' : ''} highlight{processedHighlights.length !== 1 ? 's' : ''}
          {selectedBook !== 'all' && ` from "${selectedBook}"`}
        </p>
      </div>

      {/* Filters */}
      <div className="highlights-filters">
        <div className="filter-group">
          <label>Book:</label>
          <select 
            value={selectedBook || 'all'} 
            onChange={(e) => setSelectedBook(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Books</option>
            {books.map(book => (
              <option key={book} value={book}>{book}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Sort by:</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="date">Date (Newest First)</option>
            <option value="book">Book</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Highlights List */}
      <div className="highlights-list">
        {processedHighlights.length === 0 ? (
          <div className="no-highlights">No highlights found matching your filters.</div>
        ) : (
          processedHighlights.map((highlight, index) => (
            <div 
              key={`${highlight.id}-${index}`} 
              className="highlight-item"
            >
              <div className="highlight-text">
                {highlight.text}
              </div>
              {highlight.annotation && (
                <div className="highlight-annotation">
                  <strong>Note:</strong> {highlight.annotation}
                </div>
              )}
              <div className="highlight-meta">
                <span className="highlight-book" title={`From: ${highlight.bookTitle}`}>
                  📖 {highlight.bookTitle}
                </span>
                {highlight.chapterName && (
                  <span className="highlight-chapter" title="Chapter">
                    📑 {highlight.chapterName}
                  </span>
                )}
                <span className="highlight-date">{formatDate(highlight.dateCreated)}</span>
                {highlight.chapterProgress > 0 && (
                  <span className="highlight-progress" title="Chapter progress">
                    {formatChapterProgress(highlight.chapterProgress)}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Highlights

