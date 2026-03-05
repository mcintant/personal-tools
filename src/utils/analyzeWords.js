// Extract and analyze saved words from Kobo database

export function extractSavedWords(db) {
  const result = {
    words: [],
    totalWords: 0,
    languages: new Set(),
    prioritizedWords: []
  }

  try {
    // Get table names
    const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'")
    const tableNames = tables.length > 0 ? tables[0].values.map(row => row[0]) : []
    
    if (!tableNames.includes('WordList')) {
      console.log('WordList table not found')
      return result
    }

    // Query WordList table with book information
    const wordResult = db.exec(`
      SELECT 
        w.Text, 
        w.VolumeId, 
        w.DictSuffix, 
        w.DateCreated,
        c.Title as BookTitle
      FROM WordList w
      LEFT JOIN content c ON w.VolumeId = c.ContentID
      ORDER BY w.DateCreated DESC
    `)

    if (wordResult.length > 0) {
      const columns = wordResult[0].columns
      const rows = wordResult[0].values
      
      result.words = rows.map(row => {
        const obj = {}
        columns.forEach((col, i) => {
          obj[col] = row[i]
        })
        return {
          text: obj.Text || '',
          volumeId: obj.VolumeId || '',
          language: obj.DictSuffix || '',
          dateCreated: obj.DateCreated || '',
          bookTitle: obj.BookTitle || obj.Title || 'Unknown Book'
        }
      }).filter(word => word.text && word.text.trim().length > 0)

      // Extract unique languages
      result.words.forEach(word => {
        if (word.language) {
          result.languages.add(word.language)
        }
      })

      result.totalWords = result.words.length
      result.languages = Array.from(result.languages)
    }

  } catch (error) {
    console.error('Error extracting words:', error)
  }

  return result
}

