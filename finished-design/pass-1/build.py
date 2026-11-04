import re, sys, os
S = os.path.dirname(os.path.abspath(__file__))
css = open(S + '/report/report-all.css').read()
html = open(S + '/report/report-clean.html').read()
app = open(S + '/app.html').read()

# scope the report's html/body rules to the wrapper
css = re.sub(r'(?m)^body\b', '.rp-body', css)
css = re.sub(r'(?m)^html\b', '.rp-html', css)
css = re.sub(r'/\*[^*]*\*/', '', css)
css = css.replace('</style', '<\\/style')

# strip chrome the prototype replaces
html = re.sub(r'<cp-rp-action-menu.*?</cp-rp-action-menu>', '', html, flags=re.S)
html = re.sub(r'<cp-rp-pdf-export-overlay.*?</cp-rp-pdf-export-overlay>', '', html, flags=re.S)
# font awesome icons -> inline svg
chev = '<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>'
info = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
html = re.sub(r'(<i [^>]*fa-chevron-right[^>]*>)</i>', r'\1' + chev + '</i>', html)
html = re.sub(r'(<i [^>]*fa-circle-info[^>]*>)</i>', r'\1' + info + '</i>', html)
# collapsed accordion bodies are hidden via .collapse:not(.show); force them open
html = html.replace('class="accordion-collapse collapse"', 'class="accordion-collapse collapse show"')

out = app.replace('{{REPORT_HTML}}', html)
out = out.replace('<style>\n/* Layout', '<style>\n' + css + '\n</style>\n<style>\n/* Layout', 1)
open(S + '/report-notes.html', 'w').write(out)
print('wrote', len(out), 'bytes; accordion-collapse classes:', set(re.findall(r'class="accordion-collapse[^"]*"', html)))
