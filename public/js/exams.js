import { state, bi, label, plain, words, escape, api, bind, go, refs, icon, toast } from './shared.js';
let mode = 'practice', attempt, index = 0, timer, busy = false, offset = 0;
export function stopTimer() { clearInterval(timer); }

export function examsPage() {
  const { banks, course } = state.content;
  return `<div class="eyebrow">${escape(course.exam.code)} · ${escape(course.exam.format.toUpperCase())}</div><h1>${label('exams')}</h1><p class="lede">${label('examIntro')}</p>
  ${state.progress.active && !state.progress.active.submitted ? `<aside class="callout green"><p>${label('activeNotice')}</p><a class="button primary" href="#attempt/${state.progress.active.id}">${label('resume')}</a></aside>` : ''}
  <div class="mode-picker">${['practice', 'exam'].map(value => `<button data-mode="${value}" class="mode ${value === mode ? 'selected' : ''}" aria-pressed="${value === mode}"><span class="mode-icon">${icon(value === 'practice' ? 'learn' : 'exams')}</span><strong>${label(value === 'practice' ? 'practice' : 'simulation')}</strong><p>${label(value === 'practice' ? 'practiceDesc' : 'examDesc')}</p>${value === 'exam' ? `<span class="mode-meta">${course.exam.questions} ${plain('questions')} · ${course.exam.minutes} ${plain('minutes')}</span>` : ''}</button>`).join('')}</div>
  ${mode === 'practice' ? `<div class="practice-filters"><label>${label('domain')}<select id="domain-filter"><option value="">${plain('allDomains')}</option>${course.domains.map(d => `<option value="${d.id}">${escape(words(d.title))}</option>`).join('')}</select></label><label>${label('chooseCount')}<select id="count-filter"><option value="0">${plain('allQuestions')}</option><option value="10">10</option><option value="20">20</option></select></label><label class="checkbox-line"><input id="wrong-filter" type="checkbox">${label('wrongOnly')}</label></div>` : ''}
  <div class="exam-list">${banks.filter(b => mode !== 'exam' || b.simulation).map((bank, i) => `<article class="exam-bank"><div class="bank-number">${String(i + 1).padStart(2, '0')}</div><div class="bank-info"><h2>${bi(bank.title)}</h2><p>${bi(bank.description)}</p><span class="meta">${bank.count} ${label('questions')} ${bank.simulation ? `· ${label('coverage')}` : ''}</span></div><button class="button ${i === 0 ? 'primary' : 'secondary'}" data-start="${bank.id}">${label(mode === 'practice' ? 'beginPractice' : 'beginExam')}${icon('arrow')}</button></article>`).join('')}</div><p class="footnote">${label('unofficial')}</p>`;
}

export function bindExams() {
  bind('[data-mode]', 'click', (_, button) => { mode = button.dataset.mode; document.querySelector('#page-content').innerHTML = examsPage(); bindExams(); });
  bind('[data-start]', 'click', async (_, button) => {
    button.disabled = true;
    try {
      const input = { mode, setId: button.dataset.start };
      if (mode === 'practice') {
        input.domain = document.querySelector('#domain-filter').value;
        input.limit = Number(document.querySelector('#count-filter').value);
        input.wrongOnly = document.querySelector('#wrong-filter').checked;
      }
      const created = await api('/attempts', input);
      go(`attempt/${created.id}`);
    } finally { button.disabled = false; }
  });
}

export async function attemptPage(id) {
  if (attempt?.id !== id) index = 0;
  attempt = await api(`/attempts/${id}`);
  offset = attempt.serverNow - Date.now();
  index = Math.min(index, attempt.questions.length - 1);
  return renderAttempt();
}

function renderAttempt() {
  const question = attempt.questions[index];
  const selected = attempt.answers[question.id] || [];
  const review = attempt.review[question.id];
  const answered = Object.values(attempt.answers).filter(a => a.length).length;
  return `<a class="back" href="#exams">← ${label('exams')}</a>
    ${attempt.result ? resultPanel() : `<div class="attempt-top"><span class="eyebrow">${plain(attempt.mode === 'exam' ? 'simulation' : 'practice')}</span><span class="timer" aria-label="${escape(plain('timer'))}" id="exam-timer"></span></div>`}
    <div class="exam-layout"><div class="question-area"><div class="question-meta"><span>${index + 1} / ${attempt.questions.length}</span><span>${label('select')} ${question.select} ${label('answers')}</span></div>
    <progress class="exam-progress" max="${attempt.questions.length}" value="${answered}" aria-label="${escape(plain('progress'))}"></progress>
    <h1 class="question-title">${bi(question.text)}</h1>
    ${question.editorialNote && review ? `<aside class="callout amber"><h3>${label('reviewNotice')}</h3>${bi(question.editorialNote, 'p')}</aside>` : ''}
    <fieldset class="options" ${attempt.submitted || review ? 'disabled' : ''}><legend class="sr-only">${plain('select')} ${question.select} ${plain('answers')}</legend>${question.options.map(option => `<label class="option ${selected.includes(option.key) ? 'chosen' : ''} ${review?.answer.includes(option.key) ? 'correct-option' : ''} ${review && selected.includes(option.key) && !review.answer.includes(option.key) ? 'wrong-option' : ''}"><input type="${question.select > 1 ? 'checkbox' : 'radio'}" name="answer" value="${option.key}" ${selected.includes(option.key) ? 'checked' : ''}><span class="option-key">${option.key}</span><span class="option-text">${bi(option.text)}</span>${review?.answer.includes(option.key) ? icon('check') : ''}</label>`).join('')}</fieldset>
    <div class="question-tools">${!attempt.submitted ? `<button class="text-button" id="flag-question">${attempt.flags.includes(question.id) ? '⚑' : '⚐'} ${label(attempt.flags.includes(question.id) ? 'flagged' : 'flag')}</button>` : ''}<span id="save-status" class="muted">${label('saved')}</span>${attempt.mode === 'practice' && !review && !attempt.submitted ? `<button class="text-button" id="show-hint">${label('hint')} ?</button>` : ''}</div><div id="hint-area"></div>
    ${review ? feedbackPanel(review) : ''}
    <div class="question-actions"><button class="button secondary" id="previous-question" ${index === 0 ? 'disabled' : ''}>← ${label('previous')}</button>${attempt.mode === 'practice' && !review && !attempt.submitted ? `<button class="button primary" id="check-answer" ${selected.length !== question.select ? 'disabled' : ''}>${label('check')}</button>` : ''}<button class="button ${review ? 'primary' : 'secondary'}" id="next-question" ${index === attempt.questions.length - 1 ? 'disabled' : ''}>${label('next')} →</button></div></div>
    <aside class="question-nav"><h3>${label('navQuestions')}</h3><div class="question-grid">${attempt.questions.map((q, i) => `<button data-question-index="${i}" class="${i === index ? 'current' : ''} ${(attempt.answers[q.id] || []).length ? 'answered' : ''} ${attempt.flags.includes(q.id) ? 'flag-mark' : ''}" aria-label="${i + 1}${attempt.flags.includes(q.id) ? ` ${plain('flagged')}` : ''}" ${i === index ? 'aria-current="true"' : ''}>${i + 1}</button>`).join('')}</div><p class="muted">${answered}/${attempt.questions.length} ${label('saved')}</p>${!attempt.submitted ? `<button id="submit-attempt" class="button primary">${label('submit')}</button>` : ''}</aside></div>`;
}

