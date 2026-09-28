import { state, bi, label, escape, api, bind, icon } from './shared.js';
export function progressPage() {
  const { course } = state.content;
  const progress = state.progress;
  return `<div class="eyebrow">KEEP GROWING</div><h1>${label('progress')}</h1><p class="lede">${label('progressIntro')}</p><div class="stat-grid"><div><strong>${progress.lessons.length}<small>/${course.lessons.length}</small></strong>${label('lessons')}</div><div><strong>${progress.cards.length}<small>/${course.lessons.flatMap(l => l.cards).length}</small></strong>${label('cards')}</div><div><strong>${progress.history.length}</strong>${label('history')}</div></div><h2>${label('history')}</h2>${progress.history.length ? `<div class="history-list">${progress.history.map(item => `<a href="#attempt/${item.id}" class="history-row"><span class="history-icon">${icon('exams')}</span><div><strong>${bi(state.content.banks.find(b => b.id === item.setId)?.title || item.setId)}</strong><span class="meta">${new Date(item.submitted).toLocaleString(state.language === 'en' ? 'en-US' : 'vi-VN')} · ${label(item.mode === 'exam' ? 'simulation' : 'practice')}</span></div><span class="history-score">${item.correct}/${item.total}</span>${icon('arrow')}</a>`).join('')}</div>` : `<p class="empty">${label('noHistory')}</p>`}<p class="footnote">${label('scoreNote')}</p><button id="export-progress" class="button secondary">${label('export')} ↓</button>`;
}
export function bindProgress() {
  bind('#export-progress', 'click', async () => {
    const exported = await api('/export');
    const url = URL.createObjectURL(new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `cloudlingo-progress-${new Date().toISOString().slice(0, 10)}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
