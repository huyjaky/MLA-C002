import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { one, run } from './db.js';

const digest = value => createHash('sha256').update(value).digest('hex');
const failures = new Map();
const lifetime = 7 * 24 * 60 * 60 * 1000;

export function initializeAccount() {
  if (one('SELECT id FROM account WHERE id=1')) return;
  const password = process.env.APP_PASSWORD || randomBytes(18).toString('base64url');
  if (password.length < 12) throw new Error('APP_PASSWORD must contain at least 12 characters.');
  const salt = randomBytes(16).toString('hex');
  run('INSERT INTO account VALUES(1,?,?)', salt, scryptSync(password, salt, 64).toString('hex'));
  if (!process.env.APP_PASSWORD) console.log(`Personal account password (save it): ${password}`);
}

function sessionToken(req) {
  return /(?:^|;\s*)session=([A-Za-z0-9_-]+)/.exec(req.headers.cookie || '')?.[1];
}

export function authenticated(req) {
  const token = sessionToken(req);
  return !!token && !!one('SELECT token FROM sessions WHERE token=? AND expires>?', digest(token), Date.now());
}

export function login(req, password) {
  const address = req.socket.remoteAddress;
  const now = Date.now();
  for (const [key, value] of failures) if (value.until < now) failures.delete(key);
  const failure = failures.get(address) || { count: 0, until: now + 15 * 60 * 1000 };
  if (failure.count >= 10) return { status: 429, error: 'Too many attempts. Try again in 15 minutes. / Thử lại sau 15 phút.' };
  const account = one('SELECT * FROM account WHERE id=1');
  const valid = typeof password === 'string' && password.length <= 1024 && timingSafeEqual(scryptSync(password, account.salt, 64), Buffer.from(account.hash, 'hex'));
  if (!valid) {
    failure.count++;
    failures.set(address, failure);
    return { status: 401, error: 'Incorrect password. / Mật khẩu không đúng.' };
  }
  failures.delete(address);
  run('DELETE FROM sessions WHERE expires<?', now);
  const token = randomBytes(32).toString('base64url');
  run('INSERT INTO sessions VALUES(?,?)', digest(token), now + lifetime);
  return { cookie: cookie(token, lifetime / 1000) };
}

function cookie(token, age) {
  return `session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''}`;
}

export function logout(req) {
  const token = sessionToken(req);
  if (token) run('DELETE FROM sessions WHERE token=?', digest(token));
  return cookie('', 0);
}
