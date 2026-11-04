(() => {
'use strict';
const CAN_PRINT = true; // build.py sets false for the artifact build: the artifact frame ignores window.print()
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const norm = s => (s || '').replace(/\s+/g, ' ').trim();
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- Signed-in users (prototype stub: the real app has a session; "Viewing as" switches it) ----------
const JEFF = { id: 'u-jeff', name: 'Jeff Adkisson', initials: 'JA', role: 'Hiring manager', color: '#2f2a4d' };
const MARIA = { id: 'u-maria', name: 'Maria Chen', initials: 'MC', role: 'District manager', color: '#0f6c6a' };
const DEV = { id: 'u-dev', name: 'Dev Patel', initials: 'DP', role: 'Shift lead', color: '#8a3b12' };
const USERS = [JEFF, MARIA, DEV];
let ME = JEFF;
const userOf = a => USERS.find(u => u.id === a.id) || a;
const avatar = a => `<span class="np-av" style="background:${userOf(a).color || '#555'}" title="${esc(a.name)}">${esc(a.initials)}</span>`;
const RID = 'LbOAeFTuzcRo3ZZeyJpSZTbIpMp5il';
const KEY = 'compass.reportNotes.v5:' + RID, REPORT_KEY = 'compass.reportState:' + RID, UI_KEY = 'compass.reportNotes.ui';
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: in-memory only */ } },
};

// ================= Report mechanics (reproduced from the Angular app) =================
const root = $('cp-rp-report-renderer');
const pages = $$('cp-rp-page');
const tabs = $$('cp-rp-page-menu .nav-link');
const pageName = i => (tabs[i] ? norm(tabs[i].textContent) : 'Report header');
const person = norm($('cp-rp-header h2')?.textContent);
$('#np-who').textContent = [person, norm($('cp-rp-header h5')?.textContent)].filter(Boolean).join(' · ');
let active = 0;

function go(i, keepScroll) {
  active = i;
  pages.forEach((p, j) => p.classList.toggle('page-active', j === i));
  tabs.forEach((t, j) => t.classList.toggle('active', j === i));
  document.title = `Report Notes · ${pageName(i)}`;
  try { history.replaceState(null, '', '#' + pageName(i).toLowerCase()); } catch { /* some frames refuse; the page still works */ }
  if (!keepScroll) scrollTo(0, 0);
  closePop(); closeEditor(); setHover(null);
  render();
}
tabs.forEach((t, i) => t.addEventListener('click', () => go(i)));

// A plain click acts after the double-click window, and only if no text got selected,
// so double/triple-click and drag select words instead of toggling or navigating.
let clickTimer;
function onSingleClick(e, fn) {
  clearTimeout(clickTimer);
  if (e.detail > 1) return;
  clickTimer = setTimeout(() => { if (getSelection().isCollapsed) fn(); }, 230);
}
const itemOpen = it => it.querySelector('.accordion-header')?.getAttribute('aria-expanded') === 'true';
function setOpen(it, open) {
  it.classList.toggle('showing', open);
  it.querySelector('.accordion-header')?.setAttribute('aria-expanded', open);
  it.querySelector('.accordion-collapse')?.classList.toggle('show', open);
}
function syncToggles() {
  pages.forEach(p => {
    const inp = $('cp-rp-accordion-toggle-button input', p);
    if (inp) inp.checked = $$('.accordion-item', p).every(itemOpen);
  });
  renderChips();
}
root.addEventListener('click', e => {
  if (e.target.closest('#np-layer')) return;
  const h = e.target.closest('.accordion-header');
  if (h) onSingleClick(e, () => { const it = h.closest('.accordion-item'); setOpen(it, !itemOpen(it)); closePop(); closeEditor(); syncToggles(); });
});
$$('cp-rp-accordion-toggle-button input').forEach(inp => inp.addEventListener('change', () => {
  $$('.accordion-item', inp.closest('cp-rp-page')).forEach(it => setOpen(it, inp.checked));
  renderChips();
}));

// Summary measure row -> the page whose accordion has that measure, only it expanded, scrolled to.
function openMeasure(row) {
  const label = firstText(row);
  for (let i = 0; i < pages.length; i++) {
    const it = $$('.accordion-item', pages[i]).find(x => firstText(x.querySelector('.accordion-header')) === label);
    if (!it) continue;
    go(i);
    $$('.accordion-item', pages[i]).forEach(x => setOpen(x, x === it));
    syncToggles();
    it.scrollIntoView({ block: 'start' });
    return;
  }
}
$$('.chart-row.hoverable').forEach(row => {
  row.style.cursor = 'pointer';
  row.addEventListener('click', e => onSingleClick(e, () => openMeasure(row)));
  row.addEventListener('keydown', e => { if (e.key === 'Enter') openMeasure(row); });
});

// "More actions" menu
$$('cp-rp-action-menu .dropdown-toggle').forEach(b => b.addEventListener('click', e => {
  e.stopPropagation();
  const m = b.nextElementSibling; const open = !m.classList.contains('show');
  m.classList.toggle('show', open); b.setAttribute('aria-expanded', open);
}));
document.addEventListener('click', () => $$('cp-rp-action-menu .dropdown-menu.show').forEach(m => m.classList.remove('show')));

// ================= Report version + "Simulate a report update" =================
// ponytail: canned rewrites stand in for a re-generated report; the real version comes from the server.
const BASE_VERSION = 3;
const REWRITES = [
  ['Jack feels strongly about doing things "the right way" and will likely encourage others to do the same.',
   'Jack cares about following the correct procedure and tends to hold teammates to that same standard.'],
  ['Can you describe a time when you encountered a setback within a team project? What did you do to handle the setback or support your team members?',
   'Describe a team project that hit a setback. What was your role in getting it back on track?'],
  ['Establish a set time for planning and organizing your work each day.',
   'Block out time at the start of each shift to plan and organize your work.'],
];
let reportState = store.get(REPORT_KEY) || { applied: 0 };
const version = () => BASE_VERSION + reportState.applied;
function applyRewrite([from, to]) {
  const el = $$('p,li', root).find(e => norm(e.textContent).includes(norm(from)));
  if (el) el.textContent = norm(el.textContent).replace(norm(from), to);
}
for (let i = 0; i < reportState.applied; i++) applyRewrite(REWRITES[i]);
const SIM_HTML = $('#np-simulate').innerHTML;
function showVersion() {
  $('#np-ver').textContent = 'Report v' + version();
  const b = $('#np-simulate'); b.disabled = reportState.applied >= REWRITES.length;
  b.innerHTML = b.disabled ? '<i class="fa-solid fa-check"></i><span class="np-lbl"> No more sample updates</span>' : SIM_HTML;
}

// ================= Overall card (above the report header) =================
const OV = document.createElement('section');
OV.id = 'np-overall'; OV.setAttribute('aria-label', 'Overall notes');
$('cp-rp-header').before(OV);

