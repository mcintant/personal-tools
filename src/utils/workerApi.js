/**
 * Base URL for the Cloudflare Worker API (e.g. https://kobo-api.xxx.workers.dev).
 * Set VITE_CLOUDFLARE_WORKER_URL in .env.
 */
export function getWorkerBaseUrl() {
  const url = import.meta.env.VITE_CLOUDFLARE_WORKER_URL
  return typeof url === 'string' && url.trim() ? url.trim().replace(/\/$/, '') : ''
}

export function hasWorkerApi() {
  return !!getWorkerBaseUrl()
}

/** GET /api/uploads → { uploads: [{ id, name, created_at }] } */
export async function listCsvUploads() {
  const base = getWorkerBaseUrl()
  if (!base) throw new Error('Worker API URL not configured')
  const res = await fetch(`${base}/api/uploads`)
  if (!res.ok) throw new Error(`Failed to list uploads: ${res.status}`)
  return res.json()
}

/** GET /api/uploads/:id → CSV text */
export async function getCsvUpload(id) {
  const base = getWorkerBaseUrl()
  if (!base) throw new Error('Worker API URL not configured')
  const res = await fetch(`${base}/api/uploads/${id}`)
  if (!res.ok) throw new Error(`Failed to load upload: ${res.status}`)
  return res.text()
}

/** POST /api/uploads → body = CSV string, optional name → { id, name } */
export async function uploadCsv(csvText, name = '') {
  const base = getWorkerBaseUrl()
  if (!base) throw new Error('Worker API URL not configured')
  const headers = { 'Content-Type': 'text/plain; charset=utf-8' }
  if (name) headers['X-Upload-Name'] = name
  const res = await fetch(`${base}/api/uploads`, {
    method: 'POST',
    headers,
    body: csvText,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Upload failed: ${res.status}`)
  }
  return res.json()
}

/** GET /api/custom-songs → { songs: [{ id, name, frequency, created_at }] } */
export async function listCustomSongs() {
  const base = getWorkerBaseUrl()
  if (!base) return { songs: [] }
  const res = await fetch(`${base}/api/custom-songs`)
  if (!res.ok) return { songs: [] }
  return res.json()
}

/** POST /api/custom-songs → { name, frequency } → { id, name, frequency } */
export async function addCustomSong(name, frequency) {
  const base = getWorkerBaseUrl()
  if (!base) throw new Error('Worker API URL not configured')
  const res = await fetch(`${base}/api/custom-songs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name.trim(), frequency }),
  })
  if (!res.ok) {
    const text = await res.text()
    let errMsg = `Failed to add song: ${res.status}`
    try {
      const data = text ? JSON.parse(text) : {}
      if (data.error) errMsg = data.error
    } catch (_) {
      if (text) errMsg = text
    }
    throw new Error(errMsg)
  }
  return res.json()
}
