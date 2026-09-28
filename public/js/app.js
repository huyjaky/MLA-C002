import { state, label, plain, bi, escape, api, bind, icon, mascot, toast } from './shared.js';
import { learningPage, bindLearning, lessonPage, bindLesson, cardsPage, bindCards } from './learn.js';
import { examsPage, bindExams, attemptPage, bindAttempt, stopTimer } from './exams.js';
import { progressPage, bindProgress } from './progress.js';
const app = document.querySelector('#app');
let signedIn = false, renderVersion = 0;

function languageSelect() {
  return `<select id="language" aria-label="Ngôn ngữ / Language"><option value="both" ${state.language === 'both' ? 'selected' : ''}>VI + EN</option><option value="vi" ${state.language === 'vi' ? 'selected' : ''}>Tiếng Việt</option><option value="en" ${state.language === 'en' ? 'selected' : ''}>English</option></select>`;
}
function brand() { return `<a class="brand" href="#learn"><img src="/favicon.svg" alt="" width="38" height="38"><span>cloudlingo<small>AWS ML ACADEMY</small></span></a>`; }
function loginPage() {
  app.innerHTML = `<div class="login-top">${brand()}${languageSelect()}</div><main id="main" class="login-layout"><div class="login-story">${mascot()}<h1>${label('welcome')}</h1><p>${label('intro')}</p><span class="login-badge">AWS · MLA-C02</span></div><form id="login-form" class="login-form"><h2>${label('loginTitle')}</h2><p>${label('loginDesc')}</p><label for="password">${label('password')}</label><input id="password" type="password" autocomplete="current-password" required autofocus><p id="login-error" role="alert"></p><button class="button primary" type="submit">${label('login')}${icon('arrow')}</button><p class="footnote">${label('loginHelp')}</p></form></main>`;
  bindLanguage();
  bind('#login-form', 'submit', async e => {
    e.preventDefault();
    const button = e.target.querySelector('button'); button.disabled = true;
    try { await api('/login', { password: document.querySelector('#password').value }); signedIn = true; await render(); }
    catch (error) { document.querySelector('#login-error').textContent = error.message; }
    finally { button.disabled = false; }
  });
}
function sidebar(active) {
  return `<aside class="sidebar">${brand()}<nav aria-label="Main navigation">${['learn', 'exams', 'cards', 'progress'].map(key => `<a href="#${key}" class="nav-item ${key === active ? 'active' : ''}" ${key === active ? 'aria-current="page"' : ''}>${icon(key)}<span>${label(key)}</span></a>`).join('')}</nav><div class="sidebar-bottom"><div class="sidebar-note">${icon('cloud')}<span>AWS MACHINE LEARNING<small>${escape(state.content.course.exam.code)} · BETA</small></span></div><button class="text-button" id="logout">${label('logout')} ↗</button></div></aside>`;
}
function rail() {
  const course = state.content.course;
  const total = course.lessons.length;
  const complete = state.progress.lessons.length;
  const schedule = new Map(state.progress.cards.map(c => [c.id, c]));
  const due = course.lessons.flatMap(l => l.cards).filter(c => !schedule.has(c.id) || schedule.get(c.id).due <= Date.now()).length;
  return `<aside class="study-rail"><section class="rail-progress"><span class="rail-icon">${icon('star')}</span><h3>${label('readiness')}</h3><div class="big-number">${complete}<span> / ${total}</span></div><p>${label('lessons')} · ${label('completed')}</p><progress max="${total}" value="${complete}"></progress></section><section class="rail-review"><div class="mini-cards">${icon('cards')}</div><h3>${due} ${label('due')}</h3><p>${label('cardsIntro')}</p><a class="button secondary" href="#cards">${label('cards')} →</a></section><section class="daily-tip"><span class="eyebrow">${label('weekly')}</span><p>${label('tip')}</p></section><p class="footnote">${label('unofficial')}</p></aside>`;
}
function bindLanguage() {
  bind('#language', 'change', async e => {
    state.language = e.target.value; localStorage.setItem('language', state.language);
    document.documentElement.lang = state.language === 'en' ? 'en' : 'vi';
    if (signedIn) await render(); else loginPage();
  });
}
async function render() {
  stopTimer();
  if (!signedIn) return loginPage();
  const version = ++renderVersion;
  try {
    const [content, progress] = await Promise.all([api('/content'), api('/progress')]);
    if (version !== renderVersion) return;
    state.content = content; state.progress = progress;
    const [page = 'learn', id] = location.hash.slice(1).split('/');
    const active = page === 'lesson' ? 'learn' : page === 'attempt' ? 'exams' : page;
    const wide = page === 'attempt';
    app.innerHTML = `${sidebar(active)}<div class="workspace"><header class="topbar"><span class="breadcrumb">${label(['learn', 'exams', 'cards', 'progress'].includes(active) ? active : 'learn')}</span><div class="topbar-tools"><span class="cert-tag">${escape(content.course.exam.code)}</span><button id="reload-content" class="icon-button" aria-label="${escape(plain('refresh'))}" title="${escape(plain('refresh'))}">↻</button>${languageSelect()}<a href="#progress" class="avatar" aria-label="${escape(plain('progress'))}">M</a></div></header><div class="content-layout ${wide ? 'wide' : ''}"><main id="main"><div id="page-content" tabindex="-1"></div></main>${wide ? '' : rail()}</div></div>`;
    let html;
    if (page === 'lesson') html = lessonPage(id);
    else if (page === 'cards') html = cardsPage(id);
    else if (page === 'exams') html = examsPage();
    else if (page === 'progress') html = progressPage();
    else if (page === 'attempt') html = await attemptPage(id);
    else html = learningPage();
    if (version !== renderVersion) return;
    document.querySelector('#page-content').innerHTML = html;
    bindLanguage();
    bind('#logout', 'click', async () => { await api('/logout', {}); signedIn = false; stopTimer(); loginPage(); });
    bind('#reload-content', 'click', render);
    if (page === 'lesson') bindLesson(); else if (page === 'cards') bindCards(id); else if (page === 'exams') bindExams(); else if (page === 'attempt') bindAttempt(); else if (page === 'progress') bindProgress(); else bindLearning();
  } catch (error) {
    if (!signedIn) return;
    const target = document.querySelector('#page-content') || app;
    target.innerHTML = `<main class="error-panel"><h2>${label('error')}</h2><p>${escape(error.message)}</p><button class="button primary" id="retry">${label('retry')}</button></main>`;
    bind('#retry', 'click', render);
  }
}
window.addEventListener('hashchange', () => { window.scrollTo(0, 0); render(); });
window.addEventListener('render-page', render);
window.addEventListener('session-expired', () => { signedIn = false; renderVersion++; stopTimer(); loginPage(); });
try {
  const response = await fetch('/i18n.json'); state.labels = await response.json();
  signedIn = (await api('/session')).authenticated;
  await render();
} catch (error) { app.textContent = `Không thể kết nối / Connection failed: ${error.message}`; }
