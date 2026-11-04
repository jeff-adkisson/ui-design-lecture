# Builds two self-contained files from the captured report DOM + CSS and the notes layer:
#   index.html        - local page (full document, real Print button)
#   report-notes.html - Claude artifact (content only: the publish skeleton adds doctype/head/body; no print dialog)
import json, re, pathlib
here = pathlib.Path(__file__).parent
cap = json.loads((here / '_capture/capture.json').read_text())
css = cap['css']
# Drop unused sheets (thin icons, KaTeX) and the ttf fallbacks, keeping woff2 only.
parts = re.split(r'(?=\n/\* (?:https?://\S+|inline) \*/\n)', css)
parts = [p for p in parts if 'thin.min.css' not in p[:200] and 'katex.min.css' not in p[:200]]
css = ''.join(parts)
css = re.sub(r',\s*url\("data:[^"]*"\)\s*format\("truetype"\)', '', css)
body = cap['body']
body = re.sub(r'<a [^>]*download="capture.json"[^>]*></a>', '', body)
body = re.sub(r'<link [^>]*>', '', body)
body = body.replace('jack.walker@example.com', 'jack.walker@example.com')  # sample candidate email; never publish the real one
m = re.match(r'(<body[^>]*>)(.*)(</body>)$', body, re.S)
appbar = (here / 'appbar.html').read_text()
notes_css = (here / 'notes.css').read_text()
notes_js = (here / 'notes.js').read_text()

HANDOFF = """<!--
  Report Notes - clickable interaction prototype (not production code).

  What it demonstrates: note-taking on an assessment report copied from the live Angular report
  (Summary / Details / Interview / Develop pages, accordions, Summary row links). Interviewers can
  stamp any block from a hover rail or the keyboard (thumbs, 1-5 stars, markers), write inline notes,
  highlight selected text in four colors, keep overall notes and ratings, switch between Hidden /
  Margin / Inline display (H), use a notes panel (N), share or keep notes private, switch "Viewing as"
  between three sample interviewers, preview printing with or without notes, and see notes survive a
  simulated report update (anchored by section heading + quoted text; unmatched notes go to Unplaced).

  Storage: notes live only in each viewer's own browser storage (localStorage). Nothing is sent to a
  server, nothing is shared between viewers, and every viewer starts from the same sample data.
  "Viewing as" stands in for login; real sharing and ownership must be enforced on the server.

  Out of scope, by decision: speech-to-text and microphone capture. Audio leaving our systems is a PII
  and SOC 2 problem. Do not add them.
-->
"""

local = f"""<!doctype html>
{HANDOFF}<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Report Notes</title>
<style>{css}</style>
<style>{notes_css}</style>
</head>
{m.group(1)}{appbar}{m.group(2)}<script>{notes_js}</script>{m.group(3)}
</html>"""
(here / 'index.html').write_text(local)

artifact = f"""{HANDOFF}<title>Report Notes</title>
<style>{css}</style>
<style>{notes_css}</style>
{appbar}{m.group(2)}<script>{notes_js.replace('const CAN_PRINT = true;', 'const CAN_PRINT = false;', 1)}</script>
"""
assert 'const CAN_PRINT = false;' in artifact
(here / 'report-notes.html').write_text(artifact)
print(len(local), len(artifact))
