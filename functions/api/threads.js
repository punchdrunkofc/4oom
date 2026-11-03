export async function onRequest(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    if (!env.DB) return new Response(JSON.stringify({ error: 'Нет базы' }), { status: 500, headers: cors });

    // GET /api/threads
    if (request.method === 'GET') {
      const { results } = await env.DB.prepare(`
        SELECT t.*, (SELECT COUNT(*) FROM posts p WHERE p.thread_id = t.id) AS reply_count
        FROM threads t ORDER BY t.updated_at DESC LIMIT 100
      `).all();
      return new Response(JSON.stringify(results), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // POST /api/threads
    if (request.method === 'POST') {
      const body = await request.json();
      const author = body.author_name || 'guest';
      const section = body.section_slug || 'general';
      
      const t = await env.DB.prepare(
        `INSERT INTO threads (section_slug, title, author_name) VALUES (?, ?, ?) RETURNING id`
      ).bind(section, body.title, author).first();
      
      await env.DB.prepare(
        `INSERT INTO posts (thread_id, author_name, body) VALUES (?, ?, ?)`
      ).bind(t.id, author, body.body).run();
      
      return new Response(JSON.stringify({ id: t.id }), { status: 201, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
}
