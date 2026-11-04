export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API
    if (url.pathname.startsWith('/api/')) {
      const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };
      if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

      try {
        if (!env.DB) return new Response(JSON.stringify({ error: 'Нет базы' }), { status: 500, headers: cors });

        if (url.pathname === '/api/threads' && request.method === 'GET') {
          const { results } = await env.DB.prepare(`
            SELECT t.*, (SELECT COUNT(*) FROM posts p WHERE p.thread_id = t.id) AS reply_count
            FROM threads t ORDER BY t.updated_at DESC LIMIT 100
          `).all();
          return new Response(JSON.stringify(results), { headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        if (url.pathname === '/api/threads' && request.method === 'POST') {
          const body = await request.json();
          const t = await env.DB.prepare(
            `INSERT INTO threads (section_slug, title, author_name) VALUES (?, ?, ?) RETURNING id`
          ).bind(body.section_slug || 'general', body.title, body.author_name || 'guest').first();
          await env.DB.prepare(
            `INSERT INTO posts (thread_id, author_name, body) VALUES (?, ?, ?)`
          ).bind(t.id, body.author_name || 'guest', body.body).run();
          return new Response(JSON.stringify({ id: t.id }), { status: 201, headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        if (url.pathname === '/api/posts' && request.method === 'GET') {
          const threadId = url.searchParams.get('thread');
          const thread = await env.DB.prepare(`SELECT * FROM threads WHERE id = ?`).bind(threadId).first();
          const { results } = await env.DB.prepare(`SELECT * FROM posts WHERE thread_id = ? ORDER BY created_at ASC`).bind(threadId).all();
          return new Response(JSON.stringify({ thread, posts: results }), { headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        if (url.pathname === '/api/posts' && request.method === 'POST') {
          const body = await request.json();
          await env.DB.prepare(`INSERT INTO posts (thread_id, author_name, body) VALUES (?, ?, ?)`).bind(body.thread_id, body.author_name || 'guest', body.body).run();
          await env.DB.prepare(`UPDATE threads SET updated_at = unixepoch() WHERE id = ?`).bind(body.thread_id).run();
          return new Response(JSON.stringify({ ok: true }), { status: 201, headers: { ...cors, 'Content-Type': 'application/json' } });
        }
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
      }
    }

    // 🔥 ГЛАВНАЯ СТРАНИЦА (Встроенный HTML)
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const html = `<!DOCTYPE html>
<html lang="ru" data-theme="dark">
<head>
<meta charset="UTF-8">
<title>4OOM — the room that never closed</title>
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/themes.css">
<link rel="stylesheet" href="/assets/css/geocities.css">
</head>
<body class="tile-stars">
<header class="header window">
  <div class="window__bar">
    <span>▣ 4OOM.exe</span>
    <div class="window__buttons">
      <button class="win-btn" data-theme-toggle>◐</button>
      <button class="win-btn" onclick="location.href='settings.html'">⚙</button>
    </div>
  </div>
  <div class="header__body">
    <div class="header__gifs header__gifs--left">
      <img src="/assets/img/gifs/star.gif" class="gif"><img src="/assets/img/gifs/heart.gif" class="gif">
    </div>
    <div class="header__center">
      <h1 class="logo">4OOM</h1>
      <p class="tagline">the room that never closed</p>
      <marquee class="marquee" scrollamount="4">★ добро пожаловать в 4OOM ★</marquee>
    </div>
    <div class="header__gifs header__gifs--right">
      <img src="/assets/img/gifs/email.gif" class="gif"><img src="/assets/img/gifs/rose.gif" class="gif">
    </div>
  </div>
  <nav class="nav">
    <a href="/" class="nav__link nav__link--active">главная</a>
    <a href="?section=general" class="nav__link">general</a>
  </nav>
</header>
<main class="layout">
  <section class="window threads">
    <div class="window__bar"><span>📁 threads/</span></div>
    <ul class="thread-list" id="threadList"><li class="thread"><a href="#"><span class="thread__title">Загрузка...</span></a></li></ul>
  </section>
</main>
<footer class="footer"><p>4OOM © 2024</p></footer>
<script src="/assets/js/api.js"></script>
<script>
(async function () {
  const list = document.getElementById('threadList');
  const threads = await apiGet('/api/threads');
  if (!threads || threads.length === 0) {
    list.innerHTML = '<li class="thread"><a href="#"><span class="thread__title">Пока пусто — создай первый тред!</span></a></li>';
    return;
  }
  list.innerHTML = threads.map(t => \`<li class="thread"><a href="thread.html?id=\${t.id}"><span class="thread__id">#\${t.id}</span><span class="thread__title">\${escapeHtml(t.title)}</span></a></li>\`).join('');
})();
</script>
</body>
</html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // Статика (картинки, css)
    return env.ASSETS.fetch(request);
  },
};
