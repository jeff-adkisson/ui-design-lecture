/* ===== Notes prototype ===== */
(() => {
  // ---------- Session: users are always logged in ----------
  const USERS = {
    dreyes: { name: 'Dana Reyes', role: 'Hiring manager', color: '#6763b3' },
    mlee: { name: 'Marcus Lee', role: 'District manager', color: '#2f8f83' },
    pshah: { name: 'Priya Shah', role: 'Shift lead', color: '#b35a2a' },
  };
  // Browser storage, or memory for this visit where the host blocks storage (sandboxed frames)
  const store = (() => {
    try { const k = '__probe'; localStorage.setItem(k, k); localStorage.removeItem(k); return localStorage; }
    catch { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; }
  })();
  // Inside a frame the browser's print dialog may be blocked; the preview still works and says how to print
  const framed = (() => { try { return window.top !== window.self; } catch { return true; } })();
  const USER_KEY = 'hm-notes-user';
  let me = USERS[store.getItem(USER_KEY)] ? store.getItem(USER_KEY) : 'dreyes';

  // ---------- Report model ----------
  // Pages come from the page menu. A block is any heading, paragraph, list item, table row, or chart
  // row, plus bare text containers that are not inside one. Notes anchor to page + heading + quote.
  const pages = [...document.querySelectorAll('cp-rp-page')];
  const links = [...document.querySelectorAll('cp-rp-page-menu .nav-link')];
  const pageNames = links.map(l => l.textContent.trim());
  const HEADING = 'h1,h2,h3,h4,h5,h6,[role=heading],.card-header';
  const TARGET = HEADING + ',p,li,tr,.chart-row';
  const LETTER = /\p{L}/u;
  const norm = s => s.replace(/\s+/g, ' ').trim();
  const isChart = el => el.matches('table,svg,canvas,[class*=chart],[class*=score]') || el.tagName.includes('CHART');
  const pageOf = el => pages.findIndex(p => p.contains(el));
  // Rendered, unless hidden only by its page or by a collapsed section
  const shown = (el, stop) => { for (let n = el; n && n !== stop; n = n.parentElement) if (!n.classList.contains('collapse') && getComputedStyle(n).display === 'none') return false; return true; };

  const CAND = new Set();
  const inChart = (el, page) => { for (let a = el.parentElement; a && a !== page; a = a.parentElement) if (isChart(a)) return true; return false; };
  pages.forEach(p => p.querySelectorAll('*').forEach(el => {
    if (el.matches(TARGET) || (!el.parentElement.closest(TARGET) && !inChart(el, p) && [...el.childNodes].some(n => n.nodeType === 3 && LETTER.test(n.data)) && /^(block|list-item|flex|grid)$/.test(getComputedStyle(el).display))) CAND.add(el);
  }));
  // The block's own words: skip nested blocks and charts (scores change, wording rarely does)
  const ownText = el => { const out = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) { let a = n.parentElement; while (a !== el && !CAND.has(a) && !isChart(a)) a = a.parentElement; if (a === el) out.push(n.data); }
    return norm(out.join(' ')); };
  const QUOTE = new Map();
  const label = h => { const w = document.createTreeWalker(h, NodeFilter.SHOW_TEXT); for (let t; (t = w.nextNode());) if (norm(t.data)) return norm(t.data); return ''; };
  CAND.forEach(el => { const q = el.matches(HEADING) ? label(el) : ownText(el); if (LETTER.test(q) && shown(el, pages[pageOf(el)])) QUOTE.set(el, q); });
  const headingOf = el => {
    const page = pages[pageOf(el)];
    for (let n = el; n && n !== page; n = n.parentElement) {
      if (n.matches(HEADING) && shown(n, page)) return label(n);
      for (let s = n.previousElementSibling; s; s = s.previousElementSibling) {
        const h = [s, ...s.querySelectorAll(HEADING)].filter(x => x.matches(HEADING) && shown(x, page)).pop();
        if (h) return label(h);
      }
    }
    return pageNames[pageOf(el)] || '';
  };
  const HEAD = new Map([...QUOTE.keys()].map(b => [b, headingOf(b)]));
  const BY_PAGE = pages.map(p => [...p.querySelectorAll('*')].filter(e => QUOTE.has(e)));
  const anchorFor = b => ({ page: pageNames[pageOf(b)], heading: HEAD.get(b), quote: QUOTE.get(b) });

  const resCache = new Map();
  // Best block for an anchor: exact quote beats contained quote; same heading breaks ties
  const resolve = a => {
    const k = JSON.stringify([a.page, a.heading, a.quote]);
    if (resCache.has(k)) return resCache.get(k);
    const i = pageNames.indexOf(a.page);
    let best = null, top = 0;
    if (a.quote) for (const b of i >= 0 ? BY_PAGE[i] : BY_PAGE.flat()) {
      const q = QUOTE.get(b), s = q === a.quote ? 4 : q.includes(a.quote) ? 2 : 0;
      if (s && s + (HEAD.get(b) === a.heading) > top) { best = b; top = s + (HEAD.get(b) === a.heading); }
    }
    resCache.set(k, best);
    return best;
  };
  // Highlights: each page gets an index of its visible non-space characters, so quotes match
  // whatever whitespace the selection or a later report version carries.
  const strip = s => s.replace(/\s+/g, '');
  const IDX = [];
  const index = i => IDX[i] ||= (() => {
    const nodes = []; let text = '';
    const w = document.createTreeWalker(pages[i], NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) {
      if (!shown(n.parentElement, pages[i]) || n.parentElement.closest('.n-callouts')) continue;
      const offs = []; for (let k = 0; k < n.data.length; k++) if (!/\s/.test(n.data[k])) offs.push(k);
      if (offs.length) { nodes.push({ node: n, base: text.length, offs }); text += offs.map(k => n.data[k]).join(''); }
    }
    return { nodes, text };
  })();
  const charAt = (ix, k) => { let lo = 0, hi = ix.nodes.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (ix.nodes[m].base <= k) lo = m; else hi = m - 1; } const t = ix.nodes[lo]; return [t.node, t.offs[k - t.base]]; };
  const idxRange = (ix, a, b) => { const r = document.createRange(); const [n1, o1] = charAt(ix, a), [n2, o2] = charAt(ix, b - 1); r.setStart(n1, o1); r.setEnd(n2, o2 + 1); return r; };
  const rangeToIdx = (range, ix) => {
    let a = -1, b = -1;
    for (const t of ix.nodes) {
      if (!range.intersectsNode(t.node)) continue;
      t.offs.forEach((o, j) => { if (range.comparePoint(t.node, o) >= 0 && range.comparePoint(t.node, o + 1) <= 0) { if (a < 0) a = t.base + j; b = t.base + j + 1; } });
    }
    return [a, b];
  };
  const elOf = node => node.nodeType === 1 ? node : node.parentElement;
  const headOf = el => HEAD.get(el) ?? headingOf(el);
  const CONTEXT = 32;
  const anchorFromRange = range => {
    const pi = pageOf(elOf(range.commonAncestorContainer)); if (pi < 0) return null;
    const ix = index(pi), [a, b] = rangeToIdx(range, ix); if (a < 0) return null;
    const r = idxRange(ix, a, b), el = blockAt(elOf(r.startContainer)) || elOf(r.startContainer);
    const text = q => { const f = q.cloneContents(); f.querySelectorAll('.n-callouts').forEach(e => e.remove()); return norm(f.textContent); }; // never quote our own callouts
    const around = (x, y) => x >= y ? '' : text(idxRange(ix, x, y));
    const pre = around(Math.max(0, a - CONTEXT), a), suf = around(b, Math.min(ix.text.length, b + CONTEXT));
    return { page: pageNames[pi], heading: headOf(el), quote: text(r), prefix: pre, suffix: suf };
  };
  // Every occurrence of the quote is a candidate; the one with the most matching context wins
  const locateText = a => {
    const q = strip(a.quote || ''), pre = strip(a.prefix || ''), suf = strip(a.suffix || '');
    if (!q) return null;
    const i = pageNames.indexOf(a.page);
    let best = null, top = -1;
    for (const pi of i >= 0 ? [i] : pages.map((_, k) => k)) {
      const ix = index(pi);
      for (let at = ix.text.indexOf(q); at >= 0; at = ix.text.indexOf(q, at + 1)) {
        let sc = 0;
        while (sc < pre.length && ix.text[at - 1 - sc] === pre[pre.length - 1 - sc]) sc++;
        let k = 0; while (k < suf.length && ix.text[at + q.length + k] === suf[k]) k++;
        const range = idxRange(ix, at, at + q.length), el = blockAt(elOf(range.startContainer)) || elOf(range.startContainer);
        const score = sc + k + (headOf(el) === a.heading ? 10 : 0);
        if (score > top) { top = score; best = { el, range }; }
      }
    }
    return best;
  };
  const locCache = new Map();
  const locate = n => {
    if (isOverall(n)) return null;
    const k = n.type === 'highlight' ? JSON.stringify(n.anchor) : null;
    if (!k) { const el = resolve(n.anchor); return el ? { el, range: null } : null; }
    if (!locCache.has(k)) locCache.set(k, locateText(n.anchor));
    return locCache.get(k);
  };
  const blockAt = t => { for (let n = t; n && n !== document.body; n = n.parentElement) if (QUOTE.has(n)) return n; return null; };

  const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(16).padStart(8, '0'); };
  const REPORT_VERSION = 'r-' + fnv(pages.map(p => norm(p.textContent)).join('\n'));

  // ---------- Note types ----------
  const FAM = {
    thumbs: { name: 'Thumbs', values: [['up', '👍', 'Thumbs up'], ['down', '👎', 'Thumbs down']] },
    stars: { name: 'Stars', values: [1, 2, 3, 4, 5].map(n => [n, '★', n === 1 ? '1 star' : n + ' stars']) },
    marker: { name: 'Markers', values: [['question', '❓', 'Follow up'], ['flag', '🚩', 'Flag'], ['bomb', '💣', 'Deal breaker'], ['fire', '🔥', 'Strong'], ['clap', '👏', 'Great answer']] },
    highlight: { name: 'Highlight', values: [['yellow', '', 'Yellow highlight'], ['green', '', 'Green highlight'], ['blue', '', 'Blue highlight'], ['pink', '', 'Pink highlight']] },
  };
  const SVG = {
    thumbs: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true"><path d="M2 7h2.5v6.5H2zM4.5 7.5 7.3 2.2c1 0 1.8.9 1.5 1.9L8.2 6.5h4.4c.9 0 1.5.8 1.3 1.7l-1.1 4.3c-.2.6-.7 1-1.3 1H4.5"/></svg>',
    stars: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true"><path d="m8 1.8 1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z"/></svg>',
    marker: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 14.5V2M3.5 2.5h9l-2.2 3.2 2.2 3.3h-9"/></svg>',
    note: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 2.5h11v7l-4 4h-7z"/><path d="M9.5 13.5v-4h4M5 6h6M5 8.5h3"/></svg>',
    highlighter: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true"><path d="M10 2.2 13.8 6l-5.6 5.6H5.4v-2.8zM7.4 4.8l3.8 3.8M5.4 11.6 3 14h4.2"/></svg>',
    lock: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>',
  };
  const valOf = n => FAM[n.type]?.values.find(v => v[0] === n.value);
  const swatch = c => `<span class="n-sw n-sw-${esc(c)}" aria-hidden="true"></span>`;
  const iconOf = n => n.type === 'note' ? SVG.note : n.type === 'highlight' ? swatch(n.value) + SVG.highlighter : n.type === 'stars' ? `<span class="n-star">★</span>${n.value}` : valOf(n)?.[1] || '?';
  const labelOf = n => n.type === 'note' ? 'Note' : valOf(n)?.[2] || n.type;

  // ---------- Storage: per report, seeded once ----------
  const KEY = 'hm-notes:v5:' + location.pathname;
  const now = () => new Date().toISOString();
  // Every note carries heading, quote, type, value, author, time, and report version, so it can be summarised later
  const OVERALL_ANCHOR = { page: null, heading: 'Overall', quote: '' };
  const seed = () => {
    const ago = m => new Date(Date.now() - m * 60000).toISOString();
    const S = (author, mins, type, value, body, page, heading, quote, vis = 'shared', version = REPORT_VERSION, context) =>
      ({ author, created: ago(mins), updated: ago(mins), type, value, body, visibility: vis, scope: 'inline', anchor: { page, heading, quote, ...context }, reportVersion: version });
    const O = (author, mins, type, value, body, vis = 'shared') => ({ author, created: ago(mins), updated: ago(mins), type, value, body, visibility: vis, scope: 'overall', anchor: OVERALL_ANCHOR, reportVersion: REPORT_VERSION });
    const H = (author, mins, color, body, page, heading, prefix, quote, suffix, vis = 'shared') => S(author, mins, 'highlight', color, body, page, heading, quote, vis, REPORT_VERSION, { prefix, suffix });
    return [
      // overall
      O('mlee', 100, 'stars', 3, ''),
      O('mlee', 99, 'marker', 'flag', 'Check references on pace before any offer.'),
      O('mlee', 95, 'note', null, 'Would move to a second interview with the district manager.'),
      O('dreyes', 30, 'thumbs', 'up', ''),
      O('dreyes', 29, 'stars', 4, 'Strong on process and food safety. Needs a plan for pace.'),
      O('dreyes', 25, 'note', null, 'Leaning yes for Riverside if references confirm pace.', 'private'),
      O('pshah', 60, 'thumbs', 'up', 'The crew would follow this person.'),
      O('pshah', 59, 'stars', 4, ''),
      O('pshah', 58, 'note', null, 'Asked good questions about our closing checklist.'),
      O('pshah', 50, 'note', null, 'Compare with the other Riverside candidate before I vote.', 'private'),
      // before the interview
      S('dreyes', 1560, 'marker', 'question', 'Furthest below the ideal range. Spend the most interview time here.', 'Summary', 'Personality', 'Persistence'),
      S('mlee', 1400, 'marker', 'flag', '', 'Summary', 'Personality', 'Optimism'),
      S('mlee', 1320, 'note', null, 'GM role has a hard nightly close-out. Ask how they handle the dinner rush when two people call out.', 'Details', 'Persistence', "Jack has a low sense of urgency and likely doesn't feel the need to push themself hard."),
      H('dreyes', 1500, 'yellow', 'This is the crux for a GM role.', 'Details', 'Persistence', 'Jack has a', 'low sense of urgency', "and likely doesn't feel the need"),
      H('mlee', 1310, 'pink', '', 'Details', 'Optimism', '', 'Jack is occasionally reserved with their positive judgements and is sometimes skeptical.', 'They tend to see the benefits'),
      S('mlee', 1300, 'marker', 'fire', 'Clear strength. Useful for the Riverside store, which has had three managers this year.', 'Details', 'Resilience', 'Resilience'),
      S('pshah', 1250, 'thumbs', 'down', 'Our store depends on tight inventory counts.', 'Details', 'Organization', 'Jack makes an effort to stay organized, but may keep organization as a low priority overall.'),
      S('mlee', 1240, 'note', null, 'Not sure the Riverside crew can carry this yet.', 'Details', 'Optimism', 'Jack may struggle more than their colleagues in challenging situations', 'private'),
      S('dreyes', 1200, 'note', null, 'Matches what I heard on the phone screen: "I usually just figure it out."', 'Details', 'Team-oriented', "Jack may not go out of their way to seek other's input on their work.", 'private'),
      // during the interview
      S('dreyes', 140, 'stars', 5, 'Caught the closing crew backfilling the food-safety temperature log and retrained them the same week.', 'Interview', 'Rule-Consciousness', "Give an example of a time where you noticed that others weren't adhering to an important rule"),
      S('dreyes', 139, 'marker', 'clap', '', 'Interview', 'Rule-Consciousness', "Give an example of a time where you noticed that others weren't adhering to an important rule"),
      S('dreyes', 128, 'stars', 3, 'Freezer failed mid-shift: moved stock to the sister store and comped two orders. Needed a prompt before describing any follow-up.', 'Interview', 'Persistence', 'Tell me about a time when you had to reprioritize to handle a project that required immediate attention.'),
      S('dreyes', 115, 'marker', 'question', 'Sounded more upbeat than the score suggests. Check with references.', 'Interview', 'Optimism', 'Can you describe a time when you encountered a setback within a team project?', 'private'),
      S('mlee', 110, 'thumbs', 'up', '', 'Interview', 'Team-oriented', 'In challenging situations do you prefer to consult with others'),
      H('pshah', 125, 'green', 'Uses a paper checklist taped inside the office door. Practical.', 'Interview', 'Organization', '', 'How do you approach organizing your workspace, responsibilities, and time?', 'Do you use any specific strategies'),
      S('pshah', 105, 'marker', 'question', 'Ran out of time. Ask in the second interview.', 'Interview', 'Resilience', "Suppose you're collaborating with someone and they make a mistake"),
      // after the interview
      H('dreyes', 40, 'blue', 'Put this in the 30-60-90 plan.', 'Develop', 'Persistence', 'Set clear goals and deadlines to', 'create a sense of urgency', 'to accomplish your work efficiently'),
      S('dreyes', 35, 'note', null, 'Good first-30-days item: 15-minute opening checklist with the shift lead.', 'Develop', 'Organization', 'Establish a set time for planning and organizing your work each day.'),
      S('pshah', 30, 'note', null, 'I could pair with Jack on this during onboarding.', 'Develop', 'Team-oriented', 'A central idea to collaborating effectively is taking the necessary time to talk through differences', 'private'),
      // written against an earlier version of the report; that sentence is gone now
      S('mlee', 9000, 'thumbs', 'up', 'Good sign for inventory days.', 'Details', 'Organization', 'Jack keeps a tidy workspace and plans the week ahead.', 'shared', 'r-0a41c9e2'),
    ].map((n, i) => ({ id: 'seed-' + (i + 1), ...n }));
  };
  const load = () => { try { const v = JSON.parse(store.getItem(KEY)); if (Array.isArray(v)) return v; } catch {} const s = seed(); store.setItem(KEY, JSON.stringify(s)); return s; };
  let notes = load();
  const visibleNotes = () => notes.filter(n => n.author === me || n.visibility === 'shared');
  const isOverall = n => n.scope === 'overall';
  const inlineNotes = () => visibleNotes().filter(n => !isOverall(n));
  const byPerson = (a, b) => (a.author === me ? 0 : 1) - (b.author === me ? 0 : 1) || a.author.localeCompare(b.author);
  const overallNotes = () => visibleNotes().filter(isOverall).sort((a, b) => (a.type === 'note') - (b.type === 'note') || (a.type !== 'note' ? byPerson(a, b) || ['thumbs', 'stars', 'marker'].indexOf(a.type) - ['thumbs', 'stars', 'marker'].indexOf(b.type) : new Date(a.created) - new Date(b.created)));
  const save = () => { store.setItem(KEY, JSON.stringify(notes)); render(); };
  const add = (props, block, anchor) => { const n = { id: crypto.randomUUID(), author: me, created: now(), updated: now(), visibility: 'private', body: '', ...props, scope: 'inline', anchor: anchor || anchorFor(block), reportVersion: REPORT_VERSION }; notes.push(n); save(); return n; };
  const addOverall = props => { const n = { id: crypto.randomUUID(), author: me, created: now(), updated: now(), visibility: 'private', body: '', ...props, scope: 'overall', anchor: { ...OVERALL_ANCHOR }, reportVersion: REPORT_VERSION }; notes.push(n); save(); return n; };
  // The only ways to change or delete a note. Both refuse a note the current user does not own, whoever calls them.
  const owns = n => !!n && n.author === me;
  const refuse = n => { console.warn(`Refused: note ${n?.id} belongs to ${n?.author}, current user is ${me}`); toast(`Only ${user(n?.author).name} can change this note`); return false; };
  const EDITABLE = ['body', 'value', 'visibility'];
  const update = (n, changes) => {
    if (!owns(n)) return refuse(n);
    for (const k of EDITABLE) if (k in changes) n[k] = changes[k];
    n.updated = now(); save(); return true;
  };
  const remove = n => {
    if (!owns(n)) return refuse(n);
    notes = notes.filter(x => x.id !== n.id); save();
    toast(`${labelOf(n)} removed`, () => { if (owns(n) && !notes.includes(n)) { notes.push(n); save(); } else refuse(n); });
    return true;
  };
  // One stamp per family per person, on a block or on the report overall
  const myStamp = (target, type) => !target ? null : notes.find(n => n.author === me && n.type === type && (target === 'overall' ? isOverall(n) : !isOverall(n) && n.type !== 'highlight' && resolve(n.anchor) === target));
  const stamp = (target, f, v) => {
    const mine = myStamp(target, f);
    if (mine && mine.value === v) remove(mine);                     // same value removes
    else if (mine) update(mine, { value: v });                       // new value replaces
    else if (target === 'overall') addOverall({ type: f, value: v });
    else add({ type: f, value: v }, target);
  };

  // ---------- Small helpers ----------
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mk = (cls, html = '') => { const e = document.createElement('div'); e.className = cls; e.innerHTML = html; return e; };
  const initials = n => n.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const user = id => USERS[id] || { name: id, color: '#888' };
  const avatar = id => `<span class="n-av" style="background:${user(id).color}" aria-hidden="true">${esc(initials(user(id).name))}</span>`;
  const who = n => n.author === me ? 'You' : user(n.author).name;
  const shareBtn = n => !owns(n) ? '' : n.visibility === 'shared'
    ? `<button type="button" class="n-share is-shared" data-share="${esc(n.id)}" title="Everyone who can open this report sees this note. Click to make it private.">Shared · make private</button>`
    : `<button type="button" class="n-share" data-share="${esc(n.id)}" title="Only you see this note. Click to share it with everyone who can open this report.">${SVG.lock}Private · share</button>`;
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const when = iso => { const s = (Date.now() - new Date(iso)) / 1000;
    if (s < 60) return 'just now'; if (s < 3600) return rtf.format(-Math.round(s / 60), 'minute');
    if (s < 86400) return rtf.format(-Math.round(s / 3600), 'hour'); if (s < 7 * 86400) return rtf.format(-Math.round(s / 86400), 'day');
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };
  const meta = n => `<span class="n-meta">${avatar(n.author)}<span>${esc(who(n))}</span><time datetime="${esc(n.created)}" title="${esc(new Date(n.created).toLocaleString())}">${esc(when(n.created))}</time>${shareBtn(n)}</span>`;
  const autosize = ta => { const f = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; }; ta.addEventListener('input', f); f(); };
  const pos = o => o.range || o.el;
  const docOrder = (a, b) => {
    if (a.range && b.range) { const c = a.range.compareBoundaryPoints(Range.START_TO_START, b.range); if (c) return c; }
    if (a.el !== b.el) { const x = a.range ? a.range.startContainer : a.el, y = b.range ? b.range.startContainer : b.el; if (x !== y) return x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; }
    return new Date(a.n.created) - new Date(b.n.created);
  };
  const activePage = () => pages.findIndex(p => p.classList.contains('page-active'));

  // ---------- Chrome: app bar, sticky offsets ----------
  const report = document.querySelector('body > :not(.n-appbar):not(.n-panel):not(script)');
  report.classList.add('n-report');
  document.getElementById('n-candidate').textContent = document.title.split(' | ')[0];
  const asSel = document.getElementById('n-as');
  asSel.innerHTML = Object.entries(USERS).map(([id, u]) => `<option value="${id}">${esc(u.name)} (${esc(u.role)})</option>`).join('');
  const showUser = () => { asSel.value = me; document.getElementById('n-user-av').innerHTML = avatar(me); };
  showUser();
  const bar = document.querySelector('.n-appbar');
  const STICKY = [...report.querySelectorAll('*')].filter(el => getComputedStyle(el).position === 'sticky');
  STICKY.forEach(el => { el.style.top = (parseFloat(getComputedStyle(el).top) || 0) + bar.offsetHeight + 'px'; });
  const visibleTop = () => Math.max(bar.getBoundingClientRect().bottom, ...STICKY.map(s => s.getBoundingClientRect().bottom));
  const stuckHeight = () => bar.offsetHeight + STICKY.reduce((h, s) => h + s.offsetHeight, 0);

  // ---------- Toast with undo ----------
  let toastEl = null, toastT = 0;
  function toast(text, undo) {
    toastEl?.remove(); clearTimeout(toastT);
    toastEl = mk('n-toast', `<span>${esc(text)}</span>${undo ? '<button type="button">Undo</button>' : ''}`);
    toastEl.setAttribute('role', 'status');
    if (undo) toastEl.querySelector('button').onclick = () => { toastEl.remove(); undo(); };
    document.body.append(toastEl);
    toastT = setTimeout(() => toastEl?.remove(), 6000);
  }

  // ---------- Popovers: note editor and edit card (one at a time) ----------
  let pop = null; // { el, commit, note?, block? }
  function closePop(commit) {
    if (!pop) return;
    const p = pop; pop = null;
    p.el.remove(); p.block?.classList.remove('n-target');
    chips.querySelector('.n-chip.open')?.classList.remove('open');
    if (commit) p.commit();
  }
  document.addEventListener('pointerdown', e => {
    if (pop && !pop.el.contains(e.target) && !(pop.note && e.target.closest?.(`:is(.n-chip, .n-callout, .n-ov-item)[data-id="${CSS.escape(pop.note.id)}"]`))) closePop(true);
  }, true);

  // Popovers sit beside what they belong to: below it, else above it, else below with the page scrolled to fit.
  // They never sit on top of it, and never leave the visible area.
  function placePop(el, a, x) {
    const W = el.offsetWidth, H = el.offsetHeight, top = visibleTop() + 6, bottom = innerHeight - 6;
    const right = Math.min(innerWidth, pages[activePage()].parentElement.getBoundingClientRect().right) - 4;
    let y = a.bottom + 6;
    if (y + H > bottom) {
      if (a.top - 6 - H >= top) y = a.top - 6 - H;
      else { const by = y + H - bottom; scrollBy({ top: by, behavior: 'instant' }); y -= by; }
    }
    el.style.left = Math.max(8, Math.min(x, right - W)) + scrollX + 'px';
    el.style.top = y + scrollY + 'px';
  }

  function openEditor(block) {
    closePop(true); hideRail();
    const r = block.getBoundingClientRect(), box = block.closest('cp-rp-page').parentElement.getBoundingClientRect();
    const ed = mk('n-editor', `<textarea rows="1" placeholder="Write a note" aria-label="Note on this block"></textarea><div class="n-hint">Enter to save, Shift+Enter for a new line, Esc to cancel</div>`);
    const left = Math.max(r.left, box.left + 8);
    ed.style.width = Math.max(240, Math.min(Math.max(r.width, 300), 520, box.right - left - 8)) + 'px';
    document.body.append(ed);
    const ta = ed.querySelector('textarea');
    autosize(ta);
    placePop(ed, r, left);
    pop = { el: ed, block, commit: () => { const t = ta.value.trim(); if (t) add({ type: 'note', value: null, body: t }, block); } };
    block.classList.add('n-target');
    ta.focus({ preventScroll: true });
    ta.addEventListener('keydown', e => {
      if (e.isComposing) return;
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); closePop(true); }
      else if (e.key === 'Escape') { e.preventDefault(); closePop(false); }
    });
  }

  function openCard(n, near) {
    closePop(true); hideRail();
    const id = CSS.escape(n.id), loc = locate(n), block = loc?.el;
    const chip = chips.querySelector(`.n-chip[data-id="${id}"]`);
    const shown = e => e && e.getClientRects().length;
    // What the card belongs to and must not cover: its block, the overall card, or failing those its panel row
    const anchorEl = [isOverall(n) ? ovCard : block, list.querySelector(`.n-row[data-id="${id}"]`)].find(shown);
    if (!anchorEl) return;
    const mine = n.author === me, hl = n.type === 'highlight';
    const vals = n.type === 'note' ? '' : mine
      ? `<div class="n-vals" role="group" aria-label="${FAM[n.type].name}">${FAM[n.type].values.map(([v, icon, lab]) => `<button type="button" class="n-fv${n.type === 'stars' ? ' n-fs' : ''}${hl ? ' n-fsw' : ''}" data-v="${v}" title="${lab}" aria-label="${lab}" aria-pressed="${n.value === v}">${hl ? swatch(v) : icon}</button>`).join('')}</div>`
      : `<div class="n-val">${iconOf(n)} ${esc(labelOf(n))}</div>`;
    const card = mk('n-pop', `
      <div class="n-pop-head">${avatar(n.author)}<b>${esc(who(n))}</b><span>${esc(when(n.created))}</span>${shareBtn(n)}<button type="button" class="n-x" aria-label="Close">×</button></div>
      ${mine ? '' : `<p class="n-ro">${esc(user(n.author).name)}'s note. Only ${esc(user(n.author).name.split(' ')[0])} can change it.</p>`}
      ${vals}
      ${mine ? `<textarea rows="1" placeholder="${n.type === 'note' ? 'Write a note' : 'Add a comment'}" aria-label="Note text">${esc(n.body)}</textarea>
        <div class="n-pop-foot"><button type="button" class="n-del">${hl ? 'Remove highlight' : 'Delete'}</button><span class="n-hint">Enter to save, Esc to close</span></div>`
        : n.body ? `<p class="n-pop-body">${esc(n.body)}</p>` : ''}`);
    card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', `${labelOf(n)} by ${who(n)}`);
    document.body.append(card);
    const place = () => { const a = anchorEl.getBoundingClientRect(); placePop(card, a, near ? near.left : shown(chip) ? chip.getBoundingClientRect().right - card.offsetWidth : a.left); };
    chip?.classList.add('open');
    const ta = card.querySelector('textarea');
    pop = { el: card, note: n, block: hl ? null : block, commit: () => {
      if (!ta || !notes.includes(n)) return;
      const t = ta.value.trim();
      if (t === (n.body || '')) return;
      if (n.type === 'note' && !t) return remove(n);
      if (hl && !t && !n.body) return;
      update(n, { body: t });
    } };
    if (!hl) block?.classList.add('n-target');
    if (n.type === 'stars') litStars(card, n.value);
    card.querySelector('.n-x').onclick = () => closePop(true);
    card.querySelector('.n-del')?.addEventListener('click', () => { closePop(false); remove(n); });
    card.querySelector('.n-vals')?.addEventListener('click', e => {
      const b = e.target.closest('.n-fv'); if (!b) return;
      const v = n.type === 'stars' ? +b.dataset.v : b.dataset.v;
      if (v === n.value) { if (hl) return; closePop(true); if (notes.includes(n)) remove(n); return; } // recolouring never removes a highlight
      if (!update(n, { value: v })) return;
      card.querySelectorAll('.n-fv').forEach(x => x.setAttribute('aria-pressed', x === b));
      if (n.type === 'stars') litStars(card, v);
      chips.querySelector(`.n-chip[data-id="${CSS.escape(n.id)}"]`)?.classList.add('open');
    });
    if (n.type === 'stars') starHover(card.querySelector('.n-vals'), () => n.value);
    if (ta) autosize(ta);
    place();                                   // after the text box has its real height
    if (ta) {
      ta.focus({ preventScroll: true }); ta.setSelectionRange(ta.value.length, ta.value.length);
      ta.addEventListener('keydown', e => {
        if (e.isComposing) return;
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); closePop(true); }
        else if (e.key === 'Escape') { e.preventDefault(); closePop(false); }
      });
    }
  }
  const litStars = (root, k) => root.querySelectorAll('.n-fs').forEach(s => s.classList.toggle('lit', +s.dataset.v <= k));
  const starHover = (row, current) => {
    row?.addEventListener('pointerover', e => { const s = e.target.closest('.n-fs'); if (s) litStars(row, +s.dataset.v); });
    row?.addEventListener('pointerleave', () => litStars(row, current() || 0));
  };

  // ---------- Hover rail and flyouts ----------
  const rail = mk('n-rail', ['thumbs', 'stars', 'marker'].map(f =>
    `<button type="button" class="n-rb" data-fam="${f}" aria-haspopup="true" title="${FAM[f].name}: hover to choose, click to clear">${SVG[f]}</button>`).join('')
    + `<button type="button" class="n-rb" data-fam="note" title="Add a note">${SVG.note}</button>`);
  rail.setAttribute('role', 'toolbar'); rail.setAttribute('aria-label', 'Annotate this block');
  const fly = mk('n-fly'); fly.setAttribute('role', 'group');
  document.body.append(rail, fly);
  let cur = null, pt = { x: -1, y: -1 }, hideT = 0, flyT = 0, flyFam = null, flyTarget = null;

  function refreshRail() {
    rail.querySelectorAll('[data-fam]').forEach(b => {
      const f = b.dataset.fam; if (f === 'note') return;
      const mine = cur && myStamp(cur, f);
      b.classList.toggle('set', !!mine);
      b.innerHTML = mine ? iconOf(mine) : SVG[f];
      b.setAttribute('aria-label', mine ? `${labelOf(mine)}. Click to clear` : `${FAM[f].name}: choose a value`);
    });
  }
  // Where a block's first line of text starts (cached as an offset from the block's left edge)
  const textOffset = new Map();
  addEventListener('resize', () => textOffset.clear());
  const textLeft = b => {
    const left = b.getBoundingClientRect().left;
    if (!textOffset.has(b)) {
      const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
      for (let t; (t = w.nextNode());) if (t.data.trim()) { const g = document.createRange(); g.selectNodeContents(t); const c = g.getClientRects()[0]; if (c) { textOffset.set(b, c.left - left); break; } }
    }
    return left + (textOffset.get(b) ?? 0);
  };
  function placeRail() {
    const r = cur.getBoundingClientRect(), H = rail.offsetHeight, W = rail.offsetWidth;
    let y = Math.min(Math.max(pt.y - H / 2, r.top), Math.max(r.top, r.bottom - H)); // follow the pointer inside the block
    y = Math.min(Math.max(y, visibleTop() + 4), innerHeight - H - 4);               // never leave the visible area
    let x = r.left;                                                                 // stay clear of text the rail spans
    for (const b of BY_PAGE[activePage()] || []) { if (b === cur) continue; const br = b.getBoundingClientRect(); if (br.height && br.bottom > y && br.top < y + H) x = Math.min(x, textLeft(b)); }
    rail.style.transform = `translate(${Math.max(4, x - W - 6)}px, ${y}px)`;
    rail.classList.add('on');
  }
  function hideRail() { clearTimeout(hideT); rail.classList.remove('on'); if (flyTarget !== 'overall') closeFly(); cur = null; }
  const hideSoon = () => { clearTimeout(hideT); hideT = setTimeout(hideRail, 350); };
  const inRect = (r, pad = 0) => pt.x >= r.left - pad && pt.x <= r.right + pad && pt.y >= r.top - pad && pt.y <= r.bottom + pad;
  // While travelling from the block to the rail or an open flyout, keep the current block
  function holding() {
    if (!cur || !rail.classList.contains('on')) return false;
    const r = rail.getBoundingClientRect(), b = cur.getBoundingClientRect();
    if (pt.x >= r.left - 2 && pt.x <= b.left + 2 && pt.y >= r.top - 6 && pt.y <= r.bottom + 6) return true;
    if (fly.classList.contains('on')) { const f = fly.getBoundingClientRect(); return inRect({ left: r.left, right: f.right, top: Math.min(r.top, f.top), bottom: Math.max(r.bottom, f.bottom) }, 6); }
    return false;
  }
  function onPoint(t) {
    if (pop || !t) return;
    if (t.closest?.('.n-rail, .n-fly')) { clearTimeout(hideT); return; }
    const b = t.closest?.('.n-callouts, .n-overall') ? null : blockAt(t);
    // Hold the current block on the way to its rail, but never while over a different block
    if (holding() && (!b || b === cur || b.contains(cur))) { clearTimeout(hideT); return; }
    if (t.closest?.('.n-callouts, .n-overall')) return hideSoon();
    if (!b) return hideSoon();
    clearTimeout(hideT);
    if (b !== cur) { cur = b; closeFly(); refreshRail(); }
    placeRail();
  }
  addEventListener('pointermove', e => { pt = { x: e.clientX, y: e.clientY }; onPoint(e.target); }, { passive: true });
  addEventListener('scroll', () => { if (cur) onPoint(document.elementFromPoint(pt.x, pt.y)); }, { passive: true });
  document.documentElement.addEventListener('pointerleave', hideSoon);

  function openFly(f, btn, target = cur, below = false) {
    clearTimeout(flyT);
    if (flyFam === f && flyTarget === target && fly.classList.contains('on')) return;
    flyFam = f; flyTarget = target;
    const mine = myStamp(target, f);
    fly.innerHTML = FAM[f].values.map(([v, icon, lab]) => `<button type="button" class="n-fv${f === 'stars' ? ' n-fs' : ''}" data-v="${v}" title="${lab}" aria-label="${lab}" aria-pressed="${mine?.value === v}">${icon}</button>`).join('');
    fly.setAttribute('aria-label', FAM[f].name);
    if (f === 'stars') litStars(fly, mine?.value || 0);
    document.querySelectorAll('.n-rb.hot').forEach(b => b.classList.remove('hot')); btn.classList.add('hot');
    const r = btn.getBoundingClientRect(), rr = rail.getBoundingClientRect();
    let x, y;
    if (below) { x = Math.min(Math.max(8, r.left + r.width / 2 - fly.offsetWidth / 2), innerWidth - fly.offsetWidth - 8); y = r.bottom + 4; }
    else {
      // In the empty margin left of the rail when there is one, so the block stays readable;
      // with the report against the window edge there is no margin, and it sits to the right of the rail
      fly.classList.add('n-fly-col');
      const vt = visibleTop() + 4, vb = innerHeight - 4;
      if (rr.left - 4 - fly.offsetWidth >= 4) { x = rr.left - 4 - fly.offsetWidth; y = r.top - 3; }   // runs down the margin from the hovered icon
      else { fly.classList.remove('n-fly-col'); x = rr.right + 4; y = r.top + r.height / 2 - fly.offsetHeight / 2; }
      y = Math.min(Math.max(y, vt), vb - fly.offsetHeight);
    }
    fly.style.transform = `translate(${x}px, ${y}px)`;
    fly.classList.add('on');
  }
  function closeFly() { flyFam = null; flyTarget = null; fly.classList.remove('on', 'n-fly-col'); document.querySelectorAll('.n-rb.hot').forEach(b => b.classList.remove('hot')); }
  starHover(fly, () => myStamp(flyTarget, 'stars')?.value || 0);
  rail.addEventListener('pointerover', e => { const b = e.target.closest('.n-rb'); if (!b) return; b.dataset.fam === 'note' ? closeFly() : openFly(b.dataset.fam, b); });
  [rail, fly].forEach(x => {
    x.addEventListener('pointerenter', () => clearTimeout(flyT));
    x.addEventListener('pointerleave', e => { if (!e.relatedTarget?.closest?.('.n-rail, .n-fly, .n-strip')) flyT = setTimeout(closeFly, 250); });
  });
  // Overall rating strip: same flyouts, same clear-on-click rule
  document.addEventListener('pointerover', e => { const b = e.target.closest?.('.n-strip [data-ofam]'); if (b) openFly(b.dataset.ofam, b, 'overall', true); });
  document.addEventListener('pointerout', e => { if (e.target.closest?.('.n-strip') && !e.relatedTarget?.closest?.('.n-strip, .n-fly')) { clearTimeout(flyT); flyT = setTimeout(closeFly, 250); } });
  document.addEventListener('click', e => { const b = e.target.closest?.('.n-strip [data-ofam]'); if (!b) return; const m = myStamp('overall', b.dataset.ofam); if (m) { remove(m); closeFly(); } });
  rail.addEventListener('click', e => {
    const b = e.target.closest('.n-rb'); if (!b || !cur) return;
    const f = b.dataset.fam;
    if (f === 'note') return openEditor(cur);
    const mine = myStamp(cur, f);          // the family icon only clears; values are set from the flyout
    if (mine) { remove(mine); refreshRail(); closeFly(); }
  });
  fly.addEventListener('click', e => {
    const b = e.target.closest('.n-fv'); if (!b || !flyTarget || !flyFam) return;
    stamp(flyTarget, flyFam, flyFam === 'stars' ? +b.dataset.v : b.dataset.v);
    closeFly(); refreshRail();
  });

  // ---------- Margin chips ----------
  const chips = mk('n-chips'); document.body.append(chips);
  function layoutChips() {
    const a = activePage();
    if (a < 0) return;
    if (mode !== 'margin') { chips.innerHTML = ''; return; }
    const right = pages[a].parentElement.getBoundingClientRect().right + scrollX - 5;
    const openId = pop?.note?.id;
    let floor = -Infinity;
    chips.innerHTML = inlineNotes().map(n => ({ n, ...locate(n) }))
      .filter(o => o.el && pages[a].contains(o.el) && (o.range || o.el).getClientRects().length)
      .map(o => ({ ...o, y: (o.range ? o.range.getClientRects()[0] : o.el.getBoundingClientRect()).top + scrollY + 1 }))
      .sort((p, q) => p.y - q.y || docOrder(p, q))
      .map(({ n, y }) => {
        const top = Math.max(y, floor); floor = top + 27;
        const text = n.body || (n.type === 'highlight' ? `“${n.anchor.quote}”` : labelOf(n));
        return `<button type="button" class="n-chip${n.body && n.type !== 'note' ? ' has-text' : ''}${n.id === openId ? ' open' : ''}" data-id="${esc(n.id)}" style="top:${top}px;left:${right}px;--c:${user(n.author).color}" aria-label="${esc(`${labelOf(n)} by ${who(n)}${n.body ? ': ' + n.body : ''}`)}">${n.author === me ? '' : `<span class="n-chip-who" aria-hidden="true">${esc(initials(user(n.author).name))}</span>`}${iconOf(n)}<span class="n-chip-text">${n.author === me ? '' : esc(user(n.author).name.split(' ')[0]) + ': '}${esc(text)}</span></button>`;
      }).join('');
  }
  chips.addEventListener('click', e => {
    const c = e.target.closest('.n-chip'); if (!c) return;
    const n = notes.find(x => x.id === c.dataset.id);
    if (pop?.note === n) closePop(true); else if (n) openCard(n);
  });
  let rafId = 0;
  const relayout = () => { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(layoutChips); };
  new ResizeObserver(relayout).observe(report);
  addEventListener('resize', relayout);
  document.addEventListener('click', relayout);   // page switches, accordions
  document.addEventListener('change', relayout);  // expand all

  // ---------- Notes panel ----------
  const list = document.getElementById('n-list');
  function renderPanel() {
    const hadFocus = document.activeElement === ovInput;
    const all = inlineNotes().map(n => ({ n, el: null, range: null, ...locate(n) }));
    const ov = overallNotes();
    const lost = all.filter(o => !o.el), placed = all.filter(o => o.el).sort(docOrder);
    const row = ({ n, el, overall }) => {
      if (overall) el = true;
      const quote = overall ? '' : el ? (n.anchor.quote !== headOf(el) ? n.anchor.quote : '') : `${n.anchor.page} › ${n.anchor.heading}: “${n.anchor.quote}”`;
      const hlq = el && n.type === 'highlight';
      const tag = el ? 'button type="button"' : 'div';
      return `<div class="n-row${el ? '' : ' n-row-lost'}" data-id="${esc(n.id)}">
        <${tag} class="n-row-go">
          <span class="n-row-icon">${iconOf(n)}</span>
          <span class="n-row-main">
            ${n.type !== 'note' ? `<span class="n-row-label">${esc(labelOf(n))}</span>` : ''}
            ${n.body ? `<span class="n-row-body">${esc(n.body)}</span>` : ''}
            ${quote ? `<span class="n-row-quote${hlq ? ' n-hlq n-sw-' + esc(n.value) : ''}" title="${esc(quote)}">${esc(quote)}</span>` : ''}
          </span></${el ? 'button' : 'div'}>
        <div class="n-row-meta">${meta(n)}</div></div>`;
    };
    let html = `<div class="n-group"><span>Overall</span><small>${ov.length}</small></div>
      <div class="n-ov-rate"><span>Your rating</span>${stripHTML()}</div>` + ov.map(n => row({ n, overall: true })).join('') + '<div class="n-ov-slot"></div>';
    if (lost.length) html += `<div class="n-group n-lost"><span>Unplaced</span><small>${lost.length}</small></div><p class="n-lost-help">The report text these notes were attached to has changed. They are kept here so nothing is lost.</p>` + lost.map(row).join('');
    const counts = {}; placed.forEach(o => { const p = pageNames[pageOf(o.el)]; counts[p] = (counts[p] || 0) + 1; });
    let page = null, head = null;
    for (const o of placed) {
      const p = pageNames[pageOf(o.el)], h = headOf(o.el);
      if (p !== page) { page = p; head = null; html += `<div class="n-group"><span>${esc(p)}</span><small>${counts[p]}</small></div>`; }
      if (h !== head) { head = h; if (h !== p) html += `<div class="n-section">${esc(h)}</div>`; }
      html += row(o);
    }
    if (!all.length) html += '<p class="n-empty">Nothing is marked in the report yet. Rest the pointer on any part of it, or select text, to add a note.</p>';
    list.innerHTML = html;
    list.querySelector('.n-ov-slot').replaceWith(ovNew);
    if (hadFocus) ovInput.focus({ preventScroll: true });
    const total = all.length + ov.length, mine = [...all.map(o => o.n), ...ov].filter(n => n.author === me).length;
    document.getElementById('n-count').textContent = total;
    document.getElementById('n-sub').textContent = `${total} total, ${mine} yours`;
  }
  const flashRange = r => { if (!window.Highlight) return; CSS.highlights.set('n-hl-flash', new Highlight(r)); setTimeout(() => CSS.highlights.delete('n-hl-flash'), 1400); };
  const flash = el => { el.classList.remove('n-flash'); void el.offsetWidth; el.classList.add('n-flash'); setTimeout(() => el.classList.remove('n-flash'), 1900); };
  // Scroll, then run `then` once the page has settled so popovers are placed against final positions
  const scrollThen = (top, then) => {
    top = Math.max(0, Math.min(top, document.documentElement.scrollHeight - innerHeight));
    if (Math.abs(top - scrollY) < 2) return then();
    let done = false; const go = () => { if (!done) { done = true; then(); } };
    addEventListener('scrollend', go, { once: true }); setTimeout(go, 900);
    scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  function goTo(n) {
    closePop(true); hideRail();
    if (isOverall(n)) {
      const it = mode !== 'hidden' && ovCard.querySelector(`.n-ov-item[data-id="${CSS.escape(n.id)}"]`);
      if (!it) return openCard(n);
      flash(it);
      return scrollThen(0, () => openCard(n));
    }
    const loc = locate(n); if (!loc) return;
    const t = loc.el, i = pageOf(t);
    if (i !== activePage()) links[i].click();
    for (let a = t.parentElement; a && a !== pages[i]; a = a.parentElement)   // open collapsed sections
      if (a.classList.contains('collapse') && !a.classList.contains('show') && a.id) pages[i].querySelector(`[aria-controls="${CSS.escape(a.id)}"]`)?.click();
    layoutChips();
    if (loc.range) flashRange(loc.range); else flash(t);
    scrollThen(pos(loc).getBoundingClientRect().top + scrollY - stuckHeight() - 16, () => openCard(n));
  }
  list.addEventListener('click', e => { const r = e.target.closest('button.n-row-go'); const id = r?.closest('.n-row').dataset.id; const n = id && notes.find(x => x.id === id); if (n) goTo(n); });
  // Sharing: owner only, from the panel row or the card
  document.addEventListener('click', e => {
    const b = e.target.closest?.('[data-share]'); if (!b) return;
    e.stopPropagation();
    const n = notes.find(x => x.id === b.dataset.share);
    if (!n || !update(n, { visibility: n.visibility === 'shared' ? 'private' : 'shared' })) return;
    if (pop?.note === n) pop.el.querySelector('[data-share]').outerHTML = shareBtn(n);
    toast(n.visibility === 'shared' ? 'Shared with everyone who can open this report' : 'Private: only you can see it');
  }, true);

  // ---------- Highlights: painted with the CSS Custom Highlight API, the report DOM is untouched ----------
  function paintHighlights() {
    if (!window.Highlight) return;
    FAM.highlight.values.forEach(([c]) => CSS.highlights.set('n-hl-' + c, new Highlight(...(mode === 'hidden' ? [] : inlineNotes()).filter(n => n.type === 'highlight' && n.value === c).map(n => locate(n)?.range).filter(Boolean))));
  }
  // Topmost highlight under a point (shortest wins where highlights overlap)
  const hlAt = (x, y) => {
    let hit = null, len = Infinity;
    if (mode === 'hidden' || preview) return null;
    for (const n of inlineNotes()) {
      if (n.type !== 'highlight') continue;
      const r = locate(n)?.range; if (!r || !pages[activePage()].contains(r.startContainer)) continue;
      const rect = [...r.getClientRects()].find(c => x >= c.left && x <= c.right && y >= c.top && y <= c.bottom);
      if (rect && n.anchor.quote.length < len) { hit = { n, rect }; len = n.anchor.quote.length; }
    }
    return hit;
  };
  addEventListener('pointermove', e => document.documentElement.classList.toggle('n-on-hl', !pop && !!hlAt(e.clientX, e.clientY)), { passive: true });

  // ---------- Clicks inside the report ----------
  let lastHeader = null, lastNav = null;
  // A click that switched pages (a Summary row) is undone by the second click of a double-click,
  // which then selects the word that was under the pointer, as it would on plain text
  const selectWordAt = (x, y) => {
    const p = document.caretPositionFromPoint?.(x, y), r = !p && document.caretRangeFromPoint?.(x, y);
    const node = p ? p.offsetNode : r?.startContainer, off = p ? p.offset : r?.startOffset;
    if (node?.nodeType !== 3) return;
    for (const g of new Intl.Segmenter(undefined, { granularity: 'word' }).segment(node.data))
      if (g.isWordLike && off >= g.index && off <= g.index + g.segment.length) {
        const w = document.createRange(); w.setStart(node, g.index); w.setEnd(node, g.index + g.segment.length);
        const s = getSelection(); s.removeAllRanges(); s.addRange(w); return;
      }
  };
  addEventListener('click', e => {
    const t = e.target;
    if (e.detail >= 2 && lastNav && performance.now() - lastNav.t < 1000) {
      e.stopPropagation(); e.preventDefault();
      const nav = lastNav;            // the clicks below re-enter these listeners
      if (!nav.undone) {
        nav.undone = true;
        links[nav.from].click();
        nav.states.forEach(([h, v]) => { if (h.getAttribute('aria-expanded') !== v) h.click(); });
        scrollTo({ top: nav.y, behavior: 'instant' });
        selectWordAt(nav.x, nav.cy);
      }
      lastNav = nav;
      return;
    }
    const pi = pageOf(t);
    if (pi < 0) return;
    if (e.detail === 1) navProbe = { from: activePage(), y: scrollY, x: e.clientX, cy: e.clientY, t: performance.now(),
      states: [...report.querySelectorAll('[aria-controls][aria-expanded]')].map(h => [h, h.getAttribute('aria-expanded')]) };
    // Section headers: the first click acts at once; a second (or third) click restores the section
    const hdr = t.closest('[aria-controls][aria-expanded]');
    if (hdr && e.detail === 1) lastHeader = { hdr, open: hdr.getAttribute('aria-expanded') === 'true' };
    if (e.detail >= 2) {
      if (hdr && lastHeader?.hdr === hdr) { e.stopPropagation(); if ((hdr.getAttribute('aria-expanded') === 'true') !== lastHeader.open) hdr.click(); }
      return;
    }
    if (e.detail !== 1) return;
    if (!getSelection().isCollapsed) { e.stopPropagation(); return; } // this click finished a text selection
    const hit = hlAt(e.clientX, e.clientY);
    if (hit) { e.stopPropagation(); e.preventDefault(); openCard(hit.n, { left: e.clientX - 150, bottom: hit.rect.bottom }); }
  }, true);
  // After the report has handled the click (bubble phase, same event): did it switch pages?
  let navProbe = null;
  addEventListener('click', () => { lastNav = navProbe && activePage() !== navProbe.from ? navProbe : null; navProbe = null; });

  // ---------- Selection bar ----------
  const sbar = mk('n-sel', FAM.highlight.values.map(([c, , lab]) => `<button type="button" class="n-selsw" data-c="${c}" title="${lab}" aria-label="${lab}">${swatch(c)}</button>`).join('')
    + `<button type="button" class="n-selnote">${SVG.highlighter}Highlight and note</button>`);
  sbar.setAttribute('role', 'toolbar'); sbar.setAttribute('aria-label', 'Highlight selected text');
  document.body.append(sbar);
  sbar.addEventListener('mousedown', e => e.preventDefault());   // keep the selection intact
  sbar.addEventListener('pointerdown', e => e.preventDefault());
  const liveSelection = () => {
    const s = getSelection();
    if (!s.rangeCount || s.isCollapsed || !strip(s.toString())) return null;
    const r = s.getRangeAt(0), el = elOf(r.commonAncestorContainer);
    return pageOf(el) >= 0 && !el.closest('.n-callouts') ? r : null;
  };
  function placeSelBar() {
    const r = liveSelection();
    if (!r) return sbar.classList.remove('on');
    const rects = [...r.getClientRects()].filter(c => c.width);
    const box = r.getBoundingClientRect(), first = rects[0] || box, last = rects[rects.length - 1] || box;
    const H = sbar.offsetHeight, W = sbar.offsetWidth, vt = visibleTop();
    if (box.bottom < vt || box.top > innerHeight) return sbar.classList.remove('on');
    const above = first.top - H - 8 >= vt + 4;            // flip below when there is no room above
    const y = above ? first.top - H - 8 : Math.min(last.bottom + 8, innerHeight - H - 4);
    const anchorX = above ? first.left + Math.min(first.width, 240) / 2 : last.right - Math.min(last.width, 240) / 2;
    const right = pages[activePage()].parentElement.getBoundingClientRect().right;
    sbar.style.transform = `translate(${Math.max(8, Math.min(anchorX - W / 2, right - W - 8))}px, ${Math.max(vt + 4, y)}px)`;
    sbar.classList.toggle('below', !above);
    sbar.classList.add('on');
  }
  let selRaf = 0;
  const selUpdate = () => { cancelAnimationFrame(selRaf); selRaf = requestAnimationFrame(placeSelBar); };
  document.addEventListener('selectionchange', selUpdate);
  addEventListener('scroll', selUpdate, { passive: true });
  addEventListener('resize', selUpdate);
  sbar.addEventListener('click', e => {
    const b = e.target.closest('button'); const r = liveSelection(); if (!b || !r) return;
    const anchor = anchorFromRange(r); if (!anchor) return;
    const n = add({ type: 'highlight', value: b.dataset.c || 'yellow' }, null, anchor);
    getSelection().removeAllRanges();
    sbar.classList.remove('on');
    if (b.classList.contains('n-selnote')) { const loc = locate(n); const rs = loc ? [...loc.range.getClientRects()] : []; const l = rs[rs.length - 1]; openCard(n, l ? { left: l.left, bottom: l.bottom } : null); }
  });

  // ---------- Overall notes: card above the report header, first group in the panel ----------
  const stripHTML = () => `<span class="n-strip" role="toolbar" aria-label="Your overall rating">${['thumbs', 'stars', 'marker'].map(f => {
    const m = myStamp('overall', f);
    return `<button type="button" class="n-rb${m ? ' set' : ''}" data-ofam="${f}" title="${FAM[f].name}: hover to choose, click to clear" aria-label="${m ? esc(labelOf(m)) + '. Click to clear' : FAM[f].name + ': choose a value'}">${m ? iconOf(m) : SVG[f]}</button>`; }).join('')}</span>`;
  const ovItem = (n, interactive) => `<${interactive ? 'button type="button"' : 'div'} class="n-ov-item" data-id="${esc(n.id)}" style="--c:${user(n.author).color}">
      ${avatar(n.author)}<span class="n-ov-icon">${iconOf(n)}</span>
      <span class="n-ov-text">${n.type !== 'note' ? `<b>${esc(labelOf(n))}</b>` : ''}${n.body ? `<span>${esc(n.body)}</span>` : ''}</span>
      <span class="n-ov-who">${esc(who(n))}, ${esc(when(n.created))}${n.visibility === 'private' ? ' ' + SVG.lock : ''}</span></${interactive ? 'button' : 'div'}>`;
  const overallHTML = interactive => {
    const ov = overallNotes();
    return `<div class="n-ov-head"><h2>Overall</h2>${interactive ? `<span class="n-ov-rate"><span>Your rating</span>${stripHTML()}</span><button type="button" class="n-ov-add">Add a note</button>` : ''}</div>`
      + (ov.length ? `<div class="n-ov-items">${ov.map(n => ovItem(n, interactive)).join('')}</div>` : interactive ? '<p class="n-ov-empty">No overall notes yet. Rate with the strip above, or add a note.</p>' : '');
  };
  const ovCard = document.createElement('section');
  ovCard.className = 'n-overall'; ovCard.setAttribute('aria-label', 'Overall notes');
  pages[0].parentElement.prepend(ovCard);
  const renderOverall = () => { ovCard.innerHTML = overallHTML(true); };
  ovCard.addEventListener('click', e => {
    if (e.target.closest('.n-ov-add')) { setOpen(true); ovInput.focus(); return; }
    const it = e.target.closest('.n-ov-item'), n = it && notes.find(x => x.id === it.dataset.id);
    if (!n) return;
    if (pop?.note === n) return closePop(true);
    const r = it.getBoundingClientRect(); openCard(n, { left: r.left, bottom: r.bottom });
  });
  const ovNew = mk('n-ov-new', '<textarea rows="1" placeholder="Add an overall note" aria-label="Add an overall note"></textarea><div class="n-hint">Enter to add, Shift+Enter for a new line</div>');
  const ovInput = ovNew.querySelector('textarea');
  autosize(ovInput);
  ovInput.addEventListener('keydown', e => {
    if (e.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const t = ovInput.value.trim(); if (!t) return;
      ovInput.value = ''; ovInput.dispatchEvent(new Event('input'));
      addOverall({ type: 'note', value: null, body: t });
    } else if (e.key === 'Escape') { ovInput.value = ''; ovInput.dispatchEvent(new Event('input')); ovInput.blur(); }
  });

  // ---------- Inline callouts: each note under its block ----------
  const trunc = (t, k) => t.length > k ? t.slice(0, k - 1) + '…' : t;
  const calloutHTML = (n, interactive) => {
    const text = n.body ? esc(n.body) : n.type === 'highlight' ? `<span class="n-co-q n-sw-${esc(n.value)}">${esc(trunc(n.anchor.quote, 90))}</span>` : esc(labelOf(n));
    return `<${interactive ? 'button type="button"' : 'div'} class="n-callout" data-id="${esc(n.id)}" style="--c:${user(n.author).color}">
      <span class="n-co-icon">${iconOf(n)}</span><span class="n-co-text">${n.body && n.type !== 'note' ? `<b>${esc(labelOf(n))}</b> ` : ''}${text}</span>
      <span class="n-co-who">${esc(who(n))}${n.visibility === 'private' ? ' ' + SVG.lock : ''}</span></${interactive ? 'button' : 'div'}>`;
  };
  // Live report, or a copy of it (print preview) through a map from original to copied nodes
  function renderCallouts(map) {
    if (!map) {
      report.querySelectorAll('.n-callouts, .n-callouts-row').forEach(e => e.remove());
      report.querySelectorAll('.n-co-wrap').forEach(e => e.classList.remove('n-co-wrap'));
      if (mode !== 'inline') return;
    }
    const groups = new Map();
    inlineNotes().map(n => ({ n, ...locate(n) })).filter(o => o.el).sort(docOrder)
      .forEach(o => { if (!groups.has(o.el)) groups.set(o.el, []); groups.get(o.el).push(o.n); });
    groups.forEach((ns, el) => {
      const host = map ? map.get(el) : el; if (!host) return;
      const box = document.createElement('div');
      box.className = 'n-callouts';
      box.innerHTML = ns.map(n => calloutHTML(n, !map)).join('');
      if (host.tagName === 'TR') { const tr = document.createElement('tr'); tr.className = 'n-callouts-row'; const td = tr.insertCell(); td.colSpan = host.cells.length || 1; td.append(box); host.after(tr); return; }
      const cs = getComputedStyle(host);  // inside the block so it shares its indent; rows in flex/grid blocks wrap below
      if (/flex|grid/.test(cs.display) && !cs.flexDirection.startsWith('column')) host.classList.add('n-co-wrap');
      host.append(box);
    });
  }
  report.addEventListener('click', e => {
    const c = e.target.closest('.n-callout'); if (!c) return;
    e.stopPropagation();  // never toggle the section or follow the row the callout sits in
    const n = notes.find(x => x.id === c.dataset.id); if (!n) return;
    if (pop?.note === n) return closePop(true);
    const r = c.getBoundingClientRect(); openCard(n, { left: r.left, bottom: r.bottom });
  });

  // ---------- Viewing as: sample users, each sees their own notes plus everyone's shared ones ----------
  asSel.addEventListener('change', () => {
    closePop(true); hideRail(); closeFly();
    me = asSel.value; store.setItem(USER_KEY, me);
    showUser(); render();
    toast(`Viewing as ${user(me).name}`);
  });

  // ---------- Display mode: Hidden, Margin, Inline ----------
  const MODES = ['hidden', 'margin', 'inline'], MODE_KEY = 'hm-notes-mode';
  let mode = MODES.includes(store.getItem(MODE_KEY)) ? store.getItem(MODE_KEY) : 'margin';
  const seg = document.getElementById('n-mode');
  function setMode(m) {
    mode = m; store.setItem(MODE_KEY, m);
    MODES.forEach(x => document.documentElement.classList.toggle('n-mode-' + x, x === m));
    seg.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-checked', b.dataset.mode === m));
    closePop(true);
    render();
  }
  seg.addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b) setMode(b.dataset.mode); });

  // ---------- Print: in-page preview of every page, with or without notes ----------
  let preview = null;
  const printBtn = document.getElementById('n-print'), printMenu = document.getElementById('n-print-menu');
  const setMenu = open => { printMenu.hidden = !open; printBtn.setAttribute('aria-expanded', open); };
  printBtn.addEventListener('click', () => setMenu(printMenu.hidden));
  printMenu.addEventListener('click', e => { const b = e.target.closest('[data-print]'); if (b) { setMenu(false); openPreview(b.dataset.print === 'with'); } });
  document.addEventListener('pointerdown', e => { if (!printMenu.hidden && !e.target.closest('.n-print-wrap')) setMenu(false); });
  // The report's own print rules, scoped to the preview sheet so the preview looks like the printout
  function printRules() {
    if (document.getElementById('n-print-emu')) return;
    const scope = sel => sel.split(',').map(x => { x = x.trim(); return /^(html|body|:root)\b/.test(x) ? '.n-page' + x.replace(/^(html|body|:root)/, '') : '.n-page ' + x; }).join(', ');
    const out = [];
    for (const sh of document.styleSheets) {
      let rules; try { rules = sh.cssRules; } catch { continue; }
      for (const r of rules) if (r instanceof CSSMediaRule && /\bprint\b/.test(r.media.mediaText) && !/\bscreen\b/.test(r.media.mediaText))
        for (const x of r.cssRules) if (x instanceof CSSStyleRule && !/\.n-/.test(x.selectorText)) out.push(`${scope(x.selectorText)} { ${x.style.cssText} }`);
    }
    const st = document.createElement('style'); st.id = 'n-print-emu'; st.textContent = out.join('\n'); document.head.append(st);
  }
  function openPreview(withNotes) {
    closePreview(false); closePop(true); hideRail(); printRules();
    const src = pages[0].parentElement, copy = src.cloneNode(true), map = new Map();
    const wa = document.createTreeWalker(src), wb = document.createTreeWalker(copy);
    for (let a = wa.currentNode, b = wb.currentNode; a && b; a = wa.nextNode(), b = wb.nextNode()) map.set(a, b);
    copy.querySelectorAll('.n-overall, .n-callouts, .n-callouts-row, .d-print-none').forEach(e => e.remove());
    copy.querySelectorAll('.n-co-wrap, .n-flash, .n-target').forEach(e => e.classList.remove('n-co-wrap', 'n-flash', 'n-target'));
    copy.querySelectorAll('cp-rp-page').forEach(p => p.classList.add('page-active'));              // every page
    copy.querySelectorAll('.collapse').forEach(c => c.classList.add('show'));                      // every section open
    copy.querySelectorAll('[aria-expanded]').forEach(h => { h.setAttribute('aria-expanded', 'true'); h.classList.remove('collapsed'); h.parentElement.classList.add('showing'); });
    const el = mk('n-preview', `<div class="n-preview-bar" role="toolbar" aria-label="Print preview">
        <b>Print preview</b>
        <div class="n-seg" role="radiogroup" aria-label="Notes in print"><button type="button" role="radio" data-with="1" aria-checked="${withNotes}">With notes</button><button type="button" role="radio" data-with="0" aria-checked="${!withNotes}">Without notes</button></div>
        <span class="n-spacer"></span>
        ${framed ? '<span class="n-hint">Printing needs the page opened on its own; this embedded view can only preview.</span>' : '<button type="button" class="n-btn n-primary" data-act="print">Print</button>'}<button type="button" class="n-btn" data-act="close">Close</button>
      </div><div class="n-preview-scroll"><div class="n-sheet"><div class="n-page"></div></div></div>`);
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Print preview');
    el.querySelector('.n-page').append(copy);
    document.body.append(el);
    fitSheet();
    document.documentElement.classList.add('n-printing');
    if (withNotes) {
      const card = document.createElement('section'); card.className = 'n-overall n-overall-print'; card.innerHTML = overallHTML(false);
      if (overallNotes().length) copy.prepend(card);
      renderCallouts(map);
    }
    if (window.Highlight) FAM.highlight.values.forEach(([c]) => CSS.highlights.set('n-hl-' + c, new Highlight(...(withNotes ? inlineNotes() : [])
      .filter(n => n.type === 'highlight' && n.value === c).map(n => locate(n)?.range).filter(Boolean)
      .map(r => { const x = document.createRange(); x.setStart(map.get(r.startContainer), r.startOffset); x.setEnd(map.get(r.endContainer), r.endOffset); return x; }))));
    el.addEventListener('click', e => {
      const w = e.target.closest('[data-with]'); if (w) return openPreview(w.dataset.with === '1');
      const a = e.target.closest('[data-act]')?.dataset.act;
      if (a === 'print') print(); else if (a === 'close') closePreview(true);
    });
    preview = { el, withNotes };
    el.querySelector(`[data-with="${withNotes ? 1 : 0}"]`).focus();
  }
  // On narrow screens the sheet is scaled to fit, never scrolled sideways
  const fitSheet = () => { const sh = preview?.el.querySelector('.n-sheet') || document.querySelector('.n-preview .n-sheet'); if (sh) sh.style.zoom = Math.min(1, (sh.parentElement.clientWidth - 16) / 816); };
  addEventListener('resize', fitSheet);
  function closePreview(refocus) {
    if (!preview) return;
    preview.el.remove(); preview = null;
    document.documentElement.classList.remove('n-printing');
    paintHighlights();
    if (refocus) printBtn.focus();
  }

  function render() { renderPanel(); renderOverall(); renderCallouts(); layoutChips(); paintHighlights(); if (cur) refreshRail(); }

  // ---------- Panel toggle and keys ----------
  const PANEL_KEY = 'hm-notes-panel';
  const btn = document.getElementById('n-toggle');
  const setOpen = open => {
    document.documentElement.classList.toggle('notes-open', open);
    btn.setAttribute('aria-expanded', open);
    document.getElementById('n-panel').inert = !open;
    store.setItem(PANEL_KEY, open ? '1' : '0');
  };
  const toggle = () => setOpen(!document.documentElement.classList.contains('notes-open'));
  btn.addEventListener('click', toggle);
  document.getElementById('n-close').addEventListener('click', () => setOpen(false));
  addEventListener('keydown', e => {
    if (preview) { if (e.key === 'Escape') closePreview(true); return; }
    if (e.key === 'Escape') { if (pop) closePop(false); else if (!printMenu.hidden) setMenu(false); else hideRail(); return; }
    const k = e.key.toLowerCase();
    if ((k !== 'n' && k !== 'h') || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.repeat) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    e.preventDefault();
    if (k === 'n') toggle(); else setMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length]);
  });
  // First visit: open beside the report on wide screens; on a phone the panel would cover the report
  setOpen(store.getItem(PANEL_KEY) ? store.getItem(PANEL_KEY) === '1' : !matchMedia('(max-width: 760px)').matches);
  setMode(mode);
  setInterval(() => { if (document.activeElement !== ovInput) { renderPanel(); renderOverall(); } }, 60000); // keep "x minutes ago" fresh

  window.hmNotes = { update, remove, get me() { return me; }, get railBlock() { return cur; }, resolve, locate, setMode, openPreview, closePreview, get mode() { return mode; }, anchorFromRange, anchorFor, REPORT_VERSION, get notes() { return notes; }, blocks: () => [...QUOTE.keys()] }; // for inspection while prototyping
})();
