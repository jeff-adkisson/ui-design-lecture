# 04 · UI Design: Report Notes

What the Report Notes interface must accomplish and the conventions it follows, so that an
implementation matches the prototype without copying it line by line. Requirement IDs refer to
`02-requirements.md`. The prototype in `../prototype.html` is the visual reference.

## Contents

1. [Goals](#goals)
2. [Regions](#regions)
3. [Control sets](#control-sets)
4. [Interaction rules](#interaction-rules)
5. [Visual conventions](#visual-conventions)
6. [Keyboard](#keyboard)
7. [States](#states)
8. [Accessibility](#accessibility)

## Goals

- The report stays the main thing on screen. Notes sit beside it, never on top of what is being read.
- Any action is one or two gestures from where the pointer already is (NFR-USE-01).
- An interviewer can tell at a glance whose note it is and whether it is private.

## Regions

```
┌──────────────────────────────────────────────────────────────┬────────────┐
│ App bar: brand · breadcrumb · [Hidden|Margin|Inline] H ·     │ Notes panel│
│          Print ▾ · Notes (12) N · Viewing as ▾               │  Overall   │
├──────────────────────────────────────────────────────────────┤  Unplaced  │
│ Overall card: rating strip · overall notes                   │  Summary › │
├────┬─────────────────────────────────────────────────┬───────┤   heading  │
│rail│ report block                                    │ chip  │    row     │
│ 👍 │ …text…  [selection bar above selected text]     │ ★4 DR │    row     │
│ ★  │                                                 │       │  Interview›│
│ ⚑  │ (inline mode: callout under the block)          │       │    row     │
│ ✎  │ (card opens under the block when a chip is      │       │            │
│    │  clicked)                                       │       │ footer hints│
└────┴─────────────────────────────────────────────────┴───────┴────────────┘
```

| Region | Must accomplish | Req |
|---|---|---|
| App bar | Thin, always visible, holds the display control, print menu, panel toggle with count, and the signed-in user | FR-DSP-01, FR-DSP-05, FR-PNL-01 |
| Notes panel | Docked right, report reflows beside it, grouped list in report order | FR-PNL-01..04 |
| Overall card | Above the report header: rating strip plus list of overall notes | FR-OVR-01..03 |
| Hover rail | Appears just outside a block's left edge, four buttons, follows the pointer in tall blocks | FR-ANN-01..02 |
| Flyout | Opens from a family button on hover, shows that family's values | FR-ANN-03..04 |
| Margin chip | One per annotation in the right gutter, aligned to its block | FR-DSP-03, FR-SHR-05 |
| Card | Opens under the block from a chip, callout, or highlight; edits text, value, visibility; delete with undo | FR-ANN-10, FR-HLT-05 |
| Inline callout | A note rendered under its block, sharing the block's indent | FR-DSP-04 |
| Selection bar | Floats above the live selection: four swatches and "Highlight and note" | FR-HLT-01..04 |
| Print preview | In-page sheet of every page, every section open, with or without notes | FR-DSP-05 |

## Control sets

**Rail (per block).** Thumbs, stars, markers, note. Each family button shows the user's current value
when set (👍, ★4, 💣); otherwise the family icon.

| Family | Values | Meaning |
|---|---|---|
| Thumbs | up, down | Agree or disagree with the block |
| Stars | 1 2 3 4 5 | Strength of the evidence |
| Markers | ? follow up · ⚑ flag · 💣 deal breaker · 🔥 strong · 👏 great answer | Interview actions |
| Note | ✎ | Opens the editor |

**Highlight swatches.** Yellow, green, blue, pink, in that order, yellow first because it is the
default. Plus "Highlight and note", which highlights in yellow and opens the card.

**Display control.** A segmented control: Hidden · Margin · Inline, with a `H` key hint.

**Print menu.** With notes · Without notes.

**Viewing as.** A select listing interviewers on this candidate; stands in for login during review
and in the prototype only. Production reads the session.

**Visibility toggle.** On every owned row and card: "Private · share" or "Shared · make private".

## Interaction rules

- **Hover reveals, click commits.** The rail and flyouts appear on hover; nothing is saved until a
  value is clicked (FR-ANN-04).
- **Same value removes, new value replaces, family icon clears** (FR-ANN-05..06). The overall strip
  follows the same rule (FR-OVR-02).
- **Editors:** Enter saves, Shift+Enter adds a line, Escape cancels, focus starts in the text box
  (FR-ANN-07). Stamps never open an editor (FR-ANN-08).
- **Selection bar** follows the live selection, flips below when there is no room above, hides when
  the selection collapses, and swallows mouse-down so the selection survives (FR-HLT-02..04).
- **Accordion headings:** the first click acts at once; a second click inside the double-click
  window restores the section and the word stays selected (FR-HLT-08).
- **Panel row click:** switch page, open the section, scroll the block under the sticky menu,
  flash it, open its card (FR-PNL-03).
- **Undo:** delete and remove-highlight show a toast with Undo for a few seconds.
- **Nothing pops over text.** Rail sits in the left gutter, chips in the right gutter, cards and
  callouts push content down rather than overlaying it (NFR-USE-02).

## Visual conventions

| Element | Convention |
|---|---|
| App bar | 44 px, neutral dark, white text, report's page menu sticks just below it |
| Highlight colors | yellow `#fff3a3`, green `#c9f2c7`, blue `#cfe6ff`, pink `#ffd6e7`; always paired with a highlighter icon on the chip so color never carries meaning alone |
| Author colors | One hue per interviewer, used as a chip edge, card edge, and initials badge; the signed-in user is always the first hue |
| Chips | 20 px, icon only, expand to show text on hover, initials for other people's shared notes |
| Private marker | A small lock icon beside the time on rows, cards, and callouts |
| Read-only card | Same card without inputs, plus "Marcus Lee's note. Only Marcus can change it." |
| Unplaced group | Panel group at the top with a muted "Not found in this report" header |
| Typography | Inherit the report's font; notes layer uses the report's base size minus one step |
| Motion | Flash on navigate (300 ms), flyout fade (120 ms); no other animation |

## Keyboard

| Key | Action | Req |
|---|---|---|
| N | Toggle the notes panel | FR-PNL-01 |
| H | Cycle Hidden → Margin → Inline | FR-DSP-01 |
| Enter / Escape | Save / cancel in any editor | FR-ANN-07 |
| Shift+Arrow | Extends a selection and raises the selection bar | FR-HLT-01 |

Keys are ignored while typing in a field or when a modifier is held.

## States

| State | Appearance |
|---|---|
| Own private note | Author color edge, lock icon, editable |
| Own shared note | Author color edge, no lock, editable, "Shared · make private" |
| Other's shared note | Owner's color edge and initials, read-only card |
| Other's private note | Never rendered; never sent by the server |
| Unplaced | Listed in the panel only, with the quote it is looking for |
| Hidden mode | No chips, callouts, highlight colors, or overall card; the panel still navigates |

## Accessibility

- Every rail, flyout, chip, and bar button has an `aria-label`; the rail is a `toolbar`, the panel a
  complementary landmark, the display control a `group` with `aria-pressed`.
- Highlights carry an icon and a title as well as a color.
- Focus is visible on every control; cards trap focus while open and return it on close.
- Desktop only (NFR-CMP-01); no responsive breakpoints are required.
