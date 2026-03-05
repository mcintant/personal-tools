/**
 * Fetches price directory data from Google Apps Script Web App.
 * Set VITE_SHEETS_APP_SCRIPT_URL in .env to your script's exec URL.
 * No API keys in repo - the URL is the public endpoint.
 */

const DEFAULT_URL = import.meta.env.VITE_SHEETS_APP_SCRIPT_URL || ''

/**
 * Fetch and parse price directory from Apps Script endpoint.
 * Expects JSON: { data: [[header1, header2, ...], [row1cell1, ...], ...] }
 * or { headers: [...], rows: [[...], ...] }
 *
 * @returns {{ headers: string[], rows: string[][] }}
 */
export async function fetchPriceDirectory() {
  const url = DEFAULT_URL.trim()
  if (!url) {
    throw new Error(
      'Price directory URL not configured. Set VITE_SHEETS_APP_SCRIPT_URL in .env (see .env.example).'
    )
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load price directory: ${response.status} ${response.statusText}`)
  }

  const json = await response.json()

  // Support { data: [headers, ...rows] } or { headers, rows }
  let headers = []
  let rows = []

  if (json.data && Array.isArray(json.data) && json.data.length > 0) {
    headers = json.data[0].map(String)
    rows = json.data.slice(1).map((row) => row.map((cell) => (cell != null ? String(cell) : '')))
  } else if (json.headers && json.rows) {
    headers = json.headers.map(String)
    rows = json.rows.map((row) => row.map((cell) => (cell != null ? String(cell) : '')))
  } else {
    throw new Error('Invalid price directory format: expected { data: [...] } or { headers, rows }')
  }

  return { headers, rows }
}
