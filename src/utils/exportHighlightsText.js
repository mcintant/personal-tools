// Export highlights to text file

export function exportHighlightsToText(highlights, bookTitle = 'All Books') {
  try {
    let textContent = `Highlights from "${bookTitle}"\n`
    textContent += `${'='.repeat(60)}\n\n`
    textContent += `Exported: ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}\n`
    textContent += `Total Highlights: ${highlights.length}\n\n`
    textContent += `${'='.repeat(60)}\n\n`

    // Process each highlight
    highlights.forEach((highlight, index) => {
      textContent += `\n${index + 1}. `
      
      // Header: chapter, date, progress
      const headerParts = []
      if (highlight.chapterName) {
        headerParts.push(`[${highlight.chapterName}]`)
      }
      headerParts.push(formatDateForText(highlight.dateCreated))
      if (highlight.chapterProgress > 0) {
        headerParts.push(`${Math.round(highlight.chapterProgress * 100)}%`)
      }
      if (headerParts.length > 0) {
        textContent += headerParts.join(' | ') + '\n'
      }
      
      // Highlight text
      textContent += `\n"${highlight.text}"\n`
      
      // Annotation (if available)
      if (highlight.annotation) {
        textContent += `\nNote: ${highlight.annotation}\n`
      }
      
      // Separator between highlights
      if (index < highlights.length - 1) {
        textContent += `\n${'-'.repeat(60)}\n`
      }
    })

    // Create blob and download
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const filename = `highlights_${bookTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.txt`
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting text:', error)
    alert('Error exporting highlights to text file')
  }
}

function formatDateForText(dateString) {
  if (!dateString) return 'Unknown'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric'
    })
  } catch {
    return dateString
  }
}


