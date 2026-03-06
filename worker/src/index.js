/**
 * Cloudflare Worker + D1: CSV upload API for kobo app.
 * - GET /api/uploads → list uploads (id, name, created_at)
 * - GET /api/uploads/:id → get one upload's content (CSV text)
 * - POST /api/uploads → body = CSV text, optional header X-Upload-Name or ?name=… → returns { id }
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

      return json({ error: 'Not found' }, 404);
    } catch (err) {
      return json({ error: err.message || 'Internal error' }, 500);
    }
  },
};
