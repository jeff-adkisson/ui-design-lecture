# 02 · Requirements: Report Notes

Numbered requirements for Report Notes in Assessment System, derived from the prototype and the
project review. Every later document, test, and prompt refers to these IDs. Priority uses MoSCoW:
**M** must, **S** should, **C** could.

## Contents

1. [Conventions](#conventions)
2. [Functional requirements](#functional-requirements)
   - [Anchoring (ANC)](#anchoring-anc)
   - [Inline notes and stamps (ANN)](#inline-notes-and-stamps-ann)
   - [Highlights (HLT)](#highlights-hlt)
   - [Overall notes (OVR)](#overall-notes-ovr)
   - [Display and print (DSP)](#display-and-print-dsp)
   - [Notes panel (PNL)](#notes-panel-pnl)
   - [Sharing and ownership (SHR)](#sharing-and-ownership-shr)
   - [Persistence (PER)](#persistence-per)
3. [Non-functional requirements](#non-functional-requirements)
4. [Explicit exclusions](#explicit-exclusions)

## Conventions

- `FR-<area>-<nn>` is functional, `NFR-<area>-<nn>` is non-functional.
- "Block" means any heading, paragraph, list item, table row, or chart row in the report.
- "Family" means thumbs, stars, or markers. "Stamp" means one value from a family.
- "User" means a logged-in interviewer with access to the report.

## Functional requirements

### Anchoring (ANC)

| ID | Requirement | Pri |
|---|---|---|
| FR-ANC-01 | Every annotation is anchored by page name, nearest section heading, and quoted block text, never by DOM position. | M |
| FR-ANC-02 | Highlights also store up to 32 characters of text before and after the quote. | M |
| FR-ANC-03 | On load, each annotation is re-anchored: exact quote under the same heading first, then exact quote on the page, then the best partial match. | M |
| FR-ANC-04 | An annotation whose quote cannot be found is shown in an Unplaced group and is never deleted automatically. | M |
| FR-ANC-05 | Every annotation records the report version it was made against. | M |

### Inline notes and stamps (ANN)

| ID | Requirement | Pri |
|---|---|---|
| FR-ANN-01 | Resting the pointer on any block shows a rail outside its left edge with thumbs, stars, markers, and note. | M |
| FR-ANN-02 | The rail follows the pointer inside tall blocks and stays within the visible area. | M |
| FR-ANN-03 | Thumbs offer up and down; stars offer 1 to 5; markers offer follow-up, flag, deal breaker, strong, and great answer. | M |
| FR-ANN-04 | Family buttons open a flyout on hover; a value is set only by clicking it. | M |
| FR-ANN-05 | Clicking the family button clears that family's stamp on the block if the user has one, otherwise does nothing. | M |
| FR-ANN-06 | One stamp per family per block per user. A new value replaces; the same value removes. | M |
| FR-ANN-07 | The note button opens an editor under the block with focus in the text box. Enter saves, Escape cancels. | M |
| FR-ANN-08 | Stamps never open an editor. Text is added to a stamp from its chip or panel row. | M |
| FR-ANN-09 | A stamp or highlight may carry text; that text appears everywhere the annotation does. | M |
| FR-ANN-10 | Clicking a chip opens a card to edit text, change the value, or delete, with undo. | S |

### Highlights (HLT)

| ID | Requirement | Pri |
|---|---|---|
| FR-HLT-01 | Selecting report text by drag, double-click, triple-click, or keyboard shows a bar above the selection with four swatches (yellow first) and "Highlight and note". | M |
| FR-HLT-02 | One click on a swatch creates the highlight; the bar follows the live selection and hides when it collapses. | M |
| FR-HLT-03 | Clicking inside the bar never disturbs the selection. | M |
| FR-HLT-04 | The bar flips below the selection when there is no room above. | S |
| FR-HLT-05 | Clicking an existing highlight opens its card to recolor, add or edit a note, or remove it. | M |
| FR-HLT-06 | Text inside a highlight can be selected and highlighted again. | S |
| FR-HLT-07 | Every highlight's chip shows a swatch in its color plus a highlighter icon. | M |
| FR-HLT-08 | Double-clicking a word in an accordion heading selects the word and leaves the section as it was, without delaying the first click. | S |

### Overall notes (OVR)

| ID | Requirement | Pri |
|---|---|---|
| FR-OVR-01 | An overall card above the report header holds a rating strip and any number of text notes. | M |
| FR-OVR-02 | Per user the strip allows one thumb, one star rating, and one marker, using the same flyout and clear rules as the rail. | M |
| FR-OVR-03 | The panel's first group is Overall and includes a text box to add an overall note. | M |
| FR-OVR-04 | Nothing is added to the report footer. | M |

### Display and print (DSP)

| ID | Requirement | Pri |
|---|---|---|
| FR-DSP-01 | A three-way control offers Hidden, Margin, and Inline. H cycles it. The choice is remembered per user. | M |
| FR-DSP-02 | Hidden removes chips and highlight colors; the panel still works. | M |
| FR-DSP-03 | Margin shows one chip per annotation in the right gutter, aligned to its block, icon only until hovered. | M |
| FR-DSP-04 | Inline renders each annotation as a callout under its block; highlights without text get a short callout showing their color. | M |
| FR-DSP-05 | Print offers "with notes" and "without notes" and opens an in-page preview of all pages. With notes uses inline callouts and the overall card. | M |

### Notes panel (PNL)

| ID | Requirement | Pri |
|---|---|---|
| FR-PNL-01 | A right-hand panel toggles with N and a button; the report reflows beside it rather than being covered. | M |
| FR-PNL-02 | Notes are listed in report order, grouped by page and section heading, with Unplaced first. | M |
| FR-PNL-03 | Clicking a row switches page, opens a collapsed section if needed, scrolls to the block, and flashes it. | M |
| FR-PNL-04 | Each row shows heading, quote, text, value, author, relative time, and visibility. | M |

### Sharing and ownership (SHR)

| ID | Requirement | Pri |
|---|---|---|
| FR-SHR-01 | New annotations are private. | M |
| FR-SHR-02 | The owner toggles an annotation between Private and Shared from its row or card. | M |
| FR-SHR-03 | Shared annotations are visible to any user who can open the report. | M |
| FR-SHR-04 | Nobody can edit, delete, recolor, re-rate, or change sharing on another user's annotation. Their cards open read-only and name the owner. | M |
| FR-SHR-05 | Chips for other users' shared annotations show the owner's initials. | S |

### Persistence (PER)

| ID | Requirement | Pri |
|---|---|---|
| FR-PER-01 | Annotations are stored on the server and loaded with the report. | M |
| FR-PER-02 | Each annotation stores heading, quote, type, value, text, author, time, visibility, and report version. | M |
| FR-PER-03 | Each save returns the stored annotation so the client can reconcile ids and timestamps. | M |

## Non-functional requirements

| ID | Requirement | Pri |
|---|---|---|
| NFR-SEC-01 | Every request is authenticated; there are no anonymous annotations. | M |
| NFR-SEC-02 | Ownership and visibility are enforced by the API and database, not only by the browser. | M |
| NFR-SEC-03 | No speech-to-text, microphone capture, or audio upload of any kind. | M |
| NFR-PRV-01 | Annotations are treated as candidate PII: same access, retention, and audit rules as the report. | M |
| NFR-PRV-02 | Deletions are soft and auditable. | S |
| NFR-USE-01 | Every stamp, highlight, and note is one or two gestures from where the pointer already is. | M |
| NFR-USE-02 | The rail, flyouts, selection bar, and cards never leave the visible area or cover the text being read. | M |
| NFR-USE-03 | Keyboard reach for panel (N), display mode (H), save (Enter), and cancel (Escape). | S |
| NFR-PRF-01 | Loading all visible annotations for one report completes in under 300 ms at the API for 500 annotations. | S |
| NFR-PRF-02 | A save round-trips in under 200 ms at the API. | S |
| NFR-CMP-01 | Current desktop Chrome, Edge, Firefox, and Safari. No mobile layouts. | M |

## Explicit exclusions

- Speech-to-text and microphone capture (NFR-SEC-03).
- AI summaries of notes; the data model supports them, no endpoint or UI is built.
- Real-time collaboration between interviewers.
- Mobile and tablet layouts.
