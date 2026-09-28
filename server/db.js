import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const directory = resolve(process.env.DATA_DIR || 'runtime');
mkdirSync(directory, { recursive: true });
export const db = new DatabaseSync(resolve(directory, 'learning.sqlite'));
db.exec(`
  PRAGMA journal_mode=WAL;
  PRAGMA foreign_keys=ON;
  PRAGMA busy_timeout=5000;
  CREATE TABLE IF NOT EXISTS account (id INTEGER PRIMARY KEY CHECK(id=1), salt TEXT NOT NULL, hash TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS lessons (id TEXT PRIMARY KEY, completed INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS cards (id TEXT PRIMARY KEY, due INTEGER NOT NULL, interval INTEGER NOT NULL, reviews INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY, mode TEXT NOT NULL, set_id TEXT NOT NULL, started INTEGER NOT NULL, deadline INTEGER, submitted INTEGER, questions TEXT NOT NULL, snapshots TEXT NOT NULL, answers TEXT NOT NULL DEFAULT '{}', flags TEXT NOT NULL DEFAULT '[]', checked TEXT NOT NULL DEFAULT '[]');
`);

export const all = (sql, ...params) => db.prepare(sql).all(...params);
export const one = (sql, ...params) => db.prepare(sql).get(...params);
export const run = (sql, ...params) => db.prepare(sql).run(...params);
