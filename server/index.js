import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { all, one, run } from './db.js';
import { initializeAccount, authenticated, login, logout } from './auth.js';
import { course, cards, lessons, catalog, refreshContent } from './content.js';
import { fail, startAttempt, getAttempt, saveAnswer, checkAnswer, hint, submit, history, activeAttempt } from './exams.js';

initializeAccount();
const root = fileURLToPath(new URL('../public/', import.meta.url));
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };

function json(res, data, status = 200, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(data));
}

async function body(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw fail('JSON required.', 415);
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) throw fail('Request too large.', 413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); }
  catch { throw fail('Invalid JSON.'); }
}

function progress() {
  return { lessons: all('SELECT * FROM lessons'), cards: all('SELECT * FROM cards'), history: history(), active: activeAttempt(), serverNow: Date.now() };
}

async function api(req, res, path) {
  if (req.method === 'GET' && path === '/api/health') return json(res, { ok: true });
  if (!['GET', 'POST'].includes(req.method)) throw fail('Method not allowed.', 405);
  if (req.method === 'POST') {
    const origin = req.headers.origin;
    if (origin && new URL(origin).host !== req.headers.host) throw fail('Origin rejected.', 403);
    if (req.headers['sec-fetch-site'] === 'cross-site') throw fail('Cross-site request rejected.', 403);
  }
  if (path === '/api/session' && req.method === 'GET') return json(res, { authenticated: authenticated(req) });
  if (path === '/api/login' && req.method === 'POST') {
    const result = login(req, (await body(req)).password);
    return result.error ? json(res, { error: result.error }, result.status) : json(res, { ok: true }, 200, { 'Set-Cookie': result.cookie });
  }
  if (!authenticated(req)) throw fail('Sign in to continue. / Đăng nhập để tiếp tục.', 401);
  refreshContent();
  if (req.method === 'GET') {
    if (path === '/api/content') return json(res, { course, banks: catalog() });
    if (path === '/api/progress') return json(res, progress());
    if (path === '/api/export') return json(res, { version: 1, exportedAt: new Date().toISOString(), ...progress() });
    const attempt = /^\/api\/attempts\/([a-f0-9-]+)$/.exec(path);
    if (attempt) return json(res, getAttempt(attempt[1]));
  } else {
    const input = await body(req);
    if (path === '/api/logout') return json(res, { ok: true }, 200, { 'Set-Cookie': logout(req) });
    if (path === '/api/lessons/complete') {
      if (!lessons.has(input.id)) throw fail('Unknown lesson.');
      run('INSERT INTO lessons VALUES(?,?) ON CONFLICT(id) DO NOTHING', input.id, Date.now());
      return json(res, progress());
    }
    if (path === '/api/cards/review') {
      if (!cards.has(input.id) || !['again', 'hard', 'good', 'easy'].includes(input.rating)) throw fail('Invalid flashcard review.');
      const previous = one('SELECT * FROM cards WHERE id=?', input.id);
      const interval = input.rating === 'again' ? 0 : input.rating === 'hard' ? 1 : Math.min(180, Math.max(input.rating === 'easy' ? 4 : 1, Math.round((previous?.interval || 1) * (input.rating === 'easy' ? 3 : 2))));
      const due = Date.now() + (interval ? interval * 86400000 : 600000);
      run('INSERT INTO cards VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET due=excluded.due, interval=excluded.interval, reviews=excluded.reviews', input.id, due, interval, (previous?.reviews || 0) + 1);
      return json(res, progress());
    }
    if (path === '/api/attempts') return json(res, startAttempt(input), 201);
    const action = /^\/api\/attempts\/([a-f0-9-]+)\/(answer|check|hint|submit)$/.exec(path);
    if (action) {
      const [, id, operation] = action;
      const result = operation === 'answer' ? saveAnswer(id, input) : operation === 'check' ? checkAnswer(id, input.questionId) : operation === 'hint' ? hint(id, input.questionId) : submit(id);
      return json(res, result);
    }
  }
  throw fail('Not found.', 404);
}

export const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path.startsWith('/api/')) return await api(req, res, path);
    if (req.method !== 'GET' && req.method !== 'HEAD') throw fail('Method not allowed.', 405);
    const file = resolve(root, `.${decodeURIComponent(path === '/' ? '/index.html' : path)}`);
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) throw fail('Not found.', 404);
    const content = await readFile(file);
    res.writeHead(200, { 'Content-Type': `${mime[extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch (error) {
    const status = error.status || (error.code === 'ENOENT' ? 404 : 500);
    if (status === 500) console.error(error);
    if (!res.headersSent) json(res, { error: status === 500 ? 'Server error. Please try again. / Lỗi máy chủ, vui lòng thử lại.' : error.message }, status);
    else res.end();
  }
});
server.requestTimeout = 30000;
server.headersTimeout = 10000;
server.listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1', () => console.log(`Cloudlingo: http://${process.env.HOST || '127.0.0.1'}:${server.address().port}`));
