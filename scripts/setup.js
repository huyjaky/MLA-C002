import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (existsSync('.env')) console.log('.env already exists; left unchanged.');
else {
  writeFileSync('.env', `APP_PASSWORD=${randomBytes(24).toString('base64url')}\nCOOKIE_SECURE=false\n`, { mode: 0o600 });
  console.log('Created .env with a random personal password. Read .env locally to sign in. Do not commit this file.');
}
