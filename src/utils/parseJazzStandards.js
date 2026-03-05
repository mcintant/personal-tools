// Parse jazz standards from PDF and extract frequency information

// Load pdf.js dynamically - try npm package first, fallback to CDN
async function loadPDFJS() {
  // Check if already loaded and configured
  if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions?.workerSrc) {
    return window.pdfjsLib
  }

  try {
    // Try to use the npm package if available
    const pdfjsLib = await import('pdfjs-dist')
    // Set worker source - use https for CDN
    if (!pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions = {}
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
    return pdfjsLib
  } catch (e) {
    // Fallback to CDN if package not installed
    return new Promise((resolve, reject) => {
      // Check again in case it was loaded while we were waiting
      if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions?.workerSrc) {
        resolve(window.pdfjsLib)
        return
      }

      // Check if script already exists
      const existingScript = document.querySelector('script[src*="pdf.min.js"]')
      if (existingScript) {
        // Wait a bit for it to load
        setTimeout(() => {
          const pdfjsLib = window.pdfjsLib || window.pdfjs
          if (pdfjsLib) {
            if (!pdfjsLib.GlobalWorkerOptions) {
              pdfjsLib.GlobalWorkerOptions = {}
            }
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
            resolve(pdfjsLib)
          } else {
            reject(new Error('PDF.js not found after script load'))
          }
        }, 100)
        return
      }

      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      script.async = true
      
      script.onload = () => {
        // Wait a moment for the library to initialize
        setTimeout(() => {
          const pdfjsLib = window.pdfjsLib || window.pdfjs
          if (pdfjsLib) {
            // Ensure GlobalWorkerOptions exists
            if (!pdfjsLib.GlobalWorkerOptions) {
              pdfjsLib.GlobalWorkerOptions = {}
            }
            // Set worker source with https
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
            resolve(pdfjsLib)
          } else {
            reject(new Error('PDF.js not found on window object'))
          }
        }, 50)
      }
      
      script.onerror = () => reject(new Error('Failed to load PDF.js from CDN'))
      document.head.appendChild(script)
    })
  }
}

