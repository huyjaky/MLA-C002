export const state = { language: localStorage.getItem('language') || 'both', content: null, progress: null, labels: {} };
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function words(value) {
  if (typeof value === 'string') return value;
  return value?.[state.language === 'en' ? 'en' : 'vi'] || '';
}
export function bi(value, tag = 'span') {
  if (!value) return '';
  if (typeof value === 'string') return escape(value);
  const first = state.language === 'en' ? 'en' : 'vi';
  return `<${tag} lang="${first}">${escape(value[first])}</${tag}>${state.language === 'both' ? `<${tag} class="translation" lang="en">${escape(value.en)}</${tag}>` : ''}`;
}
export const label = key => bi(state.labels[key]);
export const plain = key => words(state.labels[key]);
export function rich(blocks) {
  return (blocks || []).map(block => {
    if (block.type === 'paragraph') return `<div class="reading-paragraph">${bi(block.text, 'p')}</div>`;
    if (block.type === 'list') {
      const tag = block.ordered ? 'ol' : 'ul';
      return `<${tag} class="reading-list">${block.items.map(item => `<li>${bi(item)}</li>`).join('')}</${tag}>`;
    }
    return '';
  }).join('');
}
export async function api(path, data) {
  const response = await fetch(`/api${path}`, data === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401 && path !== '/login') window.dispatchEvent(new Event('session-expired'));
    throw new Error(result.error || response.statusText);
  }
  return result;
}
export function toast(message) {
  const node = document.querySelector('#toast');
  node.textContent = message;
  node.classList.add('visible');
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => node.classList.remove('visible'), 5000);
}
export const go = route => { location.hash = route; };
export function bind(selector, event, handler) {
  document.querySelectorAll(selector).forEach(node => node.addEventListener(event, async e => {
    try { await handler(e, node); } catch (error) { toast(error.message); }
  }));
}
export function refs(urls = []) {
  return `<div class="sources"><h3>${label('sources')}</h3>${urls.map((url, i) => `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">AWS · ${escape(decodeURIComponent(url.split('/').pop().replace('.html', '').replaceAll('-', ' ')))} ↗</a>`).join('')}</div>`;
}
export function icon(name) {
  const paths = { learn: '<path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M6 11v6l6 3 6-3v-6M21 9v7"/>', exams: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 8h6M9 12h6m-6 4 2 2 4-4"/>', cards: '<rect x="6" y="5" width="14" height="16" rx="3"/><path d="M3 16V4a2 2 0 0 1 2-2h10m-5 8h6m-6 4h4"/>', progress: '<path d="M4 20V11m7 9V5m7 15V9M2 22h20"/>', arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>', check: '<path d="m5 12 4 4L19 6"/>', cloud: '<path d="M7 18a5 5 0 0 1-1-10 7 7 0 0 1 13 1 4 4 0 0 1-1 9Z"/>', star: '<path d="m12 3 3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1Z"/>' };
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.cloud}</svg>`;
}
export function mascot() {
  return '<div class="mascot" aria-hidden="true"><div class="mascot-wing left"></div><div class="mascot-wing right"></div><div class="mascot-body"><div class="mascot-eye"><i></i></div><div class="mascot-eye"><i></i></div><div class="mascot-beak"></div><div class="mascot-belly"></div></div><div class="mascot-foot left"></div><div class="mascot-foot right"></div><div class="mascot-spark">✦</div></div>';
}
