import { refreshContent, course, banks } from '../server/content.js';
try {
  refreshContent();
  console.log(`Valid: ${course.lessons.length} lessons; ${course.lessons.flatMap(l => l.cards).length} flashcards; ${banks.length} banks; ${banks.reduce((sum, b) => sum + b.questions.length, 0)} questions.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
