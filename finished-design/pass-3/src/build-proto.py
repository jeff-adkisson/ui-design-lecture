import sys, os
root = sys.argv[1]; d = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'notes') + '/'
s = open(root + '/report.html').read()
css, markup, js = (open(d + f).read() for f in ('notes.css', 'notes.html', 'notes.js'))
old = "scrollTo(0, target.getBoundingClientRect().top + scrollY - menu.getBoundingClientRect().height);"
assert s.count(old) == 1 and s.count('</head>') == 1 and s.count('<body class="v-desktop">') == 1
s = s.replace(old, "scrollTo(0, target.getBoundingClientRect().top + scrollY - menu.getBoundingClientRect().height - (parseFloat(getComputedStyle(menu).top) || 0));")
s = s.replace('</head>', '<style>\n' + css + '</style>\n</head>', 1)
s = s.replace('<body class="v-desktop">', '<body class="v-desktop">\n' + markup, 1)
i = s.rindex('</body>'); s = s[:i] + '<script>\n' + js + '</script>\n' + s[i:]
note = open(d + 'handoff.txt').read()
assert s.lower().startswith('<!doctype html>')
s = s[:15] + '\n' + note + s[15:]
open(root + '/prototype.html', 'w').write(s); print(len(s))