function resultPanel() {
  const result = attempt.result;
  return `<section class="result-panel"><div class="score-circle">${Math.round(result.correct / result.total * 100)}<small>%</small></div><div><h2>${label('results')}</h2><p>${result.correct} / ${result.total} ${label('correct')}</p><p class="footnote">${label('scoreNote')}</p></div></section><div class="domain-scores">${result.domains.map(d => `<div><strong>${bi(state.content.course.domains.find(item => item.id === d.domain)?.title || { vi: `Miền ${d.domain}`, en: `Domain ${d.domain}` })}</strong><span>${d.correct}/${d.total}</span><progress max="${d.total || 1}" value="${d.correct}"></progress></div>`).join('')}</div>`;
}

function feedbackPanel(review) {
  return `<section class="feedback ${review.correct ? 'positive' : 'negative'}"><h2>${label(review.correct ? 'correct' : 'incorrect')}</h2><p class="answer-key">${label('answers')}: ${review.answer.join(', ')}</p>${bi(review.explanation, 'p')}<div class="option-reasons">${review.options.map(o => `<details><summary><strong>${o.key}</strong> ${bi(o.text)}</summary>${bi(o.explanation, 'p')}</details>`).join('')}</div><a class="text-link" href="#lesson/${review.lessonId}">${label('lessonLink')} ↗</a>${refs(review.references)}</section>`;
}

function refresh() {
  document.querySelector('#page-content').innerHTML = renderAttempt();
  bindAttempt();
}
async function mutate(operation, input = {}) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('.question-area button,.question-area input,.question-nav button').forEach(b => b.disabled = true);
  try { attempt = await api(`/attempts/${attempt.id}/${operation}`, input); }
  finally { busy = false; refresh(); }
}

export function bindAttempt() {
  stopTimer();
  const question = attempt.questions[index];
  bind('.option input', 'change', async () => {
    const selected = [...document.querySelectorAll('.option input:checked')].map(input => input.value);
    if (selected.length > question.select) { toast(`${plain('select')} ${question.select} ${plain('answers')}`); refresh(); return; }
    await mutate('answer', { questionId: question.id, selected });
  });
  bind('#flag-question', 'click', () => mutate('answer', { questionId: question.id, flags: attempt.flags.includes(question.id) ? attempt.flags.filter(id => id !== question.id) : [...attempt.flags, question.id] }));
  bind('#check-answer', 'click', () => mutate('check', { questionId: question.id }));
  bind('#show-hint', 'click', async () => { const hint = await api(`/attempts/${attempt.id}/hint`, { questionId: question.id }); document.querySelector('#hint-area').innerHTML = `<aside class="callout blue">${bi(hint, 'p')}</aside>`; });
  bind('#previous-question', 'click', () => { index--; refresh(); });
  bind('#next-question', 'click', () => { index++; refresh(); document.querySelector('.question-title').scrollIntoView({ block: 'start' }); });
  bind('[data-question-index]', 'click', (_, button) => { index = Number(button.dataset.questionIndex); refresh(); });
  bind('#submit-attempt', 'click', async () => {
    const remaining = attempt.questions.filter(q => (attempt.answers[q.id] || []).length !== q.select).length;
    if (confirm(`${plain('submitConfirm')}\n${remaining} ${plain('unanswered')}`)) await mutate('submit');
  });
  if (attempt.deadline && !attempt.submitted) {
    const tick = async () => {
      const seconds = Math.max(0, Math.ceil((attempt.deadline - Date.now() - offset) / 1000));
      const display = document.querySelector('#exam-timer');
      if (display) display.textContent = `${Math.floor(seconds / 3600).toString().padStart(2, '0')}:${Math.floor(seconds / 60 % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
      if (seconds === 0 && !busy) {
        stopTimer();
        try { await mutate('submit'); } catch (error) { toast(error.message); }
      }
    };
    timer = setInterval(tick, 1000); tick();
  }
}
