/**
 * Cloudflare Worker + D1: CSV upload API for kobo app.
 * - GET /api/uploads → list uploads (id, name, created_at)
 * - GET /api/uploads/:id → get one upload's content (CSV text)
 * - POST /api/uploads → body = CSV text, optional header X-Upload-Name or ?name=… → returns { id }
 * - GET /api/custom-songs → list custom songs (id, name, frequency, created_at)
 * - POST /api/custom-songs → body JSON { name, frequency } → returns { id }
 */
const CUSTOM_SONG_FREQUENCIES = ['must-know', 'important-bass', 'everyone-plays', 'called-often', 'obscure'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Upload-Name',
  'Access-Control-Max-Age': '86400',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function text(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...CORS },
  });
}

function corsPreflight() {
  return new Response(null, { status: 204, headers: CORS });
}

export default {
  async fetch(request, env, _ctx) {
    if (request.method === 'OPTIONS') return corsPreflight();

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // GET /api/uploads → list
      if (path === '/api/uploads' && request.method === 'GET') {
        const stmt = env.DB.prepare(
          'SELECT id, name, created_at FROM csv_uploads ORDER BY created_at DESC LIMIT 500'
        );
        const { results } = await stmt.all();
        return json({ uploads: results });
      }

      // GET /api/uploads/:id → one upload content
      const getOneMatch = path.match(/^\/api\/uploads\/(\d+)$/);
      if (getOneMatch && request.method === 'GET') {
        const id = getOneMatch[1];
        const row = await env.DB.prepare('SELECT name, content FROM csv_uploads WHERE id = ?')
          .bind(id)
          .first();
        if (!row) return json({ error: 'Not found' }, 404);
        return text(row.content, 200);
      }

      // POST /api/uploads → create (body = CSV, name from header or query or default)
      if (path === '/api/uploads' && request.method === 'POST') {
        const name =
          request.headers.get('X-Upload-Name') ||
          url.searchParams.get('name') ||
          `upload-${Date.now()}.csv`;
        const content = await request.text();
        if (!content || content.length > 5 * 1024 * 1024) {
          return json({ error: 'Empty body or too large (max 5MB)' }, 400);
        }
        const result = await env.DB.prepare(
          'INSERT INTO csv_uploads (name, content) VALUES (?, ?)'
        )
          .bind(name, content)
          .run();
        const id = result.meta.last_row_id;
        return json({ id, name }, 201);
      }

      // GET /api/custom-songs → list
      if (path === '/api/custom-songs' && request.method === 'GET') {
        if (!env.CUSTOM_SONGS) return json({ songs: [] });
        try {
          const { results } = await env.CUSTOM_SONGS.prepare(
            'SELECT id, name, frequency, created_at FROM custom_songs ORDER BY name ASC'
          ).all();
          return json({ songs: results || [] });
        } catch (e) {
          return json({ error: 'D1 list failed: ' + (e && e.message) }, 500);
        }
      }

      // POST /api/custom-songs → create
      if (path === '/api/custom-songs' && request.method === 'POST') {
        if (!env.CUSTOM_SONGS) return json({ error: 'Custom songs DB not configured' }, 503);
        let body;
        try {
          body = await request.json();
        } catch (e) {
          console.error('POST /api/custom-songs json parse:', e);
          return json({ error: 'Invalid JSON' }, 400);
        }
        if (body == null || typeof body !== 'object') {
          return json({ error: 'Body must be a JSON object' }, 400);
        }
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        const frequency = body.frequency && CUSTOM_SONG_FREQUENCIES.includes(body.frequency) ? body.frequency : 'called-often';
        if (!name) return json({ error: 'name is required' }, 400);
        try {
          const result = await env.CUSTOM_SONGS.prepare(
            'INSERT INTO custom_songs (name, frequency) VALUES (?, ?)'
          )
            .bind(name, frequency)
            .run();
          const id = result.meta.last_row_id;
          return json({ id, name, frequency }, 201);
        } catch (e) {
          const msg = e && (e.message || String(e));
          console.error('POST /api/custom-songs D1 insert:', e);
          return json({ error: 'D1 insert failed: ' + msg }, 500);
        }
      }

      return json({ error: 'Not found' }, 404);
    } catch (err) {
      const msg = err && (err.message || String(err));
      console.error('Worker error:', err);
      return json({ error: msg || 'Internal error' }, 500);
    }
  },
};
