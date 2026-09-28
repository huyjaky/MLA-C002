import { randomUUID } from 'node:crypto';
import { all, one, run } from './db.js';
import { banks, course, publicQuestion } from './content.js';

export const fail = (message, status = 400) => Object.assign(new Error(message), { status });
export const matches = (selected, correct) => selected.length === correct.length && correct.every(key => selected.includes(key));

export function startAttempt(input) {
  if (!['practice', 'exam'].includes(input.mode)) throw fail('Invalid mode. / Chế độ không hợp lệ.');
  const bank = banks.find(item => item.id === input.setId);
  if (!bank) throw fail('Unknown exam. / Không tìm thấy bộ đề.');
  if (input.mode === 'exam' && (!bank.simulation || bank.questions.length !== course.exam.questions)) throw fail('This bank is for practice only. / Bộ này chỉ dành cho luyện tập.');
  const active = one('SELECT id FROM attempts WHERE submitted IS NULL');
  if (active) throw fail('Resume or submit the active attempt first. / Hãy tiếp tục hoặc nộp bài đang làm.', 409);
  let selected = bank.questions;
  if (input.mode === 'practice') {
    if (input.domain) selected = selected.filter(q => q.domain === Number(input.domain));
    if (input.lessonId) selected = selected.filter(q => q.lessonId === input.lessonId);
    if (input.wrongOnly) {
      const wrong = new Set(history().flatMap(attempt => attempt.wrongIds));
      selected = selected.filter(q => wrong.has(q.id));
    }
    if (input.limit) {
      if (![10, 20, 85].includes(input.limit)) throw fail('Invalid question limit.');
      selected = selected.slice(0, input.limit);
    }
  }
  if (!selected.length) throw fail('No questions match this selection. / Không có câu phù hợp.');
  const id = randomUUID();
  const now = Date.now();
  run('INSERT INTO attempts(id,mode,set_id,started,deadline,questions,snapshots) VALUES(?,?,?,?,?,?,?)', id, input.mode, bank.id, now, input.mode === 'exam' ? now + course.exam.minutes * 60 * 1000 : null, JSON.stringify(selected.map(q => q.id)), JSON.stringify(selected));
  return getAttempt(id);
}

function load(id) {
  const row = one('SELECT * FROM attempts WHERE id=?', id);
  if (!row) throw fail('Attempt not found. / Không tìm thấy bài làm.', 404);
  if (!row.submitted && row.deadline && Date.now() >= row.deadline) {
    row.submitted = row.deadline;
    run('UPDATE attempts SET submitted=? WHERE id=?', row.submitted, id);
  }
  return { ...row, snapshots: JSON.parse(row.snapshots), questions: JSON.parse(row.questions), answers: JSON.parse(row.answers), flags: JSON.parse(row.flags), checked: JSON.parse(row.checked) };
}

function feedback(q, selected = []) {
  return { correct: matches(selected, q.answer), answer: q.answer, explanation: q.explanation, options: q.options, references: q.references, lessonId: q.lessonId };
}

export function getAttempt(id) {
  const row = load(id);
  const { snapshots: items, ...safeRow } = row;
  const review = {};
  for (const q of items) if (row.submitted || row.checked.includes(q.id)) review[q.id] = feedback(q, row.answers[q.id]);
  return { ...safeRow, questions: items.map(publicQuestion), review, serverNow: Date.now(), result: row.submitted ? result(row) : null };
}

export function saveAnswer(id, input) {
  const row = load(id);
  if (row.submitted) return getAttempt(id);
  if (!row.questions.includes(input.questionId)) throw fail('Unknown question.');
  if (input.flags !== undefined) {
    if (!Array.isArray(input.flags) || input.flags.some(key => !row.questions.includes(key))) throw fail('Invalid flags.');
    run('UPDATE attempts SET flags=? WHERE id=?', JSON.stringify([...new Set(input.flags)]), id);
  }
  if (input.selected !== undefined) {
    const q = row.snapshots.find(q => q.id === input.questionId);
    if (!Array.isArray(input.selected) || input.selected.some(key => !q.options.some(option => option.key === key)) || new Set(input.selected).size !== input.selected.length || input.selected.length > q.select) throw fail('Invalid selection. / Lựa chọn không hợp lệ.');
    if (row.checked.includes(q.id)) throw fail('This answer is already checked. / Câu này đã được chấm.');
    row.answers[q.id] = input.selected;
    run('UPDATE attempts SET answers=? WHERE id=?', JSON.stringify(row.answers), id);
  }
  return getAttempt(id);
}

export function checkAnswer(id, questionId) {
  const row = load(id);
  if (row.mode !== 'practice' || row.submitted) throw fail('Checking is available only during practice.');
  if (!row.questions.includes(questionId)) throw fail('Unknown question.');
  const q = row.snapshots.find(q => q.id === questionId);
  if ((row.answers[questionId] || []).length !== q.select) throw fail(`Select ${q.select} answer(s). / Chọn ${q.select} đáp án.`);
  run('UPDATE attempts SET checked=? WHERE id=?', JSON.stringify([...new Set([...row.checked, questionId])]), id);
  return getAttempt(id);
}

export function hint(id, questionId) {
  const row = load(id);
  if (row.mode !== 'practice' || !row.questions.includes(questionId)) throw fail('Hints are available only during practice.');
  return row.snapshots.find(q => q.id === questionId).hint;
}

export function submit(id) {
  const row = load(id);
  if (!row.submitted) run('UPDATE attempts SET submitted=? WHERE id=?', Date.now(), id);
  return getAttempt(id);
}

function result(row) {
  const domains = [...new Set(row.snapshots.map(q => q.domain))].sort().map(domain => ({ domain, correct: 0, total: 0 }));
  const wrongIds = [];
  for (const id of row.questions) {
    const q = row.snapshots.find(q => q.id === id);
    const correct = matches(row.answers[id] || [], q.answer);
    const group = domains.find(d => d.domain === q.domain);
    group.total++;
    if (correct) group.correct++;
    else wrongIds.push(id);
  }
  return { correct: row.questions.length - wrongIds.length, total: row.questions.length, domains, wrongIds };
}

export function history() {
  return all('SELECT id FROM attempts WHERE submitted IS NOT NULL ORDER BY submitted DESC').map(({ id }) => {
    const row = load(id);
    return { id, mode: row.mode, setId: row.set_id, started: row.started, submitted: row.submitted, ...result(row) };
  });
}

export function activeAttempt() {
  const row = one('SELECT id FROM attempts WHERE submitted IS NULL');
  return row ? getAttempt(row.id) : null;
}
