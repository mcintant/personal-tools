import React, { useState, useEffect } from 'react'
import { fetchPriceDirectory } from '../utils/sheetsPriceDirectory'
import { getItemEmoji, getStoreHeaderDisplay } from '../data/priceDirectoryMetadata'
import { getCategoryForItem, categoryList } from '../data/itemCategories'
import RecipeCost from './RecipeCost'
import RecipeLibrary from './RecipeLibrary'
import './PriceDirectory.css'

const CACHE_KEY = 'kobo_price_directory'

const PRICE_DIRECTORY_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/151wU8TH9JgnZNZNPpPBnfWDAEqVDsq1SatWg986TpT4/edit?gid=0#gid=0'

/** Frequency (1–5) → label for filter. 5 = most essential. */
const FREQUENCY_LABELS = [
  { value: 5, label: 'Essentials' },
  { value: 4, label: 'Common' },
  { value: 3, label: 'Occasional' },
  { value: 2, label: 'Rare' },
  { value: 1, label: 'Very rare' },
]

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && Array.isArray(parsed.headers) && Array.isArray(parsed.rows)) {
      return { headers: parsed.headers, rows: parsed.rows }
    }
  } catch (_) {}
  return null
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ headers: data.headers, rows: data.rows }))
  } catch (_) {}
}

function parsePrice(cell) {
  if (cell == null || typeof cell !== 'string') return NaN
  const s = cell.trim().replace(/[$,\s]/g, '')
  if (!s) return NaN
  const n = parseFloat(s)
  return Number.isFinite(n) && n >= 0 ? n : NaN
}

function getRowPriceStats(row, skipColIndices) {
  const skip = Array.isArray(skipColIndices) ? skipColIndices : [skipColIndices].filter((i) => i >= 0)
  const priceByColIndex = {}
  const values = []
  for (let j = 1; j < row.length; j++) {
    if (skip.includes(j)) continue
    const n = parsePrice(row[j])
    if (!Number.isNaN(n)) {
      priceByColIndex[j] = n
      values.push(n)
    }
  }
  if (values.length === 0) return { priceByColIndex, min: NaN, max: NaN }
  return {
    priceByColIndex,
    min: Math.min(...values),
    max: Math.max(...values),
  }
}

function priceCellBackground(price, min, max, isBest) {
  if (isBest) return { backgroundColor: 'rgb(200, 230, 201)' }
  if (Number.isNaN(min) || Number.isNaN(max) || max <= min) return {}
  const r = (price - min) / (max - min)
  const green = { r: 200, g: 230, b: 201 }
  const yellow = { r: 255, g: 249, b: 196 }
  const red = { r: 255, g: 205, b: 210 }
  let rgb
  if (r <= 0.5) {
    const t = r / 0.5
    rgb = {
      r: Math.round(green.r + (yellow.r - green.r) * t),
      g: Math.round(green.g + (yellow.g - green.g) * t),
      b: Math.round(green.b + (yellow.b - green.b) * t),
    }
  } else {
    const t = (r - 0.5) / 0.5
    rgb = {
      r: Math.round(yellow.r + (red.r - yellow.r) * t),
      g: Math.round(yellow.g + (red.g - yellow.g) * t),
      b: Math.round(yellow.b + (red.b - yellow.b) * t),
    }
  }
  return { backgroundColor: `rgb(${rgb.r},${rgb.g},${rgb.b})` }
}

