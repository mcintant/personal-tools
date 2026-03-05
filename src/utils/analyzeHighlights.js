// Extract and analyze highlights from Kobo database

export function extractHighlights(db) {
  const result = {
    highlights: [],
    totalHighlights: 0,
    books: new Set()
  }

  try {
    // Get table names
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'")
    const tableNames = tables.length > 0 ? tables[0].values.map(row => row[0]) : []
    
    if (!tableNames.includes('Bookmark')) {
      console.log('Bookmark table not found')
      return result
    }

    // Query Bookmark table with book information
    // Filter for highlights (Type = 'highlight') and exclude hidden bookmarks
    // Note: Hidden is stored as TEXT with value 'false' (string) in this database
    const highlightResult = db.exec(`
      SELECT 
        b.BookmarkID,
        b.VolumeID,
        b.ContentID,
        b.Text,
        b.Annotation,
        b.DateCreated,
        b.ChapterProgress,
        b.Type,
        b.Color,
        b.ContextString,
        b.StartContainerPath,
        c.Title as BookTitle
      FROM Bookmark b
      LEFT JOIN content c ON b.VolumeID = c.ContentID
      WHERE b.Type = 'highlight' AND (b.Hidden = 'false' OR b.Hidden = 0 OR b.Hidden IS NULL)
      ORDER BY b.DateCreated DESC
    `)

    if (highlightResult.length > 0) {
      const columns = highlightResult[0].columns
      const rows = highlightResult[0].values
      
      result.highlights = rows.map(row => {
        const obj = {}
        columns.forEach((col, i) => {
          obj[col] = row[i]
        })
        
        // Extract chapter information from ContextString or StartContainerPath
        let chapterName = null
        if (obj.ContextString) {
          // ContextString might contain chapter info
          chapterName = obj.ContextString.trim()
        } else if (obj.StartContainerPath) {
          // Try to extract chapter from path (e.g., "Chap11.xhtml" or "Chapter 5")
          const path = obj.StartContainerPath
          // Look for patterns like "Chap11", "Chapter 5", "ch01", etc.
          const chapterMatch = path.match(/(?:chap|chapter|ch)[\s\.]?(\d+)/i) || 
                              path.match(/chapter[\s\.]?([a-z0-9]+)/i)
          if (chapterMatch) {
            chapterName = `Chapter ${chapterMatch[1]}`
          } else {
            // Try to extract filename without extension as chapter name
            const filenameMatch = path.match(/([^\/]+)\.(xhtml|html|htm)/i)
            if (filenameMatch && !filenameMatch[1].includes('!')) {
              chapterName = filenameMatch[1].replace(/[-_]/g, ' ')
            }
          }
        }
        
        return {
          id: obj.BookmarkID || '',
          volumeId: obj.VolumeID || '',
          contentId: obj.ContentID || '',
          text: obj.Text || '',
          annotation: obj.Annotation || '',
          dateCreated: obj.DateCreated || '',
          chapterProgress: obj.ChapterProgress || 0,
          chapterName: chapterName,
          type: obj.Type || 'highlight',
          color: obj.Color || 0,
          bookTitle: obj.BookTitle || 'Unknown Book'
        }
      }).filter(highlight => highlight.text && highlight.text.trim().length > 0)

      // Extract unique books
      result.highlights.forEach(highlight => {
        if (highlight.bookTitle && highlight.bookTitle !== 'Unknown Book') {
          result.books.add(highlight.bookTitle)
        }
      })

      result.totalHighlights = result.highlights.length
      result.books = Array.from(result.books).sort()
    }

  } catch (error) {
    console.error('Error extracting highlights:', error)
  }

  return result
}

