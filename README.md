# UI Design Lecture: building a note-taking feature with an agent

Materials for a live lecture on agentic AI. An agent builds a clickable prototype of a note-taking
feature for an assessment report, one prompt at a time, while the lecturer talks between prompts.

The feature lets interviewers annotate a candidate's report: stamp any block with thumbs, stars, or
markers, write notes, highlight text, rate the candidate overall, keep notes private or share them,
and view or print the report with or without notes.

## Finished work

Slides: [download presentation.pptx](https://github.com/jeff-adkisson/ui-design-lecture/raw/main/presentation/presentation.pptx) (74 MB).

Live pages, served by GitHub Pages from this repo:

| Pass | Open | What it is |
|---|---|---|
| 1 | [Prototype Design](https://jeff-adkisson.github.io/ui-design-lecture/finished-design/pass-1/report-notes.html) | Original design session, before the prompts existed |
| 2 | [Prototype Design](https://jeff-adkisson.github.io/ui-design-lecture/finished-design/pass-2/index.html) | Built from an earlier draft of the prompts |
| 3 | [Prototype Design](https://jeff-adkisson.github.io/ui-design-lecture/finished-design/pass-3/prototype.html)<br>[Design Docs](finished-design/pass-3/final-design-docs/) | Built from the final prompts, with the design documentation that follows the prototype |
| 4 | [Design Basis](https://jeff-adkisson.github.io/ui-design-lecture/finished-design/pass-4/report.html) | The bare two-page report the lecture starts from |

Design documents for pass 3: [project review](finished-design/pass-3/final-design-docs/01-project-review.md),
[requirements](finished-design/pass-3/final-design-docs/02-requirements.md),
[technical design](finished-design/pass-3/final-design-docs/03-technical-design.md),
[UI design](finished-design/pass-3/final-design-docs/04-ui-design.md),
[acceptance testing](finished-design/pass-3/final-design-docs/05-acceptance-testing.md),
[implementation prompts](finished-design/pass-3/final-design-docs/prompts/README.md).

## What is here

| Path | Contents |
|---|---|
| [`prompts/`](prompts/README.md) | The prompts, in order. Plain text, one file per prompt. |
| `finished-design/pass-1/` | The prototype as it came out of the original design session, before the prompts existed. |
| `finished-design/pass-2/` | The prototype an agent built from an earlier draft of the prompts, start to finish, in one session. |
| `finished-design/pass-3/` | The prototype an agent built from the final prompts, one prompt at a time, plus `final-design-docs/`. |
| `finished-design/pass-4/` | The lecture folder: prompt 0 has already been run here, so it holds only `report.html` and the MCP config. Run prompts 1 to 7 in it during the lecture. |

All passes are self-contained HTML pages built on a captured copy of the same sample report.
Pass 3 is what the prompts produce; pass 1 is the reference the prompts were measured against. Keep
the finished passes in case the live run does not finish.

## Using the prompts

You need an agent that can run shell commands, serve a local folder over HTTP, and drive a browser.
The run documented here used Claude Code on Opus 5.5 with the Playwright MCP server, configured by
the `.mcp.json` in each pass folder:

```json
{ "mcpServers": { "playwright": { "command": "npx", "args": ["-y", "@playwright/mcp@0.0.77"] } } }
```

Start Claude Code inside the folder and approve the project MCP server when asked. Work in an empty
folder for a fresh run, or in `finished-design/pass-4/` for the lecture.

1. **Before the lecture**, run `prompt-0-prepare.txt`. It captures the live sample report into a
   static `report.html`, makes its page menu and accordions work, serves it locally, and opens it
   in your desktop browser. This takes about 12 minutes and is not interesting to watch. For the
   lecture this is already done: `finished-design/pass-4/` holds the result, so just serve it
   before class (`cd finished-design/pass-4 && python3 -m http.server 8790`) and start the agent
   in that folder.
2. **During the lecture**, paste `prompt-1.txt` through `prompt-6.txt` one at a time into the same
   agent session. Each ends by opening the result in your desktop browser, which is your cue to stop
   talking and show what was built. Prompt 6 carries the publishing step inside it, so it finishes
   by publishing the page as a Claude artifact and returning a link.
3. **To share the result on its own**, run `prompt-7-final.txt`. It is the publishing step by itself,
   for a session that stopped before prompt 6 or for publishing a copy before the lecture so the
   link is ready regardless.

Give each prompt exactly as written. They describe outcomes and rules rather than implementation, so
the agent arrives at the design on its own.

## Lecture procedure

### Before class

1. Make sure `pass-4` is committed (it must be, or the next command deletes it), then reset it
   after any rehearsal:

   ```
   git clean -fdx finished-design/pass-4 && git checkout -- finished-design/pass-4
   ```

   That leaves exactly `report.html` and `.mcp.json`, which is prompt 0's finished output.
2. Serve `pass-4` and leave the server running for the whole lecture:

   ```
   cd finished-design/pass-4 && python3 -m http.server 8790
   ```

   Open http://127.0.0.1:8790/report.html and check the two pages, the accordions, and a Summary
   row link.
3. In a second terminal, start the agent inside `pass-4` on Opus 5.5, the model the prompts were tested with:

   ```
   cd finished-design/pass-4 && claude --model claude-opus-5-5
   ```

   Approve the project's Playwright MCP server when asked, then type `/mcp` and confirm
   `playwright` shows as connected. Leave this session open; every prompt goes into it.
4. Optional: publish a copy ahead of time so a shareable link exists regardless. Copy `pass-3`'s
   `prototype.html` into a scratch folder, start `claude` there, and paste `prompt-7-final.txt`.

### During class

Paste `prompt-1.txt` through `prompt-6.txt` into the open session, one at a time, each after the
previous one has finished. Each prompt ends by opening the result in your desktop browser and
saying "Jeff, prompt N is complete and visible in your browser" out loud, so you can keep talking
until you hear it. Prompt 6 reviews, fixes, publishes, and returns the artifact link.

If a prompt runs long, you can interrupt it with Escape, ask it to finish with what it has, and
move on; the next prompt builds on whatever is in `prototype.html` at that point.

### Comparing the passes

Serve the three finished passes on their own ports and open all of them:

```
(cd finished-design/pass-1 && python3 -m http.server 8765 &)
(cd finished-design/pass-2 && python3 -m http.server 8766 &)
(cd finished-design/pass-3 && python3 -m http.server 8767 &)
open http://127.0.0.1:8765/report-notes.html http://127.0.0.1:8766/index.html http://127.0.0.1:8767/prototype.html
```

Pass 1 is the original design session, pass 2 an earlier draft of the prompts, pass 3 the final
prompts, and pass 4 is the one just built in class. Same prompts, different results: compare the app
bars, the rail, the chips, the panel grouping, and the print preview. The design documents for the
next step are in `finished-design/pass-3/final-design-docs/`.

## Running the finished pages

Each pass is a static page. Serve its folder and open the page; opening the file directly also works
in most browsers.

```
cd finished-design/pass-1 && python3 -m http.server 8765   # /report-notes.html
cd finished-design/pass-2 && python3 -m http.server 8766   # /index.html
cd finished-design/pass-3 && python3 -m http.server 8767   # /prototype.html, or /report.html for the bare capture
cd finished-design/pass-4 && python3 -m http.server 8790   # /report.html, the lecture starting point
```

Notes are kept in the browser's local storage only, so every viewer starts from the sample data and a
"Reset sample notes" control restores it. Use the "Viewing as" switch to see what each of the three
sample interviewers sees.

Pass 1 can be rebuilt from `app.html` and the captured report with `python3 build.py`. Pass 2 is
built the same way from its `build.py`, `appbar.html`, `notes.js`, `notes.css`, and the capture in
`_capture/capture.json`. Pass 3 is rebuilt with `python3 src/build-proto.py .` from `report.html`
and the sources in `src/notes/`.

## Design documents

`finished-design/pass-3/final-design-docs/` shows the step after the prototype: turning the design
into documents an agent can implement from, for a fictional "Assessment System" on Node and
Postgres. They are short and illustrative, not a real plan.

| File | Contents |
|---|---|
| `01-project-review.md` | What the project is, motivation, scope, technical concerns |
| `02-requirements.md` | Numbered functional and non-functional requirements |
| `03-technical-design.md` | Architecture, ERD, endpoints, load and save sequences |
| `04-ui-design.md` | Regions, control sets, interaction rules, visual conventions |
| `05-acceptance-testing.md` | Human smoke test and Playwright plan, each case tied to a requirement |
| [`prompts/`](finished-design/pass-3/final-design-docs/prompts/README.md) | Prompts that would implement the backend, UI, and tests from those documents; never run |