// ================= Note targets: generic, text-based =================
// A block is any heading, paragraph, list item, table row or chart row, or any element that directly holds text.
// ponytail: heuristic selectors; the real renderer would tag blocks/headings in its templates.
const HEAD_SEL = 'h1,h2,h3,h4,h5,h6,[role=heading],.card-header';
const ROW_SEL = '.chart-row,[role=row]';
const TARGET_SEL = `${HEAD_SEL},${ROW_SEL},p,li,tr,blockquote,dt,dd`;
const SKIP_SEL = '#np-layer,#np-overall,.np-callout,.print-section-heading,cp-rp-page-menu,cp-rp-accordion-toggle-button,.dropdown,.d-print-flex';
const hasWords = s => /\p{L}{2}/u.test(s);
function isTarget(el) {
  if (el.matches(TARGET_SEL)) return hasWords(el.textContent);
  return [...el.childNodes].some(n => n.nodeType === 3 && /\p{L}{3}/u.test(n.nodeValue));
}
const promote = el => el.closest(HEAD_SEL) || el.closest(ROW_SEL) || el;
function targetFrom(node) {
  let el = node && (node.nodeType === 1 ? node : node.parentElement);
  if (!el || !root.contains(el) || el.closest(SKIP_SEL)) return null;
  for (; el && el !== root; el = el.parentElement) if (isTarget(el)) return promote(el);
  return null;
}
function firstText(el) {
  if (!el) return '';
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) { const t = norm(n.nodeValue); if (hasWords(t)) return t; }
  return norm(el.textContent);
}
const isHeadLike = el => el.matches(HEAD_SEL) || el.matches(ROW_SEL);
const quoteFor = el => isHeadLike(el) ? firstText(el) : norm(el.innerText || el.textContent);
const pageOf = el => pages.indexOf(el.closest('cp-rp-page'));
const HEADS = $$(HEAD_SEL, root).filter(h => !h.closest(SKIP_SEL) && hasWords(h.textContent));
function headingFor(el) {
  const own = el.closest(HEAD_SEL);
  if (own) return firstText(own);
  const pg = el.closest('cp-rp-page');
  let best = null;
  for (const h of HEADS) if (h.closest('cp-rp-page') === pg && (h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) best = h;
  return best ? firstText(best) : pageName(pageOf(el));
}
let TARGETS = [];
const rebuildTargets = () => {
  TARGETS = [...new Set($$('*', root).filter(el => !el.closest(SKIP_SEL) && isTarget(el)).map(promote))]
    .map(el => ({ el, text: norm(el.textContent), heading: headingFor(el) }));
};

// Anchor = heading + quote (+ a little text before/after). Resolve by text only:
// heading match first, then surrounding context, then the tightest element.
function ctxScore(text, k, q, n) {
  const before = text.slice(0, k).trimEnd(), after = text.slice(k + q.length).trimStart();
  const p = n.prefix || '', x = n.suffix || '';
  let a = 0; while (a < p.length && before[before.length - 1 - a] === p[p.length - 1 - a]) a++;
  let b = 0; while (b < x.length && after[b] === x[b]) b++;
  return a + b;
}
function resolve(n) {
  if (n.scope === 'overall') return { el: OV, k: 0 };
  const q = norm(n.quote); let best = null, bs = -Infinity;
  if (!q) return null;
  for (const t of TARGETS) {
    for (let k = t.text.indexOf(q); k >= 0; k = t.text.indexOf(q, k + 1)) {
      const sc = (t.heading === n.heading ? 1000 : 0) + ctxScore(t.text, k, q, n) * 10 + (firstText(t.el) === q || t.text === q ? 5 : 0) - t.text.length / 1e6;
      if (sc > bs) { bs = sc; best = { el: t.el, k }; }
    }
  }
  return best;
}
function rangeFor(el, q, at) {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let s = '', map = [], sp = true;
  for (let n; (n = w.nextNode());) {
    const v = n.nodeValue;
    for (let i = 0; i < v.length; i++) {
      if (/\s/.test(v[i])) { if (sp) continue; s += ' '; sp = true; } else { s += v[i]; sp = false; }
      map.push([n, i]);
    }
  }
  const k = at !== undefined && s.substr(at, q.length) === q ? at : s.indexOf(q); if (k < 0) return null;
  const r = new Range(); r.setStart(...map[k]); const [b, bi] = map[k + q.length - 1]; r.setEnd(b, bi + 1);
  return r;
}

// ================= Annotation types =================
// type: note | thumbs | stars | marker. One stamp per family per block per user.
const FAMS = {
  thumbs: { label: 'Thumbs', icon: 'fa-thumbs-up', values: [['up', 'Thumbs up', 'fa-thumbs-up'], ['down', 'Thumbs down', 'fa-thumbs-down']] },
  stars: { label: 'Stars', icon: 'fa-star', values: [1, 2, 3, 4, 5].map(v => [v, `${v} star${v > 1 ? 's' : ''}`, 'fa-star']) },
  marker: { label: 'Markers', icon: 'fa-bookmark', values: [['followup', 'Follow up', 'fa-circle-question'], ['flag', 'Flag', 'fa-flag'], ['bomb', 'Deal breaker', 'fa-bomb'], ['fire', 'Strong', 'fa-fire'], ['clap', 'Great answer', 'fa-hands-clapping']] },
};
const COLORS = { yellow: ['Yellow', '#ffe55c'], green: ['Green', '#9be59a'], blue: ['Blue', '#9ccfff'], pink: ['Pink', '#f6a5c8'] };
const swatch = c => `<span class="np-sw" style="background:${COLORS[c]?.[1] || '#ccc'}"></span>`;
const valDef = n => FAMS[n.type]?.values.find(v => v[0] === n.value);
const labelOf = n => n.type === 'note' ? 'Note' : n.type === 'highlight' ? `${COLORS[n.value]?.[0] || ''} highlight` : valDef(n)?.[1] || n.type;
const vclass = n => n.type === 'note' ? 'v-note' : n.type === 'stars' ? 'v-stars' : 'v-' + n.value;
const iconOf = n => n.type === 'highlight' ? `<span class="np-ico np-hl-ico" title="${esc(labelOf(n))}">${swatch(n.value)}<i class="fa-solid fa-highlighter"></i></span>`
  : n.type === 'note' ? `<span class="np-ico v-note"><i class="fa-solid fa-comment"></i></span>`
  : n.type === 'stars' ? `<span class="np-ico v-stars"><i class="fa-solid fa-star"></i>${n.value}</span>`
  : `<span class="np-ico ${vclass(n)}"><i class="fa-solid ${valDef(n)?.[2]}"></i></span>`;

// ================= Notes store (browser storage, seeded) =================
const H = 3600e3, D = 24 * H;
let seq = 0;
function seed() {
  const now = Date.now();
  const n = (author, type, value, heading, quote, body, ago, ver = BASE_VERSION) =>
    ({ id: 'n' + (++seq) + now.toString(36), author, type, value, heading, quote, body, created: now - ago, updated: now - ago, version: ver });
  const hl = (author, color, heading, quote, prefix, suffix, body, ago) => Object.assign(n(author, 'highlight', color, heading, quote, body, ago), { prefix, suffix });
  const ov = (author, type, value, body, ago) => Object.assign(n(author, type, value, 'Overall', '', body, ago), { scope: 'overall' });
  const S = x => Object.assign(x, { shared: true }); // shared; everything else stays private
  return [
    // Overall: one thumb / star rating / marker per person, plus text notes
    S(ov(JEFF, 'stars', 3, 'Solid operator. Follow-through under pressure is the open question.', 30 * 60e3)),
    ov(JEFF, 'marker', 'followup', '', 30 * 60e3),
    S(ov(MARIA, 'thumbs', 'up', 'Would hire for Assistant Manager.', 2 * D)),
    S(ov(MARIA, 'stars', 4, '', 2 * D)),
    S(ov(DEV, 'stars', 3, 'Great with the crew; vague when asked for numbers.', 50 * 60e3)),
    S(ov(DEV, 'thumbs', 'up', '', 50 * 60e3)),
    ov(JEFF, 'note', null, 'Second round: dig into persistence and the team-setback answer.', 20 * 60e3),
    S(ov(MARIA, 'note', null, 'Ready for Assistant Manager now; General Manager is a stretch today.', 2 * D)),
    ov(DEV, 'note', null, "Not sure he'd hold the line on comps with regulars. Keep this between us until round two.", 45 * 60e3),
    // Inline
    S(n(JEFF, 'note', null, 'Personality', 'Persistence', 'Biggest gap vs. the ideal range (3 vs 6+). Make this the first thing we probe.', 2 * D + 3 * H)),
    n(JEFF, 'marker', 'flag', 'Personality', 'Optimism', '', 2 * D + 3 * H),
    S(hl(MARIA, 'pink', 'Rule-Consciousness', 'doing things "the right way"', 'Jack feels strongly about', 'and will likely encourage others', 'Good sign for food-safety and cash-handling compliance.', 2 * D)),
    hl(JEFF, 'yellow', 'Persistence', 'low sense of urgency', 'Jack has a', "and likely doesn't feel the need", 'Matches what his last manager said.', 3 * H),
    S(hl(JEFF, 'blue', 'Persistence', 'overlapping deadlines', 'handle multiple high-priority tasks with', '? What was your approach?', '', 26 * H)),
    S(n(MARIA, 'thumbs', 'up', 'Resilience', 'Jack is naturally resilient to most criticism and tends to stay motivated, even after making mistakes.', '', 2 * D)),
    S(n(JEFF, 'marker', 'followup', 'Persistence', 'Tell me about a time when you had to reprioritize to handle a project that required immediate attention. What was the outcome?', 'Ask this one first.', 26 * H)),
    S(n(JEFF, 'stars', 4, 'Optimism', 'Can you share a workplace example where you faced a significant obstacle or challenge? How did you approach finding a solution and what was your attitude throughout the situation?', 'Supplier shorted the Friday truck at his last store. Called two nearby locations, borrowed stock, kept the crew calm.', 40 * 60e3)),
    S(n(DEV, 'stars', 5, 'Optimism', 'Can you share a workplace example where you faced a significant obstacle or challenge? How did you approach finding a solution and what was your attitude throughout the situation?', 'Best answer of the day.', 38 * 60e3)),
    n(JEFF, 'marker', 'clap', 'Optimism', 'Can you share a workplace example where you faced a significant obstacle or challenge? How did you approach finding a solution and what was your attitude throughout the situation?', '', 40 * 60e3),
    S(n(JEFF, 'thumbs', 'down', 'Optimism', 'Can you describe a time when you encountered a setback within a team project? What did you do to handle the setback or support your team members?', 'Vague, mostly "we" with no clear role.', 25 * 60e3)),
    n(DEV, 'note', null, 'Optimism', 'Can you describe a time when you encountered a setback within a team project? What did you do to handle the setback or support your team members?', 'He blamed the crew twice. Private until I check with Maria.', 24 * 60e3),
    S(hl(DEV, 'green', 'Resilience', 'Suppose you\'re collaborating with someone and they make a mistake', '', 'that requires a significant portion', 'Said he would redo it with them, not for them. Good coaching instinct.', 35 * 60e3)),
    S(n(DEV, 'marker', 'fire', 'Team-oriented', 'Tell me about a situation where input from others caused you to change a course of action you were very confident about. What was that situation and how did the input from others change your approach?', '', 33 * 60e3)),
    S(n(MARIA, 'note', null, 'Organization', 'Establish a set time for planning and organizing your work each day.', 'Pair with the shift-lead opening checklist during onboarding.', 5 * H)),
    S(n(MARIA, 'note', null, 'Conscientiousness', 'Tends to double-check cash counts at close', 'Left on an earlier version of this report.', 9 * D, 2)),
  ];
}
let DB = store.get(KEY);
if (!Array.isArray(DB)) { DB = seed(); save(); }
function save() { store.set(KEY, DB); }
// Visibility: your own notes, plus anyone's shared notes.
const canSee = n => n.author.id === ME.id || n.shared === true;
let notes = [];
const refreshVisible = () => { notes = DB.filter(canSee); };
const phone = () => innerWidth <= 640;
const ui = Object.assign({ open: !phone(), filter: 'page', view: phone() ? 'inline' : 'margin' }, store.get(UI_KEY) || {});
const isOverall = n => n.scope === 'overall';
ME = USERS.find(u => u.id === ui.as) || JEFF;
const saveUi = () => store.set(UI_KEY, ui);
const newNote = (p, type, value, body) => {
  const now = Date.now();
  const n = { id: 'n' + (++seq) + now.toString(36), author: { id: ME.id, name: ME.name, initials: ME.initials }, shared: false, type, value, heading: p.heading, quote: p.quote, body, created: now, updated: now, version: version() };
  if (p.prefix !== undefined) Object.assign(n, { prefix: p.prefix, suffix: p.suffix });
  if (p.scope) n.scope = p.scope;
  DB.push(n); notes.push(n); return n;
};

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
function ago(ts) {
  const s = (ts - Date.now()) / 1000;
  for (const [u, n] of [['day', 86400], ['hour', 3600], ['minute', 60]]) if (Math.abs(s) >= n) return rtf.format(Math.round(s / n), u);
  return 'just now';
}
const isMine = n => n.author.id === ME.id;
// Every change goes through updateNote/remove, which refuse notes the current user does not own.
function refuse(n) { toast(`Only ${n.author.name} can change this note.`); return false; }
function updateNote(n, patch) {
  if (!n || !isMine(n)) return n ? refuse(n) : false;
  Object.assign(n, patch, { updated: Date.now() }); save(); return true;
}
const shareLabel = n => n.shared ? '<i class="fa-solid fa-user-group"></i> Shared · make private' : '<i class="fa-solid fa-lock"></i> Private · share';
const shareBtn = n => isMine(n) ? `<button type="button" class="np-share${n.shared ? ' on' : ''}" data-act="share" title="${n.shared ? 'Visible to everyone who can open this report' : 'Only you can see this'}">${shareLabel(n)}</button>` : '';
function toggleShare(n) { if (updateNote(n, { shared: !n.shared })) { render(); toast(n.shared ? 'Shared with everyone who can open this report' : 'Now private'); } }
const oldTag = n => n.version < version() ? `<span class="np-old" title="Made on report v${n.version}; the report is now v${version()}"><i class="fa-solid fa-clock-rotate-left"></i>older version</span>` : '';
const meta = n => `${avatar(n.author)}${esc(isMine(n) ? 'You' : n.author.name)} · ${ago(n.updated)} ${oldTag(n)}`;
const showQuote = n => norm(n.quote) !== norm(n.heading);

// ================= Render =================
const layer = document.createElement('div'); layer.id = 'np-layer'; root.appendChild(layer);
let resolved = new Map(), hlRanges = new Map();
function render() {
  refreshVisible();
  const res = new Map(notes.map(n => [n.id, resolve(n)]));
  resolved = new Map([...res].map(([id, r]) => [id, r && r.el]));
  hlRanges = new Map();
  const byColor = Object.fromEntries(Object.keys(COLORS).map(c => [c, []])), quotes = [];
  for (const n of notes) {
    const r = res.get(n.id); if (!r || isOverall(n) || ui.view === 'hidden') continue;
    if (n.type === 'highlight') { const rg = rangeFor(r.el, norm(n.quote), r.k); if (rg) { hlRanges.set(n.id, rg); (byColor[n.value] || byColor.yellow).push(rg); } }
    else if (norm(n.quote) !== quoteFor(r.el)) { const rg = rangeFor(r.el, norm(n.quote), r.k); if (rg) quotes.push(rg); } // partial quotes only
  }
  if (window.CSS?.highlights) {
    CSS.highlights.set('np-quote', new Highlight(...quotes));
    for (const c in byColor) CSS.highlights.set('np-hl-' + c, new Highlight(...byColor[c]));
  }
  $('#np-total').textContent = notes.length;
  document.body.dataset.npView = ui.view;
  $$('#np-view button').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === ui.view));
  renderOverall();
  renderCallouts();
  renderList();
  renderChips();
  updateRail();
}

