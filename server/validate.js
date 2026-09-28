export function validateContent(course, banks) {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  const bilingual = (value, path) => check(value && typeof value.vi === 'string' && value.vi.trim() && typeof value.en === 'string' && value.en.trim(), `${path}: require nonempty vi/en strings`);
  const ids = new Set();
  const identifier = (id, path) => {
    check(typeof id === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(id), `${path}: invalid id`);
    check(!ids.has(id), `${path}: duplicate id ${id}`);
    ids.add(id);
  };
  check(Array.isArray(course?.lessons) && course.lessons.length, 'course.lessons must not be empty');
  check(course?.exam?.questions > 0 && course?.exam?.minutes > 0, 'course.exam requires questions/minutes');
  const domainIds = new Set((course.domains || []).map(d => d.id));
  const lessonIds = new Set((course.lessons || []).map(l => l.id));
  for (const lesson of course.lessons || []) {
    identifier(lesson.id, 'lesson'); bilingual(lesson.title, `${lesson.id}.title`);
    check(domainIds.has(lesson.domain), `${lesson.id}: invalid domain`);
    check(Array.isArray(lesson.sections) && lesson.sections.length, `${lesson.id}: missing sections`);
    for (const section of lesson.sections || []) {
      bilingual(section.heading, `${lesson.id}.heading`);
      if (section.blocks) {
        check(Array.isArray(section.blocks) && section.blocks.length, `${lesson.id}: blocks must not be empty`);
        for (const block of section.blocks) {
          check(['paragraph','list'].includes(block.type), `${lesson.id}: unknown block type`);
          if (block.type === 'paragraph') bilingual(block.text, `${lesson.id}.block.text`);
          if (block.type === 'list') {
            check(Array.isArray(block.items) && block.items.length, `${lesson.id}: list must not be empty`);
            for (const item of block.items || []) bilingual(item, `${lesson.id}.block.item`);
          }
        }
      } else bilingual(section.text, `${lesson.id}.text`);
    }
    bilingual(lesson.example, `${lesson.id}.example`); bilingual(lesson.trap, `${lesson.id}.trap`);
    for (const card of lesson.cards || []) { identifier(card.id, 'card'); bilingual(card.front, `${card.id}.front`); bilingual(card.back, `${card.id}.back`); }
  }
  check(banks.length > 0, 'At least one question bank is required');
  for (const bank of banks) {
    identifier(bank.id, 'bank'); bilingual(bank.title, `${bank.id}.title`);
    check(Array.isArray(bank.questions) && bank.questions.length, `${bank.id}: empty questions`);
    if (bank.simulation) check(bank.questions.length === course.exam.questions, `${bank.id}: simulation requires ${course.exam.questions} questions`);
    for (const q of bank.questions || []) {
      identifier(q.id, 'question'); bilingual(q.text, `${q.id}.text`);
      check(domainIds.has(q.domain), `${q.id}: invalid domain`);
      check(lessonIds.has(q.lessonId), `${q.id}: unknown lessonId`);
      check(Array.isArray(q.answer) && q.answer.length === q.select && q.select > 0, `${q.id}: answer/select mismatch`);
      const keys = (q.options || []).map(o => o.key);
      check(keys.length >= 4 && new Set(keys).size === keys.length, `${q.id}: need >=4 unique options`);
      check((q.answer || []).every(a => keys.includes(a)) && new Set(q.answer).size === q.answer.length, `${q.id}: invalid answer`);
      bilingual(q.hint, `${q.id}.hint`); bilingual(q.explanation, `${q.id}.explanation`);
      check(Array.isArray(q.references) && q.references.length > 0 && q.references.every(url => /^https:\/\/(docs\.aws\.amazon\.com|aws\.amazon\.com)\//.test(url)), `${q.id}: official references required`);
      for (const option of q.options || []) { bilingual(option.text, `${q.id}.${option.key}.text`); bilingual(option.explanation, `${q.id}.${option.key}.explanation`); }
    }
  }
  if (errors.length) throw Object.assign(new Error(`Content validation failed:\n${errors.join('\n')}`), { status: 503 });
}
