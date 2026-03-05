import React, { useState, useMemo, useEffect } from 'react'
import { parseRecipe } from '../utils/recipeParser'
import { computeRecipeCosts } from '../utils/recipeCost'
import { getStoreHeaderDisplay } from '../data/priceDirectoryMetadata'
import './RecipeCost.css'

function formatPrice(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function RecipeCost({ headers = [], rows = [], libraryRecipe = null }) {
  const [recipeText, setRecipeText] = useState('')

  useEffect(() => {
    if (libraryRecipe?.ingredientsText != null) {
      setRecipeText(libraryRecipe.ingredientsText)
    }
  }, [libraryRecipe?.name, libraryRecipe?.ingredientsText])

  const frequencyColIndex = headers.findIndex(
    (h) => String(h).trim().toLowerCase() === 'frequency (1 to 5)'
  )
  const typeColIndex = headers.findIndex((h) => String(h).trim().toLowerCase() === 'type')
  const skipColIndices = [frequencyColIndex, typeColIndex].filter((i) => i >= 0)
  const storeIndices = headers
    .map((_, i) => i)
    .filter((i) => i >= 1 && !skipColIndices.includes(i))

  const result = useMemo(() => {
    if (!recipeText.trim() || rows.length === 0 || storeIndices.length === 0) return null
    const parsed = parseRecipe(recipeText)
    if (parsed.length === 0) return null
    return computeRecipeCosts(parsed, headers, rows, storeIndices, skipColIndices)
  }, [recipeText, headers, rows, storeIndices, skipColIndices])

  const uniqueStoreIndices = useMemo(() => {
    const seen = new Set()
    return storeIndices.filter((j) => {
      const name = (headers[j] ?? '').trim().toLowerCase()
      if (seen.has(name)) return false
      seen.add(name)
      return true
    })
  }, [storeIndices, headers])

  /** Only stores that have at least one price for a matched recipe item (hide columns with no data) */
  const visibleStoreIndices = useMemo(() => {
    if (!result) return []
    return uniqueStoreIndices.filter((j) =>
      result.lineResults.some((r) => {
        if (r.unknown || !r.match) return false
        const p = r.match.priceByColIndex[j]
        return p != null && Number.isFinite(p)
      })
    )
  }, [result, uniqueStoreIndices])

  /** Best single store: use avg for missing items so stores with few items don't get undue weight */
  const bestSingleStore = useMemo(() => {
    if (!result || !result.totalAtStoreWithAvgFill || uniqueStoreIndices.length === 0) return null
    let minTotal = Infinity
    let bestIndex = null
    for (const j of uniqueStoreIndices) {
      const t = result.totalAtStoreWithAvgFill(j)
      if (Number.isFinite(t) && t > 0 && t < minTotal) {
        minTotal = t
        bestIndex = j
      }
    }
    if (bestIndex == null) return null
    return { storeIndex: bestIndex, total: minTotal }
  }, [result, uniqueStoreIndices])

  const [compareStoreIndex, setCompareStoreIndex] = useState(null)
  const compareTotal = result && compareStoreIndex != null ? result.totalAtStore(compareStoreIndex) : null
  const savings = result && compareTotal != null ? result.totalBest - compareTotal : null

  /** Matched rows first, then unknown (no match) at bottom */
  const sortedLineResults = useMemo(() => {
    if (!result) return []
    const matched = result.lineResults.filter((r) => !r.unknown)
    const unknown = result.lineResults.filter((r) => r.unknown)
    return [...matched, ...unknown]
  }, [result])

  /** For a matched line, get cost at store (mult * price). Returns NaN if no price. */
  const getCostAtStore = (item, storeIndex) => {
    if (item.unknown || !item.match) return NaN
    const p = item.match.priceByColIndex[storeIndex]
    if (p == null || Number.isNaN(p)) return NaN
    return (item.match.multiplier ?? 1) * p
  }

  /** For a matched line, avg cost (avgPrice * multiplier). */
  const getAvgCost = (item) => {
    if (item.unknown || !item.match) return NaN
    const avg = item.match.avgPrice
    if (avg == null || Number.isNaN(avg)) return NaN
    return (item.match.multiplier ?? 1) * avg
  }

  /** Total of avg costs for all matched lines (for footer). */
  const totalAvgCost = useMemo(() => {
    if (!result) return NaN
    return result.lineResults.reduce((sum, r) => {
      if (r.unknown || !r.match) return sum
      const avg = r.match.avgPrice
      if (avg == null || Number.isNaN(avg)) return sum
      return sum + (r.match.multiplier ?? 1) * avg
    }, 0)
  }, [result])

  /** For a matched line, store index with lowest cost (best price for this row) */
  const getBestStoreIndexForLine = (item) => {
    if (item.unknown || !item.match) return null
    return item.match.bestStoreIndex
  }

  return (
    <div className="recipe-cost">
      {libraryRecipe && (
        <header className="recipe-cost-library-header">
          {libraryRecipe.imageUrl && (
            <img
              src={libraryRecipe.imageUrl}
              alt=""
              className="recipe-cost-library-image"
              loading="lazy"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          )}
          <h2 className="recipe-cost-library-name">{libraryRecipe.name}</h2>
        </header>
      )}
      <div className="recipe-cost-toolbar">
        <label htmlFor="recipe-cost-textarea" className="recipe-cost-label">
          Paste recipe (one ingredient per line)
        </label>
        <textarea
          id="recipe-cost-textarea"
          className="recipe-cost-textarea"
          placeholder={`4 large bone-in chicken thighs, about 1 1/2 pounds
2 or 3 chipotle chiles in adobo, chopped
...`}
          value={recipeText}
          onChange={(e) => setRecipeText(e.target.value)}
          rows={10}
        />
      </div>

      {result && (
        <>
          <div className="recipe-cost-table-wrap">
            <table className="recipe-cost-table" aria-label="Recipe cost by store">
              <thead>
                <tr>
                  <th scope="col" className="recipe-cost-col-ingredient">
                    Ingredient
                  </th>
                  <th scope="col" className="recipe-cost-col-avg">
                    Avg price
                  </th>
                  {visibleStoreIndices.map((j) => {
                    const h = headers[j]
                    const { imageUrl, emoji } = getStoreHeaderDisplay(h)
                    return (
                      <th key={j} scope="col" className="recipe-cost-col-store">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt=""
                            className="recipe-cost-store-icon"
                            loading="lazy"
                            onError={(e) => {
                              e.target.style.display = 'none'
                            }}
                          />
                        ) : emoji ? (
                          <span className="recipe-cost-store-emoji" aria-hidden>
                            {emoji}
                          </span>
                        ) : null}
                        <span>{h}</span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedLineResults.map((item, idx) => (
                  <tr
                    key={idx}
                    className={item.unknown ? 'recipe-cost-row-no-match' : ''}
                  >
                    <td className="recipe-cost-cell-ingredient">
                      <span className="recipe-cost-line-raw">{item.parsed.rawLine}</span>
                      {item.unknown && (
                        <span className="recipe-cost-no-match">No match</span>
                      )}
                      {!item.unknown && item.match && (
                        <span className="recipe-cost-directory-name-small">
                          {item.match.directoryName}
                        </span>
                      )}
                    </td>
                    <td className="recipe-cost-cell-avg">
                      {item.unknown ? '—' : formatPrice(Number.isFinite(getAvgCost(item)) ? getAvgCost(item) : null)}
                    </td>
                    {visibleStoreIndices.map((j) => {
                      const cost = getCostAtStore(item, j)
                      const isBest = !item.unknown && getBestStoreIndexForLine(item) === j
                      return (
                        <td
                          key={j}
                          className={`recipe-cost-cell-price ${isBest ? 'recipe-cost-cell-best' : ''} ${item.unknown ? 'recipe-cost-cell-no-match' : ''}`}
                        >
                          {item.unknown ? (
                            '—'
                          ) : (
                            formatPrice(Number.isFinite(cost) ? cost : null)
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="recipe-cost-row-totals">
                  <th scope="row">Total</th>
                  <td className="recipe-cost-cell-total recipe-cost-cell-avg-total">
                    {formatPrice(Number.isFinite(totalAvgCost) ? totalAvgCost : null)}
                  </td>
                  {visibleStoreIndices.map((j) => {
                    const total = result.totalAtStoreWithAvgFill(j)
                    const isBestSingle = bestSingleStore && bestSingleStore.storeIndex === j
                    return (
                      <td
                        key={j}
                        className={`recipe-cost-cell-total ${isBestSingle ? 'recipe-cost-cell-best' : ''}`}
                      >
                        {formatPrice(Number.isFinite(total) && total > 0 ? total : null)}
                      </td>
                    )
                  })}
                </tr>
              </tfoot>
            </table>
          </div>

          <section className="recipe-cost-totals" aria-label="Recipe cost totals">
            <h3 className="recipe-cost-totals-title">Stats</h3>
            <p className="recipe-cost-total-best">
              Buy each at best store: <strong>{formatPrice(result.totalBest)}</strong>
            </p>
            {bestSingleStore && (
              <p className="recipe-cost-best-single">
                Best single store: {(() => {
                  const h = headers[bestSingleStore.storeIndex]
                  const { imageUrl, emoji } = getStoreHeaderDisplay(h)
                  return (
                    <>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt=""
                          className="recipe-cost-store-icon"
                          loading="lazy"
                          onError={(e) => {
                            e.target.style.display = 'none'
                          }}
                        />
                      ) : emoji ? (
                        <span className="recipe-cost-store-emoji" aria-hidden>
                          {emoji}
                        </span>
                      ) : null}
                      <strong>{h}</strong> = {formatPrice(bestSingleStore.total)}
                    </>
                  )
                })()}
              </p>
            )}
            <div className="recipe-cost-compare">
              <label htmlFor="recipe-cost-compare-select">Compare to (all at one store):</label>
              <select
                id="recipe-cost-compare-select"
                className="recipe-cost-compare-select"
                value={compareStoreIndex ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  setCompareStoreIndex(v === '' ? null : Number(v))
                }}
              >
                <option value="">—</option>
                {visibleStoreIndices.map((j) => (
                  <option key={j} value={j}>
                    {headers[j]}
                  </option>
                ))}
              </select>
              {compareTotal != null && (
                <span className="recipe-cost-compare-total">
                  {formatPrice(compareTotal)}
                  {savings != null && savings !== 0 && (
                    <span className="recipe-cost-savings">
                      {' '}
                      {savings > 0
                        ? `(best per item saves ${formatPrice(savings)} vs this store)`
                        : `(this store ${formatPrice(Math.abs(savings))} cheaper for full list)`}
                    </span>
                  )}
                </span>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

export default RecipeCost
