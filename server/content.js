import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { validateContent } from './validate.js';
const root = process.env.CONTENT_DIR ? resolve(process.env.CONTENT_DIR) : fileURLToPath(new URL('../data/', import.meta.url));
export let course;
export let banks = [];
export const questions = new Map();
export const lessons = new Map();
export const cards = new Map();
let signature = '';

export function refreshContent() {
  const files = [join(root, 'courses/course.json'), ...readdirSync(join(root, 'questions')).filter(name => name.endsWith('.json')).sort().map(name => join(root, 'questions', name))];
  const next = files.map(file => `${file}:${statSync(file).mtimeMs}:${statSync(file).size}`).join('|');
  if (signature === next) return;
  const [newCourse, ...newBanks] = files.map(file => JSON.parse(readFileSync(file, 'utf8')));
  validateContent(newCourse, newBanks);
  course = newCourse;
  banks = newBanks;
  questions.clear(); lessons.clear(); cards.clear();
  for (const bank of banks) for (const q of bank.questions) questions.set(q.id, q);
  for (const lesson of course.lessons) {
    lessons.set(lesson.id, lesson);
    for (const card of lesson.cards) cards.set(card.id, { ...card, lessonId: lesson.id });
  }
  signature = next;
}

export function publicQuestion(question) {
  const { answer, explanation, references, hint, ...safe } = question;
  return { ...safe, options: question.options.map(({ key, text }) => ({ key, text })) };
}

export function catalog() {
  return banks.map(({ questions: items, ...bank }) => ({ ...bank, count: items.length }));
}
