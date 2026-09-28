import { state, bi, label, plain, escape, api, bind, go, refs, icon, mascot, rich } from './shared.js';

export function learningPage() {
  const { course } = state.content;
  const completed = new Set(state.progress.lessons.map(l => l.id));
  const next = course.lessons.find(l => !completed.has(l.id)) || course.lessons[0];
  return `<div class="eyebrow">AWS MACHINE LEARNING · ${escape(course.exam.code)}</div>
    <section class="welcome"><div><h1>${label('welcome')}</h1><p>${label('intro')}</p><a class="button primary" href="#lesson/${next.id}">${label('continue')}${icon('arrow')}</a></div>${mascot()}</section>
    <div class="section-heading"><h2>${label('path')}</h2><span class="muted">${completed.size}/${course.lessons.length} ${label('lessons')}</span></div>
    <label class="search"><span aria-hidden="true">⌕</span><input id="search" type="search" placeholder="${escape(plain('search'))}" aria-label="${escape(plain('search'))}"></label>
    <div id="lesson-list">${lessonList('')}</div>`;
}

function lessonList(query) {
  const { course } = state.content;
  const completed = new Set(state.progress.lessons.map(l => l.id));
  const visible = course.lessons.filter(l => JSON.stringify(l).toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  if (!visible.length) return `<p class="empty">${label('noMatches')}</p>`;
  return course.domains.map(domain => {
    const lessons = visible.filter(l => l.domain === domain.id);
    if (!lessons.length) return '';
    const count = course.lessons.filter(l => l.domain === domain.id && completed.has(l.id)).length;
    return `<section class="unit"><div class="unit-header"><div><span class="eyebrow">DOMAIN ${domain.id} · ${domain.weight}%</span><h3>${bi(domain.title)}</h3></div><span class="unit-icon">${icon(['', 'cloud', 'star', 'exams', 'check'][domain.id])}</span></div>
      ${lessons.map((lesson, index) => `<a class="lesson-row ${completed.has(lesson.id) ? 'is-complete' : ''}" href="#lesson/${lesson.id}"><span class="lesson-number">${completed.has(lesson.id) ? icon('check') : String(index + 1).padStart(2, '0')}</span><div><h4>${bi(lesson.title)}</h4><span class="muted meta">${lesson.minutes} ${label('minutes')} · ${lesson.cards.length} flashcards</span></div><span class="row-arrow">${icon('arrow')}</span></a>`).join('')}
      <div class="unit-footer"><progress max="${course.lessons.filter(l => l.domain === domain.id).length}" value="${count}" aria-label="${escape(plain('progress'))}"></progress></div></section>`;
  }).join('');
}

export function bindLearning() { bind('#search', 'input', e => { document.querySelector('#lesson-list').innerHTML = lessonList(e.target.value); }); }

export function lessonPage(id) {
  const lesson = state.content.course.lessons.find(l => l.id === id);
  if (!lesson) return `<p>${label('noMatches')}</p>`;
  const complete = state.progress.lessons.some(l => l.id === id);
  return `<a class="back" href="#learn">← ${label('path')}</a><div class="eyebrow">DOMAIN ${lesson.domain} · ${lesson.minutes} ${plain('minutes')}</div><h1 class="lesson-title">${bi(lesson.title)}</h1>
  <div class="lesson-reading">${lesson.sections.map((section, i) => `<section><span class="section-number">${String(i + 1).padStart(2, '0')}</span><h2>${bi(section.heading)}</h2>${section.blocks ? rich(section.blocks) : bi(section.text, 'p')}</section>`).join('')}
  <aside class="callout green"><h3>${label('example')}</h3>${bi(lesson.example, 'p')}</aside><aside class="callout amber"><h3>${label('trap')}</h3>${bi(lesson.trap, 'p')}</aside>
  <section class="recall"><h2>${label('recall')}</h2>${lesson.cards.map(card => `<details><summary>${bi(card.front)}</summary><div>${bi(card.back, 'p')}</div></details>`).join('')}</section>
  ${refs(lesson.references)}<div class="lesson-actions"><button id="complete-lesson" data-id="${id}" class="button primary" ${complete ? 'disabled' : ''}>${icon('check')}${label(complete ? 'completed' : 'complete')}</button><a class="button secondary" href="#cards/${id}">${label('cards')}</a></div></div>`;
}

export function bindLesson() {
  bind('#complete-lesson', 'click', async (_, button) => {
    button.disabled = true;
    try { state.progress = await api('/lessons/complete', { id: button.dataset.id }); window.dispatchEvent(new Event('render-page')); }
    finally { button.disabled = false; }
  });
}

let queue = [], current = 0, revealed = false;
export function cardsPage(lessonId, all = false) {
  const schedule = new Map(state.progress.cards.map(c => [c.id, c]));
  queue = state.content.course.lessons.filter(l => !lessonId || l.id === lessonId).flatMap(l => l.cards.map(c => ({ ...c, lessonId: l.id })));
  if (!all) queue = queue.filter(c => !schedule.has(c.id) || schedule.get(c.id).due <= Date.now());
  current = 0; revealed = false;
  return `<div class="eyebrow">ACTIVE RECALL · SPACED REPETITION</div><h1>${label('cards')}</h1><p class="lede">${label('cardsIntro')}</p><div class="tabs"><button id="due-cards" class="${!all ? 'active' : ''}">${label('dueCards')}</button><button id="all-cards" class="${all ? 'active' : ''}">${label('allCards')}</button></div><div id="card-stage">${cardStage()}</div>`;
}
function cardStage() {
  const card = queue[current];
  if (!card) return `<div class="empty celebration">${mascot()}<h2>${label('cardsDone')}</h2><a class="button primary" href="#learn">${label('continue')}</a></div>`;
  return `<div class="card-counter">${current + 1} / ${queue.length}</div><div class="flashcard"><span class="eyebrow">${revealed ? plain('answers') : plain('recall')}</span><h2>${bi(card.front)}</h2>${revealed ? `<div class="card-answer">${bi(card.back, 'p')}</div>` : `<button class="button primary" id="reveal-card">${label('reveal')}</button>`}</div>${revealed ? `<div class="rating-row">${['again', 'hard', 'good', 'easy'].map(rating => `<button class="button ${rating === 'good' ? 'primary' : 'secondary'}" data-rating="${rating}">${label(rating)}</button>`).join('')}</div>` : ''}<a class="back" href="#lesson/${card.lessonId}">${label('lessonLink')} ↗</a>`;
}
export function bindCards(lessonId) {
  bind('#due-cards', 'click', () => { document.querySelector('#page-content').innerHTML = cardsPage(lessonId, false); bindCards(lessonId); });
  bind('#all-cards', 'click', () => { document.querySelector('#page-content').innerHTML = cardsPage(lessonId, true); bindCards(lessonId); });
  bindCardStage();
}
function bindCardStage() {
  bind('#reveal-card', 'click', () => { revealed = true; document.querySelector('#card-stage').innerHTML = cardStage(); bindCardStage(); });
  bind('[data-rating]', 'click', async (_, button) => {
    document.querySelectorAll('[data-rating]').forEach(b => b.disabled = true);
    try {
      state.progress = await api('/cards/review', { id: queue[current].id, rating: button.dataset.rating });
      current++; revealed = false;
      document.querySelector('#card-stage').innerHTML = cardStage(); bindCardStage();
    } catch (error) { document.querySelectorAll('[data-rating]').forEach(b => b.disabled = false); throw error; }
  });
}
