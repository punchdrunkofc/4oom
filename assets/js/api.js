// Оставляем пустым, так как API находится на том же домене, что и сайт
const API_BASE = ''; 

async function apiGet(path) {
  const r = await fetch(API_BASE + path);
  return r.json();
}

async function apiPost(path, data) {
  const r = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return r.json();
}

// Защита от XSS
function escapeHtml(s) { 
  return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); 
}
