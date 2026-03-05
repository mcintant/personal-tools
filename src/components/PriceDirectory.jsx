import React, { useState, useEffect } from 'react'
import { fetchPriceDirectory } from '../utils/sheetsPriceDirectory'
import { getStoreImageUrl, getItemImageUrl } from '../data/priceDirectoryMetadata'
import './PriceDirectory.css'

const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')

function PriceDirectory() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchPriceDirectory()
      .then((result) => {
        if (!cancelled) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load price directory')
          setLoading(false)
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
  const searchLower = search.trim().toLowerCase()
  const filteredRows = searchLower
    ? rows.filter((row) =>
        row.some((cell) => cell.toLowerCase().includes(searchLower))
      )
    : rows

  return (
    <div className="price-directory">
      <div className="price-directory-toolbar">
        <input
          type="search"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="price-directory-search"
          aria-label="Search price directory"
        />
        <span className="price-directory-count">
          {filteredRows.length === rows.length
            ? `${rows.length} items`
            : `${filteredRows.length} of ${rows.length} items`}
        </span>
      </div>

      <div className="price-directory-table-wrap">
        <table className="price-directory-table">
          <thead>
            <tr>
              {headers.map((h, i) => {
                const storeImgUrl = getStoreImageUrl(h, baseUrl)
                return (
                  <th key={i} className={storeImgUrl ? 'price-directory-th-with-icon' : ''}>
                    {storeImgUrl ? (
                      <span className="price-directory-th-content">
                        <img
                          src={storeImgUrl}
                          alt=""
                          className="price-directory-store-icon"
                          title={h}
                          onError={(e) => { e.target.style.display = 'none' }}
                        />
                        <span className="price-directory-th-label">{h}</span>
                      </span>
                    ) : (
                      h
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, i) => {
              const itemName = row[0]
              const itemImgUrl = getItemImageUrl(itemName, baseUrl)
              return (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>
                      {j === 0 ? (
                        <span className="price-directory-item-cell">
                          {itemImgUrl ? (
                            <img
                              src={itemImgUrl}
                              alt=""
                              className="price-directory-item-icon"
                              onError={(e) => { e.target.style.display = 'none' }}
                            />
                          ) : (
                            <span className="price-directory-item-fallback">
                              {(cell || '').trim().charAt(0).toUpperCase() || '?'}
                            </span>
                          )}
                          <span className="price-directory-item-label">{cell}</span>
                        </span>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default PriceDirectory
