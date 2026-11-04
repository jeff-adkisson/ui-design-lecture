import json, sys, html, re
src, out = sys.argv[1], sys.argv[2]
d = json.load(open(src))
RUNTIME = r"""
(() => {
  const pages = [...document.querySelectorAll('cp-rp-page')];
  const links = [...document.querySelectorAll('cp-rp-page-menu .nav-link')];
  const menu = document.querySelector('cp-rp-page-menu');
  const titleBase = document.title.split(' | ')[0];
  const show = i => {
    pages.forEach((p, k) => p.classList.toggle('page-active', k === i));
    links.forEach((l, k) => l.classList.toggle('active', k === i));
    document.title = titleBase + ' | ' + links[i].textContent.trim();
  };
  const items = p => [...p.querySelectorAll('.accordion-item')];
  const setItem = (item, open) => {
    item.classList.toggle('showing', open);
    const h = item.querySelector(':scope > .accordion-header');
    h.classList.toggle('collapsed', !open);
    h.setAttribute('aria-expanded', open);
    item.querySelector(':scope > .accordion-collapse').classList.toggle('show', open);
  };
  // Expand-all switch mirrors "every item on this page is open"
  const sync = p => { const sw = p.querySelector('cp-rp-accordion-toggle-button input'); if (sw) sw.checked = items(p).every(i => i.classList.contains('showing')); };

  links.forEach((l, i) => l.addEventListener('click', () => { show(i); scrollTo(0, 0); }));
  document.addEventListener('click', e => {
    const h = e.target.closest('.accordion-header');
    if (!h) return;
    const item = h.closest('.accordion-item');
    setItem(item, !item.classList.contains('showing'));
    sync(item.closest('cp-rp-page'));
  });
  document.querySelectorAll('cp-rp-accordion-toggle-button input').forEach(sw =>
    sw.addEventListener('change', () => items(sw.closest('cp-rp-page')).forEach(i => setItem(i, sw.checked))));
  // Summary row -> its page with only that item open, scrolled under the sticky menu
  document.querySelectorAll('[data-go-page]').forEach(row => row.addEventListener('click', () => {
    const i = +row.dataset.goPage, p = pages[i];
    const target = p.querySelector('.accordion-item[id="' + CSS.escape(row.dataset.goItem) + '"]');
    show(i);
    items(p).forEach(it => setItem(it, it === target));
    sync(p);
    if (target) scrollTo(0, target.getBoundingClientRect().top + scrollY - menu.getBoundingClientRect().height);
  }));
})();
"""
doc = f"""<!doctype html>
<html lang="{d['htmlLang']}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="data:,">
<title>{html.escape(d['title'])}</title>
<style>
{d['css'].replace('</style', '<\\/style')}
</style>
</head>
<body class="{d['bodyClass']}">
{d['app']}
<script>{RUNTIME}</script>
</body>
</html>
"""
open(out, 'w').write(doc)
print(len(doc))
