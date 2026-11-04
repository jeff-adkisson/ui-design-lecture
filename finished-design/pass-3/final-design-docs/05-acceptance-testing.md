# 05 · Acceptance Testing: Report Notes

How Report Notes is accepted before release: a short human smoke test for what only a person can
judge, and a Playwright suite for everything that can be automated and re-run. Each case names the
requirement it proves. Requirement IDs refer to `02-requirements.md`.

## Contents

1. [Strategy](#strategy)
2. [Test environment](#test-environment)
3. [Human smoke test](#human-smoke-test)
4. [Playwright automation](#playwright-automation)
5. [API tests](#api-tests)
6. [Exit criteria](#exit-criteria)

## Strategy

- **Humans judge feel.** Whether the rail "stays out of the way" or a flash is noticeable is a
  judgement; one person runs the smoke test on each release candidate in about 15 minutes.
- **Playwright proves rules.** Stamp rules, anchoring, ownership, visibility, and display modes are
  deterministic and run on every pull request.
- **Sample, do not enumerate.** Tests pick one block of each kind (heading, paragraph, list item,
  table row, chart row). They do not visit every block or every family-by-layout permutation.
- **Seeded data.** Every run starts from the same three interviewers and the same 30 annotations.

## Test environment

- Node API against a disposable Postgres with the seed applied by `npm run seed:test`.
- Playwright with desktop Chromium at 1280 × 800. Firefox and WebKit run nightly, not per PR.
- Three test users: Dana Reyes (DR), Marcus Lee (ML), Priya Shah (PS). Tests log in through the
  normal session endpoint; no "viewing as" switch exists in production.
- Fixtures: `fixtures/report.html` (a captured sample report) and `fixtures/annotations.json`.

## Human smoke test

Run as Dana unless the step says otherwise. Record pass or fail per row.

| # | Steps | Expected | Req |
|---|---|---|---|
| S1 | Open the report. | App bar, overall card, chips in the margin, panel open with Overall first. | FR-OVR-01, FR-PNL-02 |
| S2 | Rest the pointer on a paragraph, then move toward the rail. | Rail appears at the left edge and stays put while you reach it. | FR-ANN-01, NFR-USE-01 |
| S3 | Hover stars, click 4, hover again, click 4. | ★4 appears on the rail and a chip; second click removes both. | FR-ANN-04, FR-ANN-06 |
| S4 | Click the note button, type, press Enter. | Chip appears; text shows on hover and in the panel. | FR-ANN-07 |
| S5 | Drag-select a sentence; double-click a word; triple-click a line. | The bar appears each time above the selection, yellow first. | FR-HLT-01 |
| S6 | Click a swatch. Click the highlight. Recolor it. | Highlight paints; card opens; color changes without removing it. | FR-HLT-02, FR-HLT-05 |
| S7 | Press H three times. | Margin → Inline → Hidden → Margin; choice survives reload. | FR-DSP-01..04 |
| S8 | Print → With notes. | Preview shows every page open, callouts inline, overall card on top. | FR-DSP-05 |
| S9 | Share a note, log in as Marcus. | Marcus sees it with DR initials; his card for it is read-only. | FR-SHR-02..04 |
| S10 | As Marcus, look for Dana's private note. | Not in panel, chips, callouts, or overall card. | FR-SHR-01, NFR-SEC-02 |
| S11 | Click a panel row for a collapsed Interview section. | Page switches, section opens, block scrolls under the menu and flashes. | FR-PNL-03 |
| S12 | Scroll a tall block with the rail open; open a flyout near the bottom of the window. | Rail follows the pointer; flyout stays on screen and covers no text. | FR-ANN-02, NFR-USE-02 |

## Playwright automation

Spec files live in `tests/e2e/`. Each test logs in through the API, loads the report, and uses
`data-testid` hooks that the implementation must provide: `np-rail`, `np-flyout`, `np-chip`,
`np-card`, `np-selbar`, `np-panel`, `np-view`, `np-print`.

| Spec | Case | Req |
|---|---|---|
| `stamps.spec.ts` | Hovering a family opens the flyout; the family icon alone sets nothing | FR-ANN-04 |
| | Clicking 4 then 4 removes; 4 then 2 replaces; family icon clears | FR-ANN-05, FR-ANN-06 |
| | Only one stamp per family per block per user after repeated clicks | FR-ANN-06 |
| | Stamp never opens an editor; note button does and focuses the box | FR-ANN-07, FR-ANN-08 |
| `highlights.spec.ts` | Drag, dblclick, and triple-click each raise the bar | FR-HLT-01 |
| | Mouse-down inside the bar keeps the selection | FR-HLT-03 |
| | Swatch click creates a highlight whose chip has the color and icon | FR-HLT-02, FR-HLT-07 |
| | Clicking a highlight opens its card; recolor keeps it; remove deletes it | FR-HLT-05 |
| | Dblclick on an accordion heading word leaves the section open | FR-HLT-08 |
| `anchoring.spec.ts` | Seeded notes land under their seeded headings | FR-ANC-01, FR-ANC-03 |
| | A note whose quote is removed from the fixture appears in Unplaced | FR-ANC-04 |
| | A chart row whose score changes keeps its note | FR-ANC-03 |
| `display.spec.ts` | H cycles three modes; mode persists after reload | FR-DSP-01 |
| | Hidden shows no chips or highlight colors; panel rows still navigate | FR-DSP-02 |
| | Inline shows a callout per note; highlight without text shows its color | FR-DSP-04 |
| | Print with notes renders every page and the overall card | FR-DSP-05 |
| `sharing.spec.ts` | New note is private; toggle from row and from card | FR-SHR-01, FR-SHR-02 |
| | As Marcus, Dana's shared note is visible with DR initials and read-only | FR-SHR-03..05 |
| | As Marcus, Dana's private note is absent from the DOM and from the API response | NFR-SEC-02 |
| `panel.spec.ts` | N toggles the panel and the report width changes | FR-PNL-01 |
| | Row click switches page, opens the section, flashes the block | FR-PNL-03 |

One block of each kind is chosen by a helper, `pickBlocks(page)`, which returns the first heading,
paragraph, list item, table row, and chart row on the Interview page. Tests iterate those five, not
every block.

Illustrative shape of one case:

```ts
test('same value removes, new value replaces', async ({ page, dana }) => {
  const block = (await pickBlocks(page)).paragraph;
  await block.hover();
  await page.getByTestId('np-rail').getByLabel('Stars').hover();
  await page.getByTestId('np-flyout').getByLabel('4 stars').click();
  await expect(page.getByTestId('np-chip').filter({ hasText: '4' })).toHaveCount(1);
  await page.getByTestId('np-rail').getByLabel('Stars').hover();
  await page.getByTestId('np-flyout').getByLabel('2 stars').click();
  await expect(page.getByTestId('np-chip').filter({ hasText: '2' })).toHaveCount(1);
  await page.getByTestId('np-rail').getByLabel('Stars').hover();
  await page.getByTestId('np-flyout').getByLabel('2 stars').click();
  await expect(page.getByTestId('np-chip')).toHaveCount(0);
});
```

## API tests

Run with the API's test runner against the disposable database, no browser.

| Case | Expected | Req |
|---|---|---|
| GET without a session | 401 | NFR-SEC-01 |
| GET as Marcus | Dana's private rows absent; shared rows present | FR-SHR-03, NFR-SEC-02 |
| PATCH another user's annotation | 403, row unchanged | FR-SHR-04 |
| PATCH `author_id` or `quote` | 400 | FR-SHR-04 |
| POST a second star stamp on the same block | 409 | FR-ANN-06 |
| DELETE own annotation | 204; row has `deleted_at`; event logged | NFR-PRV-02 |
| GET with 500 seeded annotations | Under 300 ms | NFR-PRF-01 |

## Exit criteria

- Every M requirement has at least one passing automated or smoke case.
- Playwright and API suites pass on Chromium; nightly Firefox and WebKit have no new failures.
- Smoke test signed off by one interviewer who did not build the feature.
- A grep of the codebase for `SpeechRecognition`, `getUserMedia`, and `MediaRecorder` returns
  nothing (NFR-SEC-03).