// One line per note: used by callouts, the overall card and print.
let printing = false; // printed copies name every author
const lineHTML = (n, tag = 'button') => `<${tag} ${tag === 'button' ? 'type="button" ' : ''}class="np-co t-${n.type}" data-id="${n.id}"${n.type === 'highlight' ? ` style="--np-c:${COLORS[n.value]?.[1]}"` : ''}>
  ${iconOf(n)}${!n.shared ? '<i class="fa-solid fa-lock np-lock" title="Private"></i>' : ''}<span class="np-co-txt">${n.type !== 'note' ? `<b>${esc(labelOf(n))}</b>${n.body ? ' · ' : ''}` : ''}${esc(n.body)}</span>
  <span class="np-co-by">${esc(isMine(n) && !printing ? 'You' : n.author.name)} ${oldTag(n)}</span></${tag}>`;

// Inline view: callouts in the flow, right under each block (siblings, never inside a block).
function renderCallouts() {
  $$('.np-callout', root).forEach(c => c.remove());
  if (ui.view !== 'inline') return;
  const byEl = new Map();
  for (const n of notes) { const el = resolved.get(n.id); if (el && el !== OV) (byEl.get(el) || byEl.set(el, []).get(el)).push(n); }
  for (const [el, ns] of byEl) {
    ns.sort((a, b) => a.created - b.created);
    const tag = el.matches('li') ? 'li' : el.matches('tr') ? 'tr' : 'div';
    const c = document.createElement(tag); c.className = 'np-callout' + (tag === 'li' ? ' ms-3' : '');
    const inner = ns.map(n => lineHTML(n)).join('');
    c.innerHTML = tag === 'tr' ? `<td colspan="99">${inner}</td>` : inner;
    el.after(c);
  }
}

