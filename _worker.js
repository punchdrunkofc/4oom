export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Если запрос идет к API, обрабатываем его нашим кодом
    if (url.pathname.startsWith('/api/')) {
      const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };

      if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

      try {
        if (!env.DB) {
          return new Response(JSON.stringify({ error: 'Нет базы данных. Проверь Bindings.' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        // GET /api/threads (список тредов)
        if (url.pathname === '/api/threads' && request.method === 'GET') {
          const { results } = await env.DB.prepare(`
            SELECT t.*, (SELECT COUNT(*) FROM posts p WHERE p.thread_id = t.id) AS reply_count
            FROM threads t ORDER BY t.updated_at DESC LIMIT 100
          `).all();
          return new Response(JSON.stringify(results), { headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        // POST /api/threads (создать тред)
        if (url.pathname === '/api/threads' && request.method === 'POST') {
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

        // GET /api/posts?thread=1 (получить посты треда)
        if (url.pathname === '/api/posts' && request.method === 'GET') {
          const threadId = url.searchParams.get('thread');
          if (!threadId) return new Response(JSON.stringify({ error: 'thread required' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
          
          const thread = await env.DB.prepare(`SELECT * FROM threads WHERE id = ?`).bind(threadId).first();
          if (!thread) return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } });
          
          const { results } = await env.DB.prepare(
            `SELECT * FROM posts WHERE thread_id = ? ORDER BY created_at ASC`
          ).bind(threadId).all();
          
          return new Response(JSON.stringify({ thread, posts: results }), { headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        // POST /api/posts (отправить ответ в тред)
        if (url.pathname === '/api/posts' && request.method === 'POST') {
          const body = await request.json();
          if (!body.thread_id || !body.body) return new Response(JSON.stringify({ error: 'thread_id and body required' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
          
          const author = body.author_name || 'guest';
          await env.DB.prepare(
            `INSERT INTO posts (thread_id, author_name, body) VALUES (?, ?, ?)`
          ).bind(body.thread_id, author, body.body).run();
          
          await env.DB.prepare(
            `UPDATE threads SET updated_at = unixepoch() WHERE id = ?`
          ).bind(body.thread_id).run();
          
          return new Response(JSON.stringify({ ok: true }), { status: 201, headers: { ...cors, 'Content-Type': 'application/json' } });
        }
        
        return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
      }
    }

    // Для всех остальных запросов (главная страница, CSS, картинки) отдаем статику
    return env.ASSETS.fetch(request);
  },
};
