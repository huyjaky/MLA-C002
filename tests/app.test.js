import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { once } from 'node:events';
import { validateContent } from '../server/validate.js';

test('personal learning workflow, grading, expiry, persistence and JSON reload', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'cloudlingo-test-'));
  const content = join(directory, 'content');
  mkdirSync(join(content, 'courses'), { recursive: true }); mkdirSync(join(content, 'questions'));
  const course = JSON.parse(readFileSync(new URL('../data/courses/course.json', import.meta.url)));
  const source = JSON.parse(readFileSync(new URL('../data/questions/source-qa.json', import.meta.url)));
  const bank = { id: 'test-exam', title: { vi: 'Đề kiểm thử', en: 'Test exam' }, simulation: true, questions: Array.from({ length: 85 }, (_, i) => ({ ...structuredClone(source.questions[0]), id: `test-q-${i}` })) };
  writeFileSync(join(content, 'courses/course.json'), JSON.stringify(course));
  writeFileSync(join(content, 'questions/test.json'), JSON.stringify(bank));
  const password = 'test-only-password-123456';
  let child, port, cookie = '';
  async function start() {
    child = spawn(process.execPath, ['server/index.js'], { cwd: new URL('..', import.meta.url), env: { ...process.env, APP_PASSWORD: password, DATA_DIR: directory, CONTENT_DIR: content, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
    await new Promise((resolve, reject) => {
      let log = '';
      const timeout = setTimeout(() => reject(new Error('Server did not start: ' + log)), 10000);
      child.stdout.on('data', chunk => { log += chunk; const match = /Cloudlingo: http:\/\/[^:]+:(\d+)/.exec(log); if (match) { port = Number(match[1]); clearTimeout(timeout); resolve(); } });
      child.stderr.on('data', chunk => { log += chunk; });
      child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}: ${log}`)); });
    });
  }
  async function stop() { const exited = once(child, 'exit'); child.kill(); await exited; }
  async function request(path, data, expected = 200, headers = {}) {
    const response = await fetch(`http://127.0.0.1:${port}/api${path}`, { method: data === undefined ? 'GET' : 'POST', headers: { Cookie: cookie, ...(data === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers }, body: data === undefined ? undefined : JSON.stringify(data) });
    const body = await response.json();
    assert.equal(response.status, expected, JSON.stringify(body));
    return { body, response };
  }
  try {
    await start();
    await request('/content', undefined, 401);
    await request('/login', { password: 'bad' }, 401);
    const logged = await request('/login', { password }); cookie = logged.response.headers.get('set-cookie').split(';')[0];
    assert.match(logged.response.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
    await request('/lessons/complete', { id: course.lessons[0].id }, 403, { Origin: 'https://evil.invalid' });
    let progress = (await request('/lessons/complete', { id: course.lessons[0].id })).body;
    assert.equal(progress.lessons.length, 1);
    progress = (await request('/cards/review', { id: course.lessons[0].cards[0].id, rating: 'good' })).body;
    assert.equal(progress.cards[0].reviews, 1); assert.ok(progress.cards[0].due > Date.now());
    let active = (await request('/attempts', { setId: bank.id, mode: 'practice', limit: 10 }, 201)).body;
    assert.equal(active.questions.length, 10);
    assert.equal(active.questions[0].answer, undefined); assert.equal(active.snapshots, undefined); assert.equal(active.questions[0].options[0].explanation, undefined);
    await request('/attempts', { setId: bank.id, mode: 'exam' }, 409);
    const qid = active.questions[0].id;
    await request(`/attempts/${active.id}/answer`, { questionId: qid, selected: ['B'] });
    await request(`/attempts/${active.id}/check`, { questionId: qid }, 400);
    await request(`/attempts/${active.id}/answer`, { questionId: qid, selected: ['B','E'] });
    active = (await request(`/attempts/${active.id}/check`, { questionId: qid })).body;
    assert.equal(active.review[qid].correct, true);
    await request(`/attempts/${active.id}/answer`, { questionId: qid, selected: ['A','C'] }, 400);
    active = (await request(`/attempts/${active.id}/submit`, {})).body;
    assert.equal(active.result.correct, 1); assert.equal(active.result.total, 10);
    let exam = (await request('/attempts', { setId: bank.id, mode: 'exam' }, 201)).body;
    assert.equal(exam.deadline - exam.started, 170 * 60 * 1000);
    await request(`/attempts/${exam.id}/hint`, { questionId: exam.questions[0].id }, 400);
    await request(`/attempts/${exam.id}/check`, { questionId: exam.questions[0].id }, 400);
    await request(`/attempts/${exam.id}/answer`, { questionId: exam.questions[0].id, selected: ['B'] });
    bank.questions[0].text.vi = 'Nội dung JSON đã đổi';
    writeFileSync(join(content, 'questions/test.json'), JSON.stringify(bank));
    await request('/content');
    exam = (await request(`/attempts/${exam.id}`)).body;
    assert.notEqual(exam.questions[0].text.vi, bank.questions[0].text.vi, 'Active attempt keeps its original snapshot');
    await stop(); await start();
    exam = (await request(`/attempts/${exam.id}`)).body;
    assert.deepEqual(exam.answers[exam.questions[0].id], ['B']);
    const database = new DatabaseSync(join(directory, 'learning.sqlite'));
    database.prepare('UPDATE attempts SET deadline=? WHERE id=?').run(Date.now() - 1000, exam.id); database.close();
    exam = (await request(`/attempts/${exam.id}/answer`, { questionId: exam.questions[0].id, selected: ['B','E'] })).body;
    assert.ok(exam.submitted); assert.equal(exam.result.correct, 0, 'Partial multi-select receives no credit; late answers are ignored');
    const extra = structuredClone(bank); extra.id = 'added-bank'; extra.questions.forEach(q => q.id = 'added-' + q.id);
    writeFileSync(join(content, 'questions/added.json'), JSON.stringify(extra));
    assert.equal((await request('/content')).body.banks.length, 2, 'New JSON banks are discovered without restart');
    const invalid = structuredClone(bank); invalid.questions[0].answer = ['Z'];
    assert.throws(() => validateContent(course, [invalid]), /invalid answer/);
    await request('/logout', {}); await request('/progress', undefined, 401);
  } finally {
    if (child?.exitCode === null) await stop();
    // Only the exact directory returned by mkdtemp is removed.
    assert.ok(directory.startsWith(join(tmpdir(), 'cloudlingo-test-')));
    rmSync(directory, { recursive: true, force: true });
  }
});