// Overall card: rating strip (one thumb, one star rating, one marker per person) + text notes.
function renderOverall() {
  const ns = notes.filter(isOverall).sort((a, b) => a.created - b.created);
  // Ratings per person (clickable to add or read text); the list below holds anything with text.
  const people = [...new Set(ns.filter(n => n.type !== 'note').map(n => n.author.id))].sort((a, b) => (b === ME.id) - (a === ME.id));
  const others = people.map(id => { const st = ns.filter(n => n.author.id === id && n.type !== 'note');
    return `<span class="np-ov-person" title="${esc(st[0].author.name)}">${avatar(st[0].author)}${st.map(n => `<button type="button" class="np-stamp" data-id="${n.id}" title="${esc(labelOf(n))}${n.body ? ': ' + esc(n.body) : ''}" aria-label="${esc(labelOf(n))} by ${esc(n.author.name)}">${iconOf(n)}${n.body ? '<span class="dot"></span>' : ''}</button>`).join('')}</span>`; }).join('');
  OV.innerHTML = `<div class="np-ov-head"><b>Overall</b><span class="np-ov-sub">Notes about ${esc(person)} as a whole</span>
      <div class="np-ov-strip" aria-label="Your overall rating"><span class="np-ov-lbl">Your rating</span>${famsHTML()}</div>
      ${others ? `<div class="np-ov-others">${others}</div>` : ''}</div>
    <div class="np-ov-list">${ns.filter(n => n.body).map(n => lineHTML(n)).join('') || '<span class="np-ov-empty">No overall notes yet.</span>'}</div>
    <button type="button" class="np-link" data-ov-add>Add an overall note</button>`;
  updateFams(OV, OV);
}
root.addEventListener('click', e => {
  const co = e.target.closest('.np-co,.np-stamp');
  if (co && root.contains(co)) { e.stopPropagation(); openPopId === co.dataset.id ? closePop() : openPop(co.dataset.id); return; }
  if (e.target.closest('[data-ov-add]')) { setPanel(true); $('#np-input').focus(); }
}, true);
OV.addEventListener('click', e => {
  const b = e.target.closest('.np-ov-strip button'); if (!b) return;
  e.stopPropagation(); famClick(b, OV);
});

