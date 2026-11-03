-- Пользователи (пока заглушка, для OAuth позже)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  github_id INTEGER UNIQUE,
  github_login TEXT,
  display_name TEXT,
  nick_color TEXT DEFAULT '#000080',
  flair TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Разделы
CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL
);

INSERT OR IGNORE INTO sections (slug, title) VALUES
  ('general', 'General'),
  ('webcore', 'Webcore'),
  ('scenecore', 'Scenecore'),
  ('music', 'Music'),
  ('offtopic', 'Offtopic');

-- Треды
CREATE TABLE IF NOT EXISTS threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_slug TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  author_id INTEGER,
  author_name TEXT NOT NULL DEFAULT 'guest',
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Посты
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  author_id INTEGER,
  author_name TEXT NOT NULL DEFAULT 'guest',
  body TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_posts_thread ON posts(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_threads_section ON threads(section_slug, updated_at DESC);
