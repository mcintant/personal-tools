// Export highlights to PDF using jsPDF

export async function exportHighlightsToPDF(highlights, bookTitle = 'All Books') {
  try {
    // Dynamic import to avoid issues if jsPDF is not installed
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 3 // Very minimal margin for maximum width usage
    // Use nearly full page width - standard A4 is ~210mm, so this gives us ~204mm of text width
    const maxWidth = pageWidth - (margin * 2)
    let yPosition = margin

    // Helper function to add a new page if needed
    const checkPageBreak = (requiredSpace = 10) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage()
        yPosition = margin
        return true
      }
      return false
    }

    // Title - smaller and more compact
    doc.setFontSize(16) // Reduced from 20
    doc.setFont(undefined, 'bold')
    const titleText = `Highlights from "${bookTitle}"`
    const titleWidth = doc.getTextWidth(titleText)
    doc.text(titleText, (pageWidth - titleWidth) / 2, yPosition)
    yPosition += 8 // Reduced from 15

    // Date and summary on same line
    doc.setFontSize(8) // Reduced from 10
    doc.setFont(undefined, 'normal')
    const dateText = `Exported: ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })} | Total: ${highlights.length} highlights`
    doc.text(dateText, margin, yPosition)
    yPosition += 6 // Reduced from 10

    // Add a line separator
    doc.setLineWidth(0.3) // Thinner line
    doc.line(margin, yPosition, pageWidth - margin, yPosition)
    yPosition += 5 // Reduced from 10

    // Process each highlight
    highlights.forEach((highlight, index) => {
      checkPageBreak(15) // Reduced from 30

      // Header line: number, chapter, date, progress all on one line
      doc.setFontSize(7) // Smaller font
      doc.setFont(undefined, 'normal')
      doc.setTextColor(100, 100, 100) // Gray
      let headerText = `${index + 1}.`
      if (highlight.chapterName) {
        doc.setTextColor(123, 31, 162) // Purple for chapter
        headerText += ` [${highlight.chapterName}]`
        doc.setTextColor(100, 100, 100) // Back to gray
      }
      headerText += ` ${formatDateForPDF(highlight.dateCreated)}`
      if (highlight.chapterProgress > 0) {
        headerText += ` (${Math.round(highlight.chapterProgress * 100)}%)`
      }
      doc.text(headerText, margin, yPosition)
      yPosition += 4 // Reduced spacing

      // Highlight text (italic, wrapped) - use full width
      doc.setFontSize(9) // Reduced from 10
      doc.setFont(undefined, 'italic')
      doc.setTextColor(0, 0, 0) // Black
      // Use full available width - splitTextToSize calculates line breaks
      const lines = doc.splitTextToSize(highlight.text, maxWidth)
      lines.forEach((line, lineIndex) => {
        checkPageBreak(5) // Reduced from 7
        // Position at margin, text will use full width from splitTextToSize
        doc.text(line, margin, yPosition)
        yPosition += 4.5 // Reduced from 6 - tighter line spacing
      })
      yPosition += 2 // Reduced from 3

      // Annotation (if available) - more compact, full width
      if (highlight.annotation) {
        checkPageBreak(8) // Reduced from 15
        doc.setFontSize(8) // Reduced from 9
        doc.setFont(undefined, 'normal')
        doc.setTextColor(255, 167, 38) // Orange color for annotation
        const annotationLines = doc.splitTextToSize(`Note: ${highlight.annotation}`, maxWidth)
        annotationLines.forEach((line) => {
          checkPageBreak(4.5) // Reduced from 6
          doc.text(line, margin, yPosition)
          yPosition += 4.5 // Reduced from 6
        })
        doc.setTextColor(0, 0, 0) // Reset to black
        yPosition += 2 // Reduced from 3
      }

      // Separator line between highlights - thinner and less spacing
      if (index < highlights.length - 1) {
        checkPageBreak(3) // Reduced from 5
        doc.setLineWidth(0.1) // Thinner
        doc.setDrawColor(220, 220, 220) // Lighter gray
        doc.line(margin, yPosition, pageWidth - margin, yPosition)
        yPosition += 4 // Reduced from 8
      }
    })

    // Save the PDF
    const filename = `highlights_${bookTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(filename)
  } catch (error) {
    console.error('Error exporting PDF:', error)
    alert('PDF export requires jsPDF library. Please run: npm install jspdf')
  }
}

function formatDateForPDF(dateString) {
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