export async function parseJazzStandardsPDF() {
  try {
    const pdfjsLib = await loadPDFJS()
    
    // Verify worker is configured
    if (!pdfjsLib.GlobalWorkerOptions || !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      throw new Error('PDF.js worker not configured. Please set GlobalWorkerOptions.workerSrc')
    }

    // Load the PDF file (use BASE_URL so it works when deployed under a subpath)
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
    const pdfPath = `${base}/${encodeURIComponent('Jazz standards list.pdf')}`
    const response = await fetch(pdfPath)
    if (!response.ok) {
      throw new Error('Failed to load PDF file')
    }

    const arrayBuffer = await response.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise

    const standards = []
    const frequencyMap = {
      'must-know': 5,        // "- Must Know NOW!" - dash prefix
      'important-bass': 4,    // "- Important Bass Line" - dash prefix with bass line notation
      'everyone-plays': 4,   // Bold - everyone plays!
      'called-often': 3,     // Regular - Have been called often on my gigs
      'obscure': 2           // Italic - relatively obscure but good to know
    }

    // Collect all font names to analyze patterns
    const fontStats = {
      fonts: new Map(),
      boldFonts: new Set(),
      italicFonts: new Set(),
      regularFonts: new Set()
    }

    // First pass: collect font information and get font descriptors
    // Font names like "g_d1_f2" don't tell us about formatting, so we need to check font descriptors
    const fontDescriptors = new Map() // fontName -> font descriptor
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      
      // Get font objects to access descriptors
      const opList = await page.getOperatorList()
      
      textContent.items.forEach(async (item) => {
        if (item.fontName && !fontDescriptors.has(item.fontName)) {
          try {
            // Try to get font descriptor from the common fonts dictionary
            const commonFonts = await page.commonObjs
            // Access font through the text content's font loader
            const fontObj = textContent.styles[item.fontName]
            if (fontObj) {
              fontDescriptors.set(item.fontName, {
                name: item.fontName,
                fontObj: fontObj
              })
            }
          } catch (e) {
            // If we can't get descriptor, just store the name
            fontDescriptors.set(item.fontName, {
              name: item.fontName,
              fontObj: null
            })
          }
        }
      })
    }
    
    // Alternative: Use a heuristic approach - collect all fonts and their usage
    // Then try to identify patterns (e.g., if font "g_d1_f1" is used for dash items, it might be bold)
    const fontUsage = new Map() // fontName -> { dashCount, regularCount, totalCount }
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      
      textContent.items.forEach((item) => {
        if (item.fontName) {
          const fontName = item.fontName
          const text = item.str?.trim() || ''
          const hasDash = /^[-–—•]\s*/.test(text)
          
          if (!fontUsage.has(fontName)) {
            fontUsage.set(fontName, { dashCount: 0, regularCount: 0, totalCount: 0 })
          }
          
          const usage = fontUsage.get(fontName)
          usage.totalCount++
          if (hasDash) {
            usage.dashCount++
          } else {
            usage.regularCount++
          }
        }
      })
    }
    
    // Heuristic: Fonts used primarily for dash items might be bold
    // Fonts used for regular items are likely regular or italic
    // We'll identify the most common font as "regular" and others as potentially bold/italic
    const fontArray = Array.from(fontUsage.entries()).sort((a, b) => b[1].totalCount - a[1].totalCount)
    const mostCommonFont = fontArray[0]?.[0]
    
    console.log('Font usage analysis:', fontArray.map(([name, usage]) => ({
      name,
      total: usage.totalCount,
      dash: usage.dashCount,
      regular: usage.regularCount,
      dashRatio: usage.totalCount > 0 ? usage.dashCount / usage.totalCount : 0
    })))
    
    // Build font stats based on font name patterns
    // Pattern identified: f1 = bold, f2 = regular, f3 (or similar) might be italic
    fontArray.forEach(([fontName, usage]) => {
      const fontNameLower = fontName.toLowerCase()
      let isBold = false
      let isItalic = false
      
      // Check font name pattern: f1 = bold, f2 = regular, f4 = italic
      // Pattern: fonts like "g_d5_f1" where f1 indicates bold, f2 indicates regular, f4 indicates italic
      // Match f1, f2, f4 at end of string or preceded by underscore
      if (fontNameLower.endsWith('_f1') || fontNameLower.endsWith('f1') || 
          fontNameLower.includes('_f1_') || fontNameLower.match(/[^a-z0-9]f1[^a-z0-9]/)) {
        // f1 = bold
        isBold = true
        console.log(`Pattern match: ${fontName} -> BOLD (f1 pattern)`)
      } else if (fontNameLower.endsWith('_f4') || fontNameLower.endsWith('f4') || 
                 fontNameLower.includes('_f4_') || fontNameLower.match(/[^a-z0-9]f4[^a-z0-9]/)) {
        // f4 = italic
        isItalic = true
        console.log(`Pattern match: ${fontName} -> ITALIC (f4 pattern)`)
      } else if (fontNameLower.endsWith('_f2') || fontNameLower.endsWith('f2') || 
                 fontNameLower.includes('_f2_') || fontNameLower.match(/[^a-z0-9]f2[^a-z0-9]/)) {
        // f2 = regular (default, no special formatting)
        isBold = false
        isItalic = false
      } else if (fontNameLower.endsWith('_f3') || fontNameLower.endsWith('f3') || 
                 fontNameLower.includes('_f3_') || fontNameLower.match(/[^a-z0-9]f3[^a-z0-9]/) ||
                 fontNameLower.endsWith('_fi') || fontNameLower.endsWith('fi') ||
                 fontNameLower.includes('_fi_') || fontNameLower.match(/[^a-z0-9]fi[^a-z0-9]/)) {
        // f3 or fi might also be italic (fallback)
        isItalic = true
        console.log(`Pattern match: ${fontName} -> ITALIC (f3/fi pattern)`)
      }
      
      // Fallback: Check for explicit indicators in font name
      if (!isBold && !isItalic) {
        if (fontNameLower.includes('bold') || fontNameLower.includes('black') || 
            fontNameLower.includes('heavy') || fontNameLower.includes('semibold')) {
          isBold = true
        } else if (fontNameLower.includes('italic') || fontNameLower.includes('oblique') ||
                   fontNameLower.match(/[a-z]+it$/i) || fontNameLower.match(/[a-z]+i$/i)) {
          isItalic = true
        }
      }
      
      fontStats.fonts.set(fontName, {
        name: fontName,
        isBold: isBold,
        isItalic: isItalic
      })
    })
    
    console.log('Font classification:', Array.from(fontStats.fonts.entries()).map(([name, info]) => ({
      name,
      isBold: info.isBold,
      isItalic: info.isItalic
    })))

    // Process each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      
      // Process text items to detect formatting and categorize by frequency
      textContent.items.forEach((item, index) => {
        const text = item.str.trim()
        if (!text) return

        // Check if text starts with dash (various dash types)
        const hasDash = /^[-–—•]\s*/.test(text)
        const cleanText = text.replace(/^[-–—•]\s*/, '').trim()

        // Determine formatting from font name ONLY
        // Transform matrix scale is font size, not bold indicator!
        let isBold = false
        let isItalic = false
        
        if (item.fontName) {
          const fontInfo = fontStats.fonts.get(item.fontName)
          if (fontInfo) {
            isBold = fontInfo.isBold
            isItalic = fontInfo.isItalic
          } else {
            // Fallback: check font name directly
            const fontNameLower = item.fontName.toLowerCase()
            // Only detect bold if font name explicitly contains bold indicators
            isBold = fontNameLower.includes('bold') || 
                     fontNameLower.includes('black') ||
                     fontNameLower.includes('heavy') ||
                     fontNameLower.includes('semibold') ||
                     fontNameLower.includes('demibold')
            // Only detect italic if font name explicitly contains italic indicators
            isItalic = fontNameLower.includes('italic') || 
                       fontNameLower.includes('oblique') ||
                       fontNameLower.match(/[a-z]+it$/i) || // Ends with "it" (like "ArialIt")
                       fontNameLower.match(/[a-z]+i$/i)    // Ends with single "i" (like "TimesI")
          }
        }
        
        // Check transform matrix for italic (skew)
        // Transform scale is font size, not bold indicator!
        if (item.transform && !isItalic) {
          const skewX = item.transform[1] || 0
          // Italic fonts have skew in the transform (non-zero b value)
          // Use a reasonable threshold to detect italic skew
          if (Math.abs(skewX) > 0.3) {
            isItalic = true
          }
        }
        
        // Try to access font descriptor properties if available
        // Some PDFs store font weight/style in the font object
        if (item.fontName && !isBold && !isItalic) {
          try {
            // Check if we can get font properties from the text content styles
            const fontStyle = textContent.styles?.[item.fontName]
            if (fontStyle) {
            // Font descriptors might have weight/style info, but PDF.js doesn't always expose it
            // We'll rely on the heuristic analysis from the first pass
          }
          } catch (e) {
            // Ignore errors accessing font properties
          }
        }
        
        // Debug: log specific examples and font info
        const textLower = cleanText.toLowerCase()
        if (textLower.includes('boplicity') || textLower.includes('best is yet') || 
            textLower.includes('wives and lovers') || index < 15) {
          const fontInfo = item.fontName ? fontStats.fonts.get(item.fontName) : null
          const category = hasDash ? 'dash' : (isItalic ? 'italic' : (isBold ? 'bold' : 'regular'))
          console.log(`[${category.toUpperCase()}] "${cleanText.substring(0, 50)}" | Font: ${item.fontName} | Bold: ${isBold} | Italic: ${isItalic} | Dash: ${hasDash}`, {
            fontInfo: fontInfo,
            transform: item.transform
          })
        }

        // Determine frequency level based on the PDF structure:
        // - Must Know NOW! - dash prefix
        // - Important Bass Line - dash prefix (check for "bass" in text)
        // Bold - everyone plays!
        // Regular - Have been called often on my gigs (default, not bold, not italic, no dash)
        // Italic - relatively obscure but good to know
        let frequency = 'called-often'  // Default: regular text
        let frequencyScore = frequencyMap['called-often']

        // Priority order: check dash first, then formatting
        // IMPORTANT: Default is 'called-often' (regular text) - only change if we detect special formatting
        if (hasDash) {
          // Check if it's "Important Bass Line" or "Must Know NOW!"
          const textLower = cleanText.toLowerCase()
          if (textLower.includes('bass') || textLower.includes('important')) {
            frequency = 'important-bass'
            frequencyScore = frequencyMap['important-bass']
          } else {
            // Must Know NOW! - dash prefix
            frequency = 'must-know'
            frequencyScore = frequencyMap['must-know']
          }
        } else if (isBold) {
          // Bold - everyone plays!
          // Bold takes precedence over italic
          frequency = 'everyone-plays'
          frequencyScore = frequencyMap['everyone-plays']
        } else if (isItalic) {
          // Italic - relatively obscure but good to know
          // Only if it's italic and NOT bold (already checked above)
          frequency = 'obscure'
          frequencyScore = frequencyMap.obscure
        }
        // else: Regular text - called-often (already set as default)
        // This should be the majority of items!
        // This should catch items like "Boplicity" that have no special formatting

        // Only add if it looks like a song title (not empty, reasonable length)
        if (cleanText && cleanText.length > 1 && cleanText.length < 100) {
          // Strip trailing dash from song name
          let finalName = cleanText.replace(/[-–—•]\s*$/, '').trim()
          
          // Avoid duplicates
          const existing = standards.find(s => s.name.toLowerCase() === finalName.toLowerCase())
          if (!existing) {
            standards.push({
              name: finalName,
              originalText: text,
              frequency: frequency,
              frequencyScore: frequencyScore,
              hasDash: hasDash,
              isBold: isBold,
              isItalic: isItalic
            })
          } else {
            // Update if this occurrence has higher frequency
            if (frequencyScore > existing.frequencyScore) {
              existing.frequency = frequency
              existing.frequencyScore = frequencyScore
              existing.hasDash = hasDash
              existing.isBold = isBold
              existing.isItalic = isItalic
              existing.originalText = text
              // Update name if it's cleaner (no trailing dash)
              if (finalName !== existing.name && !finalName.endsWith('-')) {
                existing.name = finalName
              }
            }
          }
        }
      })
    }

    // Sort by frequency score (highest first) then alphabetically
    standards.sort((a, b) => {
      if (b.frequencyScore !== a.frequencyScore) {
        return b.frequencyScore - a.frequencyScore
      }
      return a.name.localeCompare(b.name)
    })

    // Log frequency distribution for debugging
    const freqDist = {
      'must-know': standards.filter(s => s.frequency === 'must-know').length,
      'important-bass': standards.filter(s => s.frequency === 'important-bass').length,
      'everyone-plays': standards.filter(s => s.frequency === 'everyone-plays').length,
      'called-often': standards.filter(s => s.frequency === 'called-often').length,
      'obscure': standards.filter(s => s.frequency === 'obscure').length
    }
    console.log('Frequency distribution:', freqDist)
    console.log('Total standards:', standards.length)
    console.log('Sample regular text:', standards.filter(s => s.frequency === 'called-often').slice(0, 5).map(s => s.name))
    console.log('Sample italic text:', standards.filter(s => s.frequency === 'obscure').slice(0, 5).map(s => s.name))

    return {
      standards: standards,
      total: standards.length,
      byFrequency: freqDist
    }
  } catch (error) {
    console.error('Error parsing PDF:', error)
    throw error
  }
}

