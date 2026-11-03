export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    try {
      // GET /api/threads?section=general
      if (url.pathname === '/api/threads' && request.method === 'GET') {
        const section = url.searchParams.get('section');
        const stmt = section
          ? env.DB.prepare(`SELECT t.*, (SELECT COUNT(*) FROM posts p WHERE p.thread_id = t.id) AS reply_count
                            FROM threads t WHERE t.section_slug = ? ORDER BY t.updated_at DESC LIMIT 100`).bind(section)
          : env.DB.prepare(`SELECT t.*, (SELECT COUNT(*) FROM posts p WHERE p.thread_id = t.id) AS reply_count
                            FROM threads t ORDER BY t.updated_at DESC LIMIT 100`);
        const { results } = await stmt.all();
        return json(results, cors);
      }

      // POST /api/threads
      if (url.pathname === '/api/threads' && request.method === 'POST') {
        const body = await request.json();
        if (!body.title || !body.body) return json({ error: 'title and body required' }, cors, 400);
        const author = body.author_name || 'guest';
        const section = body.section_slug || 'general';
        const t = await env.DB.prepare(
          `INSERT INTO threads (section_slug, title, author_name) VALUES (?, ?, ?) RETURNING id`
        ).bind(section, body.title, author).first();
        await env.DB.prepare(
          `INSERT INTO posts (thread_id, author_name, body) VALUES (?, ?, ?)`
        ).bind(t.id, author, body.body).run();
        return json({ id: t.id }, cors, 201);
      }

      // GET /api/posts?thread=1
      if (url.pathname === '/api/posts' && request.method === 'GET') {
        const threadId = url.searchParams.get('thread');
        if (!threadId) return json({ error: 'thread required' }, cors, 400);
        const thread = await env.DB.prepare(`SELECT * FROM threads WHERE id = ?`).bind(threadId).first();
        if (!thread) return json({ error: 'not found' }, cors, 404);
        const { results } = await env.DB.prepare(
          `SELECT * FROM posts WHERE thread_id = ? ORDER BY created_at ASC`
        ).bind(threadId).all();
        return json({ thread, posts: results }, cors);
      }

      // POST /api/posts
      if (url.pathname === '/api/posts' && request.method === 'POST') {
        const body = await request.json();
        if (!body.thread_id || !body.body) return json({ error: 'thread_id and body required' }, cors, 400);
        const author = body.author_name || 'guest';
        await env.DB.prepare(
          `INSERT INTO posts (thread_id, author_name, body) VALUES (?, ?, ?)`
        ).bind(body.thread_id, author, body.body).run();
        await env.DB.prepare(
          `UPDATE threads SET updated_at = unixepoch() WHERE id = ?`
        ).bind(body.thread_id).run();
        return json({ ok: true }, cors, 201);
      }

      return json({ error: 'not found' }, cors, 404);
    } catch (e) {
      return json({ error: e.message }, cors, 500);
    }
  },
};

function json(data, cors, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