function renderList() {
  $$('.np-seg button').forEach(b => b.setAttribute('aria-selected', b.dataset.filter === ui.filter));
  const placed = notes.filter(n => resolved.get(n.id) && !isOverall(n)).map(n => ({ n, el: resolved.get(n.id) }))
    .filter(x => ui.filter === 'all' || [active, -1].includes(pageOf(x.el)))
    .sort((a, b) => a.el === b.el ? a.n.created - b.n.created : (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  const unplaced = notes.filter(n => !resolved.get(n.id));
  const row = n => `<article class="np-card${resolved.get(n.id) ? '' : ' orphan'}" data-id="${n.id}" tabindex="0" title="${resolved.get(n.id) ? 'Go to this spot and edit' : 'Edit or delete'}">
      <div class="np-line">${iconOf(n)}<div class="np-txt">
        ${n.type !== 'note' ? `<b>${esc(labelOf(n))}</b>${n.body ? ' · ' : ''}` : ''}${n.body ? `<span class="np-body">${esc(n.body)}</span>` : ''}
        ${showQuote(n) ? `<blockquote class="np-quote">${esc(n.quote)}</blockquote>` : ''}
        <div class="np-meta">${!resolved.get(n.id) ? `<b>${esc(n.heading)}</b> · ` : ''}${meta(n)}</div>
        ${shareBtn(n)}
      </div></div></article>`;
  let html = `<div class="np-group">Overall</div>` + (notes.filter(isOverall).sort((a, b) => a.created - b.created).map(row).join('') || '<div class="np-unplaced-why">No overall notes yet.</div>');
  if (unplaced.length) {
    html += `<div class="np-group unplaced"><i class="fa-solid fa-link-slash"></i>Unplaced · ${unplaced.length}</div>
      <div class="np-unplaced-why">The quoted text is no longer in report v${version()}. Kept here so nothing is lost.</div>`
      + unplaced.map(row).join('');
  }
  let pg = null, sec = null;
  for (const { n, el } of placed) {
    const p = pageName(pageOf(el)), s = headingFor(el);
    if (p !== pg) { html += `<div class="np-group">${esc(p)}</div>`; pg = p; sec = null; }
    if (s !== sec && s !== p) { html += `<div class="np-sec">${esc(s)}</div>`; sec = s; }
    html += row(n);
  }
  if (!placed.length) html += `<div class="np-empty">No notes on ${esc(pageName(active))} yet.<br>Rest the pointer on a line to stamp or note it.</div>`;
  $('#np-list').innerHTML = html || `<div class="np-empty">No notes on ${esc(pageName(active))} yet.<br>Rest the pointer on a line to stamp or note it.</div>`;
  if (openPopId && !popAnchor(openPopId)) { const c = $(`.np-card[data-id="${openPopId}"]`); if (c) { c.insertAdjacentHTML('beforeend', popHTML(notes.find(x => x.id === openPopId))); bindPop(c.querySelector('.np-pop')); } }
}

// Margin chips: one per note, right margin, aligned to its block (or its collapsed section's header).
function anchorOf(el) {
  if (el.getClientRects().length) return el;
  const h = el.closest('.accordion-item')?.querySelector('.accordion-header');
  return h && h.getClientRects().length ? h : null;
}
function renderChips() {
  $$('.np-chip', layer).forEach(c => c.remove());
  const rr = root.getBoundingClientRect();
  const items = [];
  for (const n of notes) {
    if (ui.view !== 'margin') break;
    const el = resolved.get(n.id); const a = el && el !== OV && anchorOf(el);
    if (a) items.push({ n, top: a.getBoundingClientRect().top - rr.top + 2 });
  }
  items.sort((x, y) => x.top - y.top || x.n.created - y.n.created);
  let last = -1e9;
  for (const { n, top } of items) {
    const t = Math.max(top, last + 27); last = t;
    const c = document.createElement('button');
    c.type = 'button'; c.className = 'np-chip' + (isMine(n) ? '' : ' other') + (n.id === openPopId ? ' open' : ''); c.dataset.id = n.id; c.style.top = t + 'px';
    c.setAttribute('aria-label', `${labelOf(n)} by ${n.author.name}${n.body ? ': ' + n.body : ''}`);
    c.innerHTML = `${isMine(n) ? '' : `<span class="np-ini" style="background:${userOf(n.author).color}">${esc(n.author.initials)}</span>`}${iconOf(n)}${n.body && n.type !== 'note' ? '<span class="dot"></span>' : ''}<span class="lbl">${esc(n.type === 'note' ? n.body : labelOf(n) + (n.body ? ' · ' + n.body : ''))} — ${esc(isMine(n) ? 'You' : n.author.name)}</span>`;
    layer.appendChild(c);
  }
  const pop = $('#np-layer > .np-pop');
  if (pop) placePop(pop);
}
layer.addEventListener('mouseover', e => { const c = e.target.closest('.np-chip'); if (c) { const el = resolved.get(c.dataset.id); el && anchorOf(el)?.classList.add('np-hover'); } });
layer.addEventListener('mouseout', e => { const c = e.target.closest('.np-chip'); if (c) { const el = resolved.get(c.dataset.id); el && anchorOf(el)?.classList.remove('np-hover'); } });
layer.addEventListener('click', e => { const c = e.target.closest('.np-chip'); if (c) { e.stopPropagation(); openPopId === c.dataset.id ? closePop() : openPop(c.dataset.id); } });

// ---------- Popover card: edit text, change value, delete ----------
let openPopId = null;
function popHTML(n) {
  const mine = isMine(n);
  const vals = n.type === 'highlight' && mine ? `<div class="np-vals">${Object.entries(COLORS).map(([c, [l, bg]]) =>
    `<button type="button" data-val="${c}" aria-pressed="${c === n.value}" title="${l}" aria-label="${l}"><span class="np-sw lg" style="background:${bg}"></span></button>`).join('')}</div>`
    : n.type !== 'note' && mine ? `<div class="np-vals${n.type === 'stars' ? ' np-stars-pick' : ''}">${FAMS[n.type].values.map(([v, l, i]) =>
    `<button type="button" data-val="${v}" aria-pressed="${v === n.value}" class="${n.type === 'stars' ? (v <= n.value ? 'on' : '') : 'v-' + v}" title="${l}" aria-label="${l}"><i class="fa-solid ${i}"></i></button>`).join('')}</div>` : '';
  return `<div class="np-pop" role="dialog" aria-label="${esc(labelOf(n))}" data-id="${n.id}">
    <div class="np-pop-head">${iconOf(n)}<b>${esc(labelOf(n))}</b><button type="button" class="np-icon" data-act="close" aria-label="Close"><i class="fa-light fa-xmark"></i></button></div>
    <div class="np-ctx"><b>${esc(n.heading)}</b>${!isOverall(n) && showQuote(n) ? ` › “${esc(n.quote.length > 90 ? n.quote.slice(0, 90) + '…' : n.quote)}”` : ''}</div>
    ${vals}
    ${mine ? `<textarea rows="2" placeholder="${n.type === 'note' ? 'Note text' : n.type === 'highlight' ? 'Add a note (optional)' : 'Add text (optional)'}, Enter to save">${esc(n.body)}</textarea>` : `<div class="np-body">${esc(n.body || 'No text.')}</div>`}
    <div class="np-meta">${meta(n)}</div>
    ${mine ? '' : `<div class="np-ro"><i class="fa-solid fa-lock"></i> ${esc(n.author.name)}'s note · read-only</div>`}
    ${mine ? `<div class="np-pop-share">${shareBtn(n)}</div>` : ''}
    ${mine ? `<div class="np-pop-foot"><button type="button" class="np-danger" data-act="del"><i class="fa-light fa-trash-can"></i> ${n.type === 'highlight' ? 'Remove highlight' : 'Delete'}</button><span>Enter save · Esc close</span></div>` : ''}
  </div>`;
}
const visible = el => el && el.getClientRects().length ? el : null;
const popAnchor = id => visible($(`.np-chip[data-id="${id}"]`, layer)) || visible($(`.np-co[data-id="${id}"],.np-stamp[data-id="${id}"]`, root));
const vw = () => document.documentElement.clientWidth; // excludes the scrollbar, unlike innerWidth
const visTop = () => Math.max(44, ($('cp-rp-page-menu')?.getBoundingClientRect().bottom || 0) + 4);
function placePop(pop) {
  const a = popAnchor(pop.dataset.id); if (!a || !layer.contains(pop)) return;
  const chip = a.classList.contains('np-chip'), el = resolved.get(pop.dataset.id);
  // Keep the noted text readable: open under the block (or above it when there is no room), not on top of it.
  const block = chip && el ? anchorOf(el) || a : a;
  const rr = root.getBoundingClientRect(), ar = a.getBoundingClientRect(), br = block.getBoundingClientRect();
  const h = pop.offsetHeight, w = pop.offsetWidth;
  let top = br.bottom + 6;
  if (top + h > innerHeight - 8 && br.top - h - 6 >= visTop()) top = br.top - h - 6;
  const left = Math.max(8, Math.min(chip ? ar.right - w : ar.left, vw() - w - 8));
  pop.style.top = (top - rr.top) + 'px';
  pop.style.left = (left - rr.left) + 'px';
}
function bindPop(pop) {
  const n = notes.find(x => x.id === pop.dataset.id);
  const ta = $('textarea', pop);
  pop.addEventListener('click', e => {
    e.stopPropagation();
    const act = e.target.closest('[data-act]')?.dataset.act, val = e.target.closest('[data-val]')?.dataset.val;
    if (act === 'close') closePop();
    if (act === 'del') { closePop(); remove(n); }
    if (act === 'share') { const keep = ta?.value; toggleShare(n); openPop(n.id, keep); }
    if (val !== undefined && updateNote(n, { value: n.type === 'stars' ? +val : val })) { const keep = ta?.value; render(); openPop(n.id, keep); }
  });
  ta?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      const v = ta.value.trim();
      if (n.type === 'note' && !v) return; // a note needs text; use Delete to remove it
      if (v !== n.body && !updateNote(n, { body: v })) return;
      closePop(); render(); toast('Saved');
    }
    if (e.key === 'Escape') { e.stopPropagation(); closePop(); }
  });
}
function openPop(id, draft) {
  closePop(); closeEditor();
  const n = notes.find(x => x.id === id); if (!n) return;
  openPopId = id;
  const host = popAnchor(id) ? layer : $(`.np-card[data-id="${id}"]`);
  if (!host) return;
  host.insertAdjacentHTML('beforeend', popHTML(n));
  const pop = host.querySelector('.np-pop');
  bindPop(pop); placePop(pop);
  $(`.np-chip[data-id="${id}"]`, layer)?.classList.add('open');
  const ta = $('textarea', pop);
  pop.scrollIntoView({ block: 'nearest' });
  if (ta) { if (draft !== undefined) ta.value = draft; ta.focus({ preventScroll: true }); ta.setSelectionRange(ta.value.length, ta.value.length); }
}
function closePop() {
  $$('.np-pop').forEach(p => p.remove());
  $$('.np-chip.open', layer).forEach(c => c.classList.remove('open'));
  openPopId = null;
}

function remove(n) {
  if (!n || !isMine(n)) return n && refuse(n);
  const i = DB.indexOf(n); if (i < 0) return;
  DB.splice(i, 1); save(); render();
  toast(`${labelOf(n)} removed`, () => { DB.splice(i, 0, n); save(); render(); });
}

// ---------- Inline note editor under the block ----------
let editorPick = null;
function openEditor(p) {
  closePop(); closeEditor();
  editorPick = p;
  const rr = root.getBoundingClientRect(), r = p.el.getBoundingClientRect();
  const ed = document.createElement('div'); ed.id = 'np-editor';
  ed.style.top = (r.bottom - rr.top + 6) + 'px';
  ed.style.left = Math.max(8, r.left - rr.left) + 'px';
  ed.style.width = Math.min(Math.max(r.width, 300), 460) + 'px';
  ed.innerHTML = `<div class="np-ed-head"><i class="fa-solid fa-comment v-note"></i><span><b>${esc(p.heading)}</b>${norm(p.quote) !== norm(p.heading) ? ` › “${esc(p.quote.length > 60 ? p.quote.slice(0, 60) + '…' : p.quote)}”` : ''}</span></div>
    <textarea rows="2" placeholder="Type a note" aria-label="Note text"></textarea><div class="np-ed-foot">Enter to save · Shift+Enter new line · Esc to cancel</div>`;
  layer.appendChild(ed);
  p.el.classList.add('np-picked');
  const ta = $('textarea', ed); ed.scrollIntoView({ block: 'nearest' }); ta.focus({ preventScroll: true });
  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      const v = ta.value.trim(); if (!v) return;
      newNote(editorPick, 'note', null, v); save(); closeEditor(); render(); toast('Note saved');
    }
    if (e.key === 'Escape') { e.stopPropagation(); closeEditor(); }
  });
}
function closeEditor() { $('#np-editor')?.remove(); editorPick?.el.classList.remove('np-picked'); editorPick = null; }
document.addEventListener('mousedown', e => {
  if (!e.target.closest('.np-pop,.np-chip,.np-card')) closePop();
  const ed = $('#np-editor');
  if (ed && !e.target.closest('#np-editor,#np-rail') && !$('textarea', ed).value.trim()) closeEditor(); // keep a typed draft
});

// ================= Hover rail =================
const rail = $('#np-rail');
// Keys act on the block under the pointer, so stamping needs no pointer travel at all.
const KEYS = { 'thumbs:up': 'U', 'thumbs:down': 'D', 'stars:1': '1', 'stars:2': '2', 'stars:3': '3', 'stars:4': '4', 'stars:5': '5', 'marker:followup': 'Q' };
function famsHTML() {
  return Object.entries(FAMS).map(([k, f]) => `<div class="np-fam" data-fam="${k}">
    <button type="button" class="np-main" data-main="${k}" aria-label="${f.label}"><i class="fa-solid ${f.icon}"></i></button>
    <div class="np-fly"><div class="np-fly-in${k === 'stars' ? ' np-stars' : ''}">${(k === 'stars' ? [...f.values].reverse() : f.values).map(([v, l, i]) =>
      `<button type="button" data-fam="${k}" data-val="${v}" class="${k === 'stars' ? '' : 'v-' + v}" title="${l}${KEYS[k + ':' + v] ? ` (${KEYS[k + ':' + v]})` : ''}" aria-label="${l}" aria-pressed="false"><i class="fa-solid ${i}"></i></button>`).join('')}</div></div>
  </div>`).join('');
}
rail.addEventListener('mouseover', e => {
  const f = e.target.closest('.np-fam'); if (!f) return;
  const n = FAMS[f.dataset.fam].values.length * 30 + 10;
  f.classList.toggle('up', f.getBoundingClientRect().bottom + n > innerHeight - 4);
});
rail.innerHTML = famsHTML() + `<button type="button" class="np-main" data-note aria-label="Add note" title="Add note (C)"><i class="fa-solid fa-comment"></i></button>`;

let hoverEl = null, hideTimer, lastY = 0;
const mineOn = (el, type) => notes.find(n => isMine(n) && n.type === type && resolved.get(n.id) === el);
function updateRail() { if (hoverEl) updateFams(rail, hoverEl); }
function updateFams(box, el) {
  for (const [k, f] of Object.entries(FAMS)) {
    const ex = mineOn(el, k);
    const main = $(`[data-main="${k}"]`, box);
    main.classList.toggle('set', !!ex);
    main.title = ex ? `${labelOf(ex)}. Click to clear` : `${f.label}: hover to choose`;
    main.innerHTML = ex ? (k === 'stars' ? `<i class="fa-solid fa-star v-stars"></i><span class="np-num">${ex.value}</span>` : `<i class="fa-solid ${valDef(ex)[2]} ${vclass(ex)}"></i>`) : `<i class="fa-solid ${f.icon}"></i>`;
    $$(`.np-fly [data-fam="${k}"]`, box).forEach(b => {
      const v = k === 'stars' ? +b.dataset.val : b.dataset.val;
      b.setAttribute('aria-pressed', !!ex && ex.value === v);
      if (k === 'stars') b.classList.toggle('on', !!ex && v <= ex.value);
    });
  }
}
function placeRail() {
  if (!hoverEl || !hoverEl.getClientRects().length) { rail.hidden = true; return; }
  rail.hidden = false;
  const r = hoverEl.getBoundingClientRect(), h = rail.offsetHeight, w = rail.offsetWidth;
  const vt = visTop(), visBot = innerHeight - 4;
  // Follow the pointer inside tall blocks; stay within the block and always within the visible area.
  let top = r.height <= h ? r.top : Math.min(Math.max(lastY - h / 2, r.top), r.bottom - h);
  top = Math.max(vt, Math.min(top, visBot - h));
  rail.style.top = top + 'px';
  const left = Math.max(2, r.left - w - 8);
  rail.style.left = left + 'px';
  rail.classList.toggle('fly-right', left < 44);
}
function setHover(el) {
  if (el === hoverEl) return;
  hoverEl?.classList.remove('np-hover');
  hoverEl = el; el?.classList.add('np-hover');
  updateRail(); placeRail();
}
document.addEventListener('mousemove', e => {
  if (e.target.closest('#np-rail,#np-selbar')) { clearTimeout(hideTimer); return; }
  if (e.target.closest('#np-layer,#np-panel,#np-appbar')) { clearTimeout(hideTimer); hideTimer = setTimeout(() => setHover(null), 350); return; }
  lastY = e.clientY;
  const t = targetFrom(e.target);
  if (t) { clearTimeout(hideTimer); setHover(t); placeRail(); }
  else { clearTimeout(hideTimer); hideTimer = setTimeout(() => setHover(null), 350); }
});
const pickOf = el => el === OV ? { el, heading: 'Overall', quote: '', scope: 'overall' } : { el, heading: headingFor(el), quote: quoteFor(el) };
function stamp(el, type, value) {
  const ex = mineOn(el, type);
  if (ex && ex.value === value) { remove(ex); return; }           // same value removes
  if (ex) { const { heading, quote } = pickOf(el); if (!updateNote(ex, { value, heading, quote, version: version() })) return; } // new value replaces
  else newNote(pickOf(el), type, value, '');
  save(); render();
}
function famClick(b, el) {
  if (b.dataset.val !== undefined) stamp(el, b.dataset.fam, b.dataset.fam === 'stars' ? +b.dataset.val : b.dataset.val);
  else if (b.dataset.main) { const ex = mineOn(el, b.dataset.main); if (ex) remove(ex); } // main icon only clears
}
rail.addEventListener('click', e => {
  e.stopPropagation(); if (!hoverEl) return;
  const b = e.target.closest('button'); if (!b) return;
  if (b.hasAttribute('data-note')) { const el = hoverEl; setHover(null); openEditor(pickOf(el)); }
  else famClick(b, hoverEl);
});

// ---------- Selection bar: highlight in one click ----------
// Driven by selectionchange, so drag, double/triple-click and keyboard selection all work.
const bar = $('#np-selbar'); let selAnchor = null;
bar.innerHTML = Object.entries(COLORS).map(([c, [l, bg]]) =>
  `<button type="button" data-color="${c}" title="Highlight ${l.toLowerCase()}" aria-label="Highlight ${l.toLowerCase()}"><span class="np-sw lg" style="background:${bg}"></span></button>`).join('')
  + `<button type="button" class="np-hl-note" data-color="yellow" data-and-note><i class="fa-solid fa-highlighter"></i> Highlight and note</button>`;
function selectionAnchor() {
  const s = getSelection(); if (s.isCollapsed || !s.rangeCount) return null;
  const r = s.getRangeAt(0);
  const el = targetFrom(r.startContainer); if (!el) return null;
  const rr = r.cloneRange();
  if (!el.contains(rr.endContainer)) rr.setEnd(el, el.childNodes.length); // ponytail: a selection across blocks is clipped to its first block
  const q = norm(rr.toString()); if (!/[\p{L}\d]/u.test(q)) return null;
  const pre = document.createRange(); pre.setStart(el, 0); pre.setEnd(rr.startContainer, rr.startOffset);
  const post = document.createRange(); post.setStart(rr.endContainer, rr.endOffset); post.setEnd(el, el.childNodes.length);
  return { el, heading: headingFor(el), quote: q.slice(0, 1000), prefix: norm(pre.toString()).slice(-32), suffix: norm(post.toString()).slice(0, 32), range: r };
}
function updateBar() {
  selAnchor = selectionAnchor();
  if (!selAnchor) { bar.hidden = true; return; }
  bar.hidden = false;
  const rects = [...selAnchor.range.getClientRects()].filter(r => r.width > 0);
  const first = rects[0] || selAnchor.range.getBoundingClientRect(), last = rects[rects.length - 1] || first;
  const bh = bar.offsetHeight, bw = bar.offsetWidth;
  let top = first.top - bh - 8, left = first.left, below = top < visTop();
  if (below) { top = last.bottom + 8; left = last.left; } // no room above: flip below
  const maxLeft = (ui.open && !phone() ? vw() - 380 : vw()) - bw - 8;
  bar.style.top = Math.min(top, innerHeight - bh - 4) + 'px';
  bar.style.left = Math.max(8, Math.min(left, maxLeft)) + 'px';
  bar.classList.toggle('below', below);
}
let barFrame = 0;
document.addEventListener('selectionchange', () => { cancelAnimationFrame(barFrame); barFrame = requestAnimationFrame(updateBar); });
bar.addEventListener('mousedown', e => e.preventDefault()); // keep the selection
bar.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !selAnchor) return;
  const n = newNote(selAnchor, 'highlight', b.dataset.color, '');
  save(); getSelection().removeAllRanges(); bar.hidden = true; render();
  if (b.hasAttribute('data-and-note')) openPop(n.id); else toast(`${labelOf(n)} added`);
});

// Click an existing highlight to open its card (the innermost one if they overlap).
function hlAt(x, y) {
  let best = null, len = Infinity;
  for (const [id, r] of hlRanges) {
    if ([...r.getClientRects()].some(c => x >= c.left && x <= c.right && y >= c.top && y <= c.bottom)) {
      const l = r.toString().length; if (l <= len) { best = id; len = l; }
    }
  }
  return best;
}
document.addEventListener('click', e => {
  if (e.target.closest('#np-layer,#np-panel,#np-rail,#np-selbar,#np-appbar') || !root.contains(e.target)) return;
  const id = hlAt(e.clientX, e.clientY); if (!id) return;
  e.stopPropagation(); // a click on a highlight never toggles a section or follows a row link
  onSingleClick(e, () => openPop(id));
}, true);
document.addEventListener('mousemove', e => { root.classList.toggle('np-over-hl', !!hlAt(e.clientX, e.clientY)); }, { passive: true });

// ================= Panel =================
function setPanel(open) {
  ui.open = open; saveUi();
  document.body.classList.toggle('np-open', open);
  $('#np-toggle').setAttribute('aria-expanded', open);
  if (!open && document.activeElement?.closest('#np-panel')) document.activeElement.blur();
  setTimeout(renderChips, 220); // after the reflow transition
}
$('#np-toggle').addEventListener('click', () => setPanel(!ui.open));
$('#np-close').addEventListener('click', () => setPanel(false));
$$('.np-seg button').forEach(b => b.addEventListener('click', () => { ui.filter = b.dataset.filter; saveUi(); closePop(); render(); }));
$('#np-reset').addEventListener('click', () => {
  for (let i = reportState.applied - 1; i >= 0; i--) applyRewrite([REWRITES[i][1], REWRITES[i][0]]);
  reportState = { applied: 0 }; store.set(REPORT_KEY, reportState);
  DB = seed(); save(); rebuildTargets(); closePop(); closeEditor(); showVersion(); render();
  toast('Sample notes and report restored');
});

function jumpTo(el) {
  const pi = pageOf(el); if (pi >= 0 && pi !== active) go(pi, true);
  const it = el.closest('.accordion-item');
  if (it && !itemOpen(it)) { setOpen(it, true); syncToggles(); }
  el.scrollIntoView({ block: 'center' });
  el.classList.remove('np-jump'); void el.offsetWidth; el.classList.add('np-jump');
  setTimeout(() => el.classList.remove('np-jump'), 1700);
  renderChips();
}
$('#np-list').addEventListener('click', e => {
  if (e.target.closest('.np-pop')) return;
  const card = e.target.closest('.np-card'); if (!card) return;
  if (e.target.closest('[data-act=share]')) { toggleShare(notes.find(x => x.id === card.dataset.id)); return; }
  const id = card.dataset.id, el = resolved.get(id);
  if (el) { jumpTo(el); openPop(id); } else openPopId === id ? closePop() : openPop(id);
});
$('#np-list').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.classList.contains('np-card')) e.target.click(); });

// ---------- Overall note box ----------
addEventListener('scroll', () => requestAnimationFrame(() => { placeRail(); if (!bar.hidden) updateBar(); }), { passive: true });
const BP = [['xs', 0], ['sm', 576], ['md', 768], ['lg', 992], ['xl', 1200], ['xxl', 1400]];
function responsive() {
  const w = innerWidth, mobile = w < 768, rootEl = $('cp-rp-root');
  for (const b of BP) rootEl.classList.toggle('v-' + b[0], b[0] === BP.filter(x => w >= x[1]).pop()[0]);
  rootEl.classList.toggle('v-mobile', mobile); rootEl.classList.toggle('v-desktop', !mobile);
  $$('cp-rp-layout').forEach(l => { l.dataset.cols ??= l.style.gridTemplateColumns; l.style.gridTemplateColumns = mobile ? '1fr' : l.dataset.cols; });
}
responsive();
addEventListener('resize', () => { responsive(); renderChips(); });
const input = $('#np-input');
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    const body = input.value.trim(); if (!body) return;
    newNote(pickOf(OV), 'note', null, body); save(); input.value = ''; render(); toast('Overall note saved');
  } else if (e.key === 'Escape') { input.value = ''; input.blur(); }
});

// ---------- Viewing as (prototype: stands in for who is logged in) ----------
const asSel = $('#np-as');
asSel.innerHTML = USERS.map(u => `<option value="${u.id}">${esc(u.name)} · ${esc(u.role)}</option>`).join('');
asSel.value = ME.id;
function showMe() { $('#np-me-av').outerHTML = avatar(ME).replace('class="np-av"', 'class="np-av" id="np-me-av"'); }
asSel.addEventListener('change', () => {
  ME = USERS.find(u => u.id === asSel.value) || JEFF; ui.as = ME.id; saveUi();
  clearTimeout(toastTimer); $('#np-toast').hidden = true;
  closePop(); closeEditor(); setHover(null); showMe(); render(); toast(`Viewing as ${ME.name}`);
});
showMe();

// ---------- View: Hidden / Margin / Inline (H cycles, remembered) ----------
const VIEWS = ['hidden', 'margin', 'inline'];
function setView(v) { ui.view = v; saveUi(); closePop(); closeEditor(); render(); }
$('#np-view').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) setView(b.dataset.view); });

// ---------- Print: in-page preview of all pages, with or without notes ----------
const printMenu = $('#np-print-menu');
$('#np-print').addEventListener('click', e => { e.stopPropagation(); printMenu.hidden = !printMenu.hidden; });
document.addEventListener('click', () => (printMenu.hidden = true));
printMenu.addEventListener('click', e => { const b = e.target.closest('[data-print]'); if (b) openPreview(b.dataset.print === 'with'); });
function wrapRange(r, bg) { // highlights are CSS Custom Highlights on screen; print needs real <mark>s
  const base = r.commonAncestorContainer.nodeType === 3 ? r.commonAncestorContainer.parentNode : r.commonAncestorContainer;
  const w = document.createTreeWalker(base, NodeFilter.SHOW_TEXT), nodes = [];
  for (let t; (t = w.nextNode());) if (r.intersectsNode(t)) nodes.push(t);
  for (const t of nodes) {
    const a = t === r.startContainer ? r.startOffset : 0, b = t === r.endContainer ? r.endOffset : t.length;
    if (b <= a) continue;
    const mid = t.splitText(a); mid.splitText(b - a);
    const m = document.createElement('mark'); m.className = 'np-mark'; m.style.background = bg;
    mid.replaceWith(m); m.appendChild(mid);
  }
}
function openPreview(withNotes) {
  closePop(); closeEditor(); setHover(null); getSelection().removeAllRanges();
  const keep = ui.view;
  ui.view = withNotes ? 'inline' : 'hidden'; printing = true; render(); printing = false;
  const orig = $$('*', root), clone = root.cloneNode(true), copy = $$('*', clone);
  const twin = el => copy[orig.indexOf(el)];
  const hls = withNotes ? notes.filter(n => n.type === 'highlight' && resolved.get(n.id)).map(n => [n, twin(resolved.get(n.id))]) : [];
  ui.view = keep; render();
  for (const [n, el] of hls) { const r = rangeFor(el, norm(n.quote)); if (r) wrapRange(r, COLORS[n.value]?.[1]); }
  $$('cp-rp-page-menu, #np-layer, cp-rp-accordion-toggle-button, cp-rp-action-menu, .print-section-heading', clone).forEach(x => x.remove());
  if (!withNotes) $$('#np-overall', clone).forEach(x => x.remove());
  $$('cp-rp-page', clone).forEach((pg, i) => {
    pg.classList.add('page-active', 'np-pv-page');
    pg.insertAdjacentHTML('afterbegin', `<h2 class="np-pv-title">${esc(pageName(i))}</h2>`);
    $$('.accordion-item', pg).forEach(it => setOpen(it, true));
  });
  const un = notes.filter(n => !resolved.get(n.id));
  if (withNotes && un.length) clone.insertAdjacentHTML('beforeend', `<section class="np-pv-page np-appendix"><h2 class="np-pv-title">Appendix: Unplaced notes</h2>
    <p class="np-unplaced-why">These notes quote text that is no longer in report v${version()}.</p>
    ${un.map(n => `<div class="np-ap-item"><div class="np-ctx"><b>${esc(n.heading)}</b>${showQuote(n) ? ` › “${esc(n.quote)}”` : ''} · made on v${n.version}</div>${(printing = true, lineHTML(n, 'div'))}</div>`).join('')}</section>`);
  printing = false;
  const pv = document.createElement('div'); pv.id = 'np-preview'; pv.setAttribute('role', 'dialog'); pv.setAttribute('aria-label', 'Print preview');
  pv.innerHTML = `<div class="np-pv-bar"><b>Print preview</b>
      <div class="np-seg"><button type="button" data-pv="with" aria-selected="${withNotes}">With notes</button><button type="button" data-pv="without" aria-selected="${!withNotes}">Without notes</button></div>
      <span class="np-pv-sp"></span>${CAN_PRINT ? '<button type="button" class="np-proto" data-pv="print"><i class="fa-solid fa-print"></i> Print</button>' : '<span class="np-pv-note">Preview only: this view cannot open the print dialog.</span>'}<button type="button" class="np-icon" data-pv="close" aria-label="Close preview"><i class="fa-light fa-xmark"></i></button></div>
    <div class="np-paper"></div>`;
  $('.np-paper', pv).appendChild(clone);
  $('#np-preview')?.remove(); document.body.appendChild(pv); document.body.classList.add('np-printing');
  pv.addEventListener('click', e => {
    const a = e.target.closest('[data-pv]')?.dataset.pv;
    if (a === 'with' || a === 'without') openPreview(a === 'with');
    if (a === 'print' && CAN_PRINT) print();
    if (a === 'close') closePreview();
  });
}
function closePreview() { $('#np-preview')?.remove(); document.body.classList.remove('np-printing'); render(); }

// ---------- Simulate a report update ----------
$('#np-simulate').addEventListener('click', () => {
  if (reportState.applied >= REWRITES.length) return;
  const before = new Set(notes.filter(n => resolved.get(n.id)).map(n => n.id));
  applyRewrite(REWRITES[reportState.applied]);
  reportState.applied++; store.set(REPORT_KEY, reportState);
  rebuildTargets(); closePop(); showVersion(); render();
  const lost = notes.filter(n => before.has(n.id) && !resolved.get(n.id)).length;
  toast(`Report updated to v${version()}. ${lost ? `${lost} note${lost > 1 ? 's' : ''} moved to Unplaced.` : 'All notes still placed.'}`);
});

let toastTimer;
function toast(msg, undo) {
  const t = $('#np-toast');
  t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button type="button">Undo</button>' : ''}`;
  t.hidden = false;
  if (undo) t.querySelector('button').onclick = () => { undo(); t.hidden = true; };
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), undo ? 6000 : 2600);
}

