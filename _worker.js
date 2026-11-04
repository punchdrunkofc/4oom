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
    // Для всех остальных запросов отдаем HTML напрямую
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const html = `<!DOCTYPE html>
<html lang="ru" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
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
      <button class="win-btn" data-theme-toggle title="Сменить тему">◐</button>
      <button class="win-btn" title="Настройки" onclick="location.href='settings.html'">⚙</button>
    </div>
  </div>
  <div class="header__body">
    <div class="header__gifs header__gifs--left">
      <img src="/assets/img/gifs/star.gif" alt="★" class="gif">
      <img src="/assets/img/gifs/heart.gif" alt="♥" class="gif">
    </div>
    <div class="header__center">
      <h1 class="logo">4OOM</h1>
      <p class="tagline">the room that never closed</p>
      <marquee class="marquee" scrollamount="4">★ добро пожаловать в 4OOM ★ будь вежлив ★ не спамь ★ приятного общения ★</marquee>
    </div>
    <div class="header__gifs header__gifs--right">
      <img src="/assets/img/gifs/email.gif" alt="✉" class="gif">
      <img src="/assets/img/gifs/rose.gif" alt="🌹" class="gif">
    </div>
  </div>
  <nav class="nav">
    <a href="index.html" class="nav__link nav__link--active">главная</a>
    <a href="index.html?section=general" class="nav__link">general</a>
    <a href="index.html?section=webcore" class="nav__link">webcore</a>
    <a href="index.html?section=scenecore" class="nav__link">scenecore</a>
    <a href="index.html?section=music" class="nav__link">music</a>
    <a href="index.html?section=offtopic" class="nav__link">offtopic</a>
  </nav>
</header>
<main class="layout">
  <section class="window threads">
    <div class="window__bar"><span>📁 threads/</span></div>
    <div class="toolbar">
      <button class="neon-btn">+ новый тред</button>
      <span class="toolbar__info">сейчас играет: <em class="now-playing">Sunny Day Real Estate — Diary</em></span>
    </div>
    <ul class="thread-list" id="threadList">
      <li class="thread"><a href="#"><span class="thread__title">Загрузка...</span></a></li>
    </ul>
  </section>
  <aside class="window profile">
    <div class="window__bar"><span>👤 guest</span></div>
    <div class="profile__body">
      <div class="avatar">?</div>
      <p class="profile__name">guest_4oom</p>
      <p class="profile__status">online · lurker</p>
      <button class="neon-btn neon-btn--small">войти через GitHub</button>
    </div>
    <div class="window__bar"><span>📊 stats</span></div>
    <div class="stats">
      <p>тредов: <b>3</b></p>
      <p>постов: <b>59</b></p>
      <p>онлайн: <b>1</b></p>
    </div>
  </aside>
</main>
<footer class="footer">
  <div class="footer__gifs">
    <img src="/assets/img/gifs/star.gif" alt="★" class="gif">
    <img src="/assets/img/gifs/heart.gif" alt="♥" class="gif">
    <img src="/assets/img/gifs/dino.gif" alt="🦕" class="gif">
  </div>
  <p>4OOM © 2024 · made with ♥ on github + cloudflare</p>
</footer>
<script src="/assets/js/theme.js"></script>
<script src="/assets/js/api.js"></script>
<script>
(async function () {
  const list = document.getElementById('threadList');
  try {
    const threads = await apiGet('/api/threads');
    if (!threads || threads.length === 0) {
      list.innerHTML = '<li class="thread"><a href="#"><span class="thread__title">Пока пусто — создай первый тред!</span></a></li>';
      return;
    }
    list.innerHTML = threads.map(t => `
      <li class="thread">
        <a href="thread.html?id=${t.id}">
          <span class="thread__id">#${String(t.id).padStart(3, '0')}</span>
          <span class="thread__title">${escapeHtml(t.title)}</span>
          <span class="thread__meta">${t.reply_count} ответов · ${t.section_slug}</span>
        </a>
      </li>
    `).join('');
  } catch (e) {
    list.innerHTML = '<li class="thread"><a href="#"><span class="thread__title">Ошибка загрузки тредов</span></a></li>';
  }
})();
</script>
</body>
</html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // Для всех остальных файлов (css, картинки) отдаем статику
    return env.ASSETS.fetch(request);