function formatPrice(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function formatSavingsPct(n) {
  if (n == null || Number.isNaN(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${Number(n).toFixed(2)}%`
}

function formatDiffFromAvg(price, avgPrice) {
  if (price == null || avgPrice == null || Number.isNaN(price) || Number.isNaN(avgPrice) || avgPrice <= 0) return null
  const pct = ((price - avgPrice) / avgPrice) * 100
  const sign = pct > 0 ? '+' : ''
  return `(${sign}${Number(pct).toFixed(2)}%)`
}

function PriceDirectory() {
  const [data, setData] = useState(() => readCache())
  const [loading, setLoading] = useState(!readCache())
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    let cancelled = false
    const cached = readCache()
    if (cached) {
      setData(cached)
      setLoading(false)
      setRefreshing(true)
    }
    fetchPriceDirectory()
      .then((result) => {
        if (!cancelled) {
          setData(result)
          writeCache(result)
          setLoading(false)
          setRefreshing(false)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRefreshing(false)
          if (!readCache()) {
            setError(err.message || 'Failed to load price directory')
            setLoading(false)
          }
        }
      })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="price-directory">
        <p className="price-directory-message">Loading price directory...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="price-directory">
        <p className="price-directory-error">{error}</p>
        <p className="price-directory-hint">
          Set <code>VITE_SHEETS_APP_SCRIPT_URL</code> in <code>.env</code> to your Apps Script web app URL. See <code>.env.example</code> and <code>docs/apps-script-price-directory.js</code>.
        </p>
      </div>
    )
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="price-directory">
        <p className="price-directory-message">No rows in price directory.</p>
      </div>
    )
  }

  const { headers, rows } = data
  const frequencyColIndex = headers.findIndex(
    (h) => String(h).trim().toLowerCase() === 'frequency (1 to 5)'
  )
  const typeColIndex = headers.findIndex(
    (h) => String(h).trim().toLowerCase() === 'type'
  )
  const skipColIndices = [frequencyColIndex, typeColIndex].filter((i) => i >= 0)
  const storeIndices = headers
    .map((_, i) => i)
    .filter((i) => i >= 1 && !skipColIndices.includes(i))

  // Per-store average savings: % vs row *average* price. Negative = cheap (good), positive = expensive (bad).
  // Formula: (storePrice - rowAvg)/rowAvg * 100 so below-average stores show negative, above-average show positive.
  const averageSavingsByCol = {}
  const itemCountByCol = {}
  storeIndices.forEach((j) => {
    let sumPct = 0
    let count = 0
    rows.forEach((row) => {
      const price = parsePrice(row[j])
      if (Number.isNaN(price)) return
      const { priceByColIndex } = getRowPriceStats(row, skipColIndices)
      let rowSum = 0
      let rowCount = 0
      storeIndices.forEach((k) => {
        const p = priceByColIndex[k]
        if (p !== undefined) {
          rowSum += p
          rowCount += 1
        }
      })
      const rowAvg = rowCount > 0 ? rowSum / rowCount : NaN
      if (Number.isNaN(rowAvg) || rowAvg <= 0) return
      sumPct += ((price - rowAvg) / rowAvg) * 100
      count += 1
    })
    itemCountByCol[j] = count
    averageSavingsByCol[j] = count > 0 ? sumPct / count : NaN
  })
  const orderedStoreIndices = [...storeIndices].sort(
    (a, b) => (averageSavingsByCol[a] ?? Infinity) - (averageSavingsByCol[b] ?? Infinity)
  )

  // Dedupe by store name so the ranking list shows each store once (sheet may have duplicate column headers)
  const seenStoreNames = new Set()
  const orderedStoreIndicesRanking = orderedStoreIndices.filter((colIndex) => {
    const name = (headers[colIndex] ?? '').trim().toLowerCase()
    if (seenStoreNames.has(name)) return false
    seenStoreNames.add(name)
    return true
  })

  const [rankBySavings, setRankBySavings] = useState(false)
  const [viewMode, setViewMode] = useState('directory')
  const [selectedLibraryRecipe, setSelectedLibraryRecipe] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState(null)
  const [frequencyFilter, setFrequencyFilter] = useState(null) // null = all, or 1..5
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const storesBeforeType = storeIndices.filter((j) => j < typeColIndex)
  const storesAfterType = storeIndices.filter((j) => j > typeColIndex)
  const orderedStoresBeforeType = orderedStoreIndices.filter((j) => j < typeColIndex)
  const orderedStoresAfterType = orderedStoreIndices.filter((j) => j > typeColIndex)
  const storeSet = new Set(storeIndices)
  const afterTypeOrder =
    typeColIndex >= 0
      ? Array.from(
          { length: headers.length - typeColIndex - 1 },
          (_, i) => typeColIndex + 1 + i
        )
      : []
  const afterAvgCols = rankBySavings
    ? (() => {
        let idx = 0
        return afterTypeOrder.map((colIndex) =>
          storeSet.has(colIndex) ? orderedStoresAfterType[idx++] : colIndex
        )
      })()
    : afterTypeOrder
  const displayColIndices =
    typeColIndex >= 0
      ? [
          0,
          'category',
          ...(rankBySavings ? orderedStoresBeforeType : storesBeforeType),
          'avg',
          ...afterAvgCols,
        ]
      : frequencyColIndex >= 0
        ? [
            0,
            'category',
            ...(rankBySavings ? orderedStoreIndices : storeIndices),
            frequencyColIndex,
            'avg',
          ]
        : [0, 'category', ...(rankBySavings ? orderedStoreIndices : storeIndices), 'avg']

  const displayColIndicesWithFreqLast =
    frequencyColIndex >= 0
      ? [...displayColIndices.filter((c) => c !== frequencyColIndex), frequencyColIndex]
      : displayColIndices

  const searchLower = search.trim().toLowerCase()
  const searchFilteredRows = searchLower
    ? rows.filter((row) =>
        row.some((cell) => cell.toLowerCase().includes(searchLower))
      )
    : rows

  const categoryFilteredRows = categoryFilter
    ? searchFilteredRows.filter((row) => getCategoryForItem(row[0]) === categoryFilter)
    : searchFilteredRows

  const frequencyFilteredRows =
    frequencyColIndex >= 0 && frequencyFilter != null
      ? categoryFilteredRows.filter((row) => {
          const v = row[frequencyColIndex]
          const n = parseFloat(String(v).replace(/[$,\s]/g, ''))
          return Number.isFinite(n) && n === frequencyFilter
        })
      : categoryFilteredRows

  function columnHasValueInRows(colKey, rowList) {
    if (colKey === 0 || colKey === 'category' || colKey === 'avg') return true
    if (colKey === frequencyColIndex || colKey === typeColIndex) {
      return rowList.some((row) => {
        const v = row[colKey]
        if (v == null) return false
        const s = String(v).trim()
        if (s === '') return false
        const n = parseFloat(s.replace(/[$,\s]/g, ''))
        return Number.isFinite(n)
      })
    }
    if (storeIndices.includes(colKey)) {
      return rowList.some((row) => !Number.isNaN(parsePrice(row[colKey])))
    }
    return true
  }

  const visibleDisplayColIndices =
    (categoryFilter || frequencyFilter != null) && frequencyFilteredRows.length > 0
      ? displayColIndicesWithFreqLast.filter((colKey) => columnHasValueInRows(colKey, frequencyFilteredRows))
      : displayColIndicesWithFreqLast

  function getCellSortValue(row, colKey) {
    if (colKey === 0) return (row[0] ?? '').toString().toLowerCase()
    if (colKey === 'category') return (getCategoryForItem(row[0]) ?? '').toString().toLowerCase()
    if (colKey === 'avg') {
      const { priceByColIndex } = getRowPriceStats(row, skipColIndices)
      let sum = 0
      let count = 0
      storeIndices.forEach((j) => {
        const p = priceByColIndex[j]
        if (p !== undefined) { sum += p; count += 1 }
      })
      return count > 0 ? sum / count : NaN
    }
    if (colKey === frequencyColIndex) {
      const v = row[colKey]
      const n = parseFloat(String(v).replace(/[$,\s]/g, ''))
      return Number.isFinite(n) ? n : (v ?? '').toString().toLowerCase()
    }
    // Store columns: sort by % savings vs row average (negative = good, positive = bad)
    if (storeIndices.includes(colKey)) {
      const price = parsePrice(row[colKey])
      if (Number.isNaN(price)) return NaN
      const { priceByColIndex } = getRowPriceStats(row, skipColIndices)
      let rowSum = 0
      let rowCount = 0
      storeIndices.forEach((j) => {
        const p = priceByColIndex[j]
        if (p !== undefined) { rowSum += p; rowCount += 1 }
      })
      const rowAvg = rowCount > 0 ? rowSum / rowCount : NaN
      if (Number.isNaN(rowAvg) || rowAvg <= 0) return NaN
      return ((price - rowAvg) / rowAvg) * 100
    }
    const n = parsePrice(row[colKey])
    return Number.isFinite(n) ? n : NaN
  }

  const sortedRows = sortKey == null
    ? frequencyFilteredRows
    : [...frequencyFilteredRows].sort((a, b) => {
        const va = getCellSortValue(a, sortKey)
        const vb = getCellSortValue(b, sortKey)
        const isNum = typeof va === 'number' && typeof vb === 'number'
        const na = Number.isNaN(va) || va === '' || (typeof va === 'string' && !va.trim())
        const nb = Number.isNaN(vb) || vb === '' || (typeof vb === 'string' && !vb.trim())
        if (na && nb) return 0
        if (na) return 1
        if (nb) return -1
        if (isNum) return sortDir === 'asc' ? va - vb : vb - va
        const sa = String(va)
        const sb = String(vb)
        const c = sa.localeCompare(sb)
        return sortDir === 'asc' ? c : -c
      })

  const filteredRows = sortedRows

  function handleSort(colKey) {
    if (sortKey === colKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(colKey); setSortDir('asc') }
  }

  return (
    <div className="price-directory">
      <div className="price-directory-toolbar">
        <div className="price-directory-view-toggle" role="tablist" aria-label="View mode">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'directory'}
            className={`price-directory-view-tab ${viewMode === 'directory' ? 'active' : ''}`}
            onClick={() => setViewMode('directory')}
          >
            Price directory
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'recipe'}
            className={`price-directory-view-tab ${viewMode === 'recipe' ? 'active' : ''}`}
            onClick={() => setViewMode('recipe')}
          >
            Recipe cost
          </button>
        </div>
        {viewMode === 'directory' && (
          <>
        <input
          type="search"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="price-directory-search"
          aria-label="Search price directory"
        />
        <label className="price-directory-rank-toggle">
          <input
            type="checkbox"
            checked={rankBySavings}
            onChange={(e) => setRankBySavings(e.target.checked)}
            aria-label="Rank stores by average savings"
          />
          <span>Rank by savings</span>
        </label>
        <span className="price-directory-count">
          {filteredRows.length === rows.length
            ? `${rows.length} items`
            : `${filteredRows.length} of ${rows.length} items`}
          {refreshing && <span className="price-directory-updating" title="Updating in background"> ⟳</span>}
        </span>
        <a
          href={PRICE_DIRECTORY_SPREADSHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="price-directory-edit-link"
        >
          Edit here
        </a>
          </>
        )}
      </div>

      {viewMode === 'recipe' ? (
        <div className="price-directory-recipe-view">
          <RecipeLibrary
            onSelectRecipe={setSelectedLibraryRecipe}
            selectedRecipe={selectedLibraryRecipe}
          />
          <RecipeCost
            headers={headers}
            rows={rows}
            libraryRecipe={selectedLibraryRecipe}
          />
        </div>
      ) : (
        <>
      <div className="price-directory-quick-filters">
        <button
          type="button"
          className={`price-directory-filter-chip ${categoryFilter == null ? 'price-directory-filter-chip-active' : ''}`}
          onClick={() => setCategoryFilter(null)}
          aria-pressed={categoryFilter == null}
        >
          All
        </button>
        {categoryList.map(({ name, emoji }) => (
          <button
            key={name}
            type="button"
            className={`price-directory-filter-chip ${categoryFilter === name ? 'price-directory-filter-chip-active' : ''}`}
            onClick={() => setCategoryFilter(name)}
            aria-pressed={categoryFilter === name}
          >
            <span className="price-directory-filter-chip-emoji" aria-hidden>{emoji}</span>
            <span>{name}</span>
          </button>
        ))}
      </div>

      {frequencyColIndex >= 0 && (
        <div className="price-directory-quick-filters price-directory-frequency-filters">
          <span className="price-directory-frequency-label">Frequency:</span>
          <button
            type="button"
            className={`price-directory-filter-chip ${frequencyFilter == null ? 'price-directory-filter-chip-active' : ''}`}
            onClick={() => setFrequencyFilter(null)}
            aria-pressed={frequencyFilter == null}
          >
            All
          </button>
          {FREQUENCY_LABELS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`price-directory-filter-chip ${frequencyFilter === value ? 'price-directory-filter-chip-active' : ''}`}
              onClick={() => setFrequencyFilter(value)}
              aria-pressed={frequencyFilter === value}
              title={`Frequency ${value}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="price-directory-table-wrap">
        <table className="price-directory-table">
          <thead>
            <tr>
              {visibleDisplayColIndices.map((colKey, idx) => {
                const isSorted = sortKey === colKey
                const thClass = [
                  'price-directory-th-sortable',
                  isSorted && sortDir === 'asc' && 'price-directory-th-sorted-asc',
                  isSorted && sortDir === 'desc' && 'price-directory-th-sorted-desc',
                ].filter(Boolean).join(' ')
                if (colKey === 'avg') {
                  return (
                    <th key="avg" className={thClass} onClick={() => handleSort('avg')} scope="col">
                      Avg price
                      {isSorted && <span className="price-directory-sort-icon" aria-hidden>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>}
                    </th>
                  )
                }
                if (colKey === 'category') {
                  return (
                    <th key="category" className={thClass} onClick={() => handleSort('category')} scope="col">
                      Category
                      {isSorted && <span className="price-directory-sort-icon" aria-hidden>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>}
                    </th>
                  )
                }
                const h = headers[colKey]
                const { imageUrl, emoji } = getStoreHeaderDisplay(h)
                const hasIcon = imageUrl || emoji
                return (
                  <th key={colKey} className={thClass} onClick={() => handleSort(colKey)} scope="col">
                    {hasIcon ? (
                      <span className="price-directory-th-with-icon">
                        <span className="price-directory-th-content">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt=""
                              className="price-directory-store-icon"
                              loading="lazy"
                              onError={(e) => { e.target.style.display = 'none' }}
                            />
                          ) : (
                            <span className="price-directory-store-emoji" aria-hidden>{emoji}</span>
                          )}
                          <span className="price-directory-th-label">{h}</span>
                        </span>
                      </span>
                    ) : (
                      h
                    )}
                    {isSorted && <span className="price-directory-sort-icon" aria-hidden>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, i) => {
              const itemName = row[0]
              const emoji = getItemEmoji(itemName)
              const { priceByColIndex, min, max } = getRowPriceStats(row, skipColIndices)
              const isBestByCol = {}
              Object.keys(priceByColIndex).forEach((j) => {
                if (priceByColIndex[j] === min) isBestByCol[j] = true
              })
              // Avg price for this row (over store columns only)
              let rowAvgSum = 0
              let rowAvgCount = 0
              storeIndices.forEach((j) => {
                const p = priceByColIndex[j]
                if (p !== undefined) {
                  rowAvgSum += p
                  rowAvgCount += 1
                }
              })
              const rowAvgPrice = rowAvgCount > 0 ? rowAvgSum / rowAvgCount : NaN
              return (
                <tr key={i}>
                  {visibleDisplayColIndices.map((colKey) => {
                    if (colKey === 'avg') {
                      return (
                        <td key="avg" className="price-directory-avg-cell">
                          {formatPrice(rowAvgPrice)}
                        </td>
                      )
                    }
                    if (colKey === 'category') {
                      return (
                        <td key="category" className="price-directory-category-cell">
                          {getCategoryForItem(row[0]) ?? '—'}
                        </td>
                      )
                    }
                    const cell = row[colKey]
                    if (colKey === 0) {
                      return (
                        <td key={colKey}>
                          <span className="price-directory-item-cell">
                            {emoji && <span className="price-directory-item-emoji" aria-hidden>{emoji}</span>}
                            <span>{cell}</span>
                          </span>
                        </td>
                      )
                    }
                    const price = priceByColIndex[colKey]
                    const hasPrice = price !== undefined
                    const style = hasPrice && colKey !== frequencyColIndex
                      ? priceCellBackground(price, min, max, isBestByCol[colKey])
                      : {}
                    const diffFromAvg = hasPrice && !Number.isNaN(rowAvgPrice) && rowAvgPrice > 0
                      ? formatDiffFromAvg(price, rowAvgPrice)
                      : null
                    return (
                      <td key={colKey} style={style} className={hasPrice ? 'price-directory-price-cell' : ''}>
                        {hasPrice ? Number(price).toFixed(2) : cell}
                        {diffFromAvg != null && (
                          <span className="price-directory-cell-diff">{' '}{diffFromAvg}</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="price-directory-footer-row">
              {visibleDisplayColIndices.map((colKey) => {
                if (colKey === 'avg') {
                  return <td key="avg" className="price-directory-footer-cell">—</td>
                }
                if (colKey === 'category') {
                  return <td key="category" className="price-directory-footer-cell">—</td>
                }
                if (colKey === 0) {
                  return (
                    <td key={colKey} className="price-directory-footer-cell price-directory-footer-label">
                      Avg savings
                    </td>
                  )
                }
                if (colKey === frequencyColIndex || colKey === typeColIndex) {
                  return <td key={colKey} className="price-directory-footer-cell">—</td>
                }
                const val = averageSavingsByCol[colKey]
                return (
                  <td key={colKey} className="price-directory-footer-cell price-directory-footer-savings">
                    {formatSavingsPct(val)}
                  </td>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </div>
      <section className="price-directory-savings-summary" aria-label="Average savings ranking">
        <h3 className="price-directory-savings-summary-title">Avg savings ranking</h3>
        <ol className="price-directory-savings-ranking">
          {orderedStoreIndicesRanking.map((colIndex, idx) => {
            const name = headers[colIndex]
            const pct = averageSavingsByCol[colIndex]
            const n = itemCountByCol[colIndex] ?? 0
            const { imageUrl, emoji } = getStoreHeaderDisplay(name)
            const hasIcon = imageUrl || emoji
            return (
              <li key={colIndex} className="price-directory-savings-ranking-item">
                <span className="price-directory-savings-rank">{idx + 1}.</span>{' '}
                {hasIcon ? (
                  <span className="price-directory-savings-store-with-icon">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt=""
                        className="price-directory-savings-store-icon"
                        loading="lazy"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <span className="price-directory-savings-store-emoji" aria-hidden>{emoji}</span>
                    )}
                    <span className="price-directory-savings-store">{name}</span>
                  </span>
                ) : (
                  <span className="price-directory-savings-store">{name}</span>
                )}
                {' = '}
                <span className="price-directory-savings-pct">{formatSavingsPct(pct)}</span>
                <span className="price-directory-savings-count"> ({n} products)</span>
              </li>
            )
          })}
        </ol>
      </section>
        </>
      )}
    </div>
  )
}

export default PriceDirectory