// ---------- Keyboard ----------
document.addEventListener('keydown', e => {
  const typing = e.target.closest?.('input,textarea,select,[contenteditable]') && e.target.type !== 'checkbox';
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
  if ($('#np-preview')) { if (e.key === 'Escape') closePreview(); return; }
  if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setPanel(!ui.open); }
  if (e.key === 'h' || e.key === 'H') { e.preventDefault(); setView(VIEWS[(VIEWS.indexOf(ui.view) + 1) % 3]); toast(`Notes: ${ui.view[0].toUpperCase() + ui.view.slice(1)}`); }
  if (e.key === 'Escape') { closePop(); closeEditor(); }
  if (hoverEl && !e.repeat) {
    const k = e.key.toUpperCase();
    if (k === 'C') { e.preventDefault(); const el = hoverEl; setHover(null); openEditor(pickOf(el)); return; }
    const hit = Object.entries(KEYS).find(([, key]) => key === k);
    if (hit) {
      e.preventDefault();
      const [fam, v] = hit[0].split(':'), val = fam === 'stars' ? +v : v, had = mineOn(hoverEl, fam)?.value === val;
      stamp(hoverEl, fam, val);
      if (!had) toast(`${FAMS[fam].values.find(x => x[0] === val)[1]} · ${headingFor(hoverEl)}`);
    }
  }
});

// ---------- Boot ----------
document.body.classList.add('v-desktop'); // the captured <body> class (the artifact skeleton supplies its own body)
if (!CAN_PRINT) $('#np-print .np-lbl').textContent = ' Print preview';
rebuildTargets();
showVersion();
setPanel(ui.open);
const start = tabs.findIndex(t => '#' + norm(t.textContent).toLowerCase() === location.hash);
go(start < 0 ? 0 : start);
syncToggles();
})();
