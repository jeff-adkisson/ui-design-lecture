# 01 · Project Review: Report Notes for Assessment System

Report Notes lets interviewers annotate a candidate's assessment report inside Assessment System.
This document records what the project is, why it exists, and the technical concerns that shape the
rest of the design set. It is the entry point; each later document assumes you have read it.

## Contents

1. [What the project is](#what-the-project-is)
2. [Motivation](#motivation)
3. [Scope](#scope)
4. [Stakeholders](#stakeholders)
5. [What the prototype established](#what-the-prototype-established)
6. [Technical concerns](#technical-concerns)
7. [Risks](#risks)
8. [Document set](#document-set)

## What the project is

Assessment System produces a multi-page candidate report (Summary, Interview, and similar pages)
made of headings, paragraphs, lists, tables, and score charts. Report Notes adds a layer on top of
that report where a logged-in interviewer can:

- stamp any block with a thumb, a star rating, or a marker,
- write a short note against any block,
- highlight selected text in one of four colors, with an optional note,
- rate and note the candidate overall,
- keep every note private or share it with other interviewers,
- show notes in the margin, inline, or hidden, and print the report with or without them.

The prototype in `../prototype.html` is a clickable, single-file demonstration of that behavior with
notes kept in browser storage. This design set turns it into a plan for a real implementation.

## Motivation

Interviewers read the report before an interview, glance at it during, and reconcile their
impressions afterward. Today those impressions live in email, paper, or memory. The goals are:

- **Capture in context.** A note sits next to the sentence or score that prompted it.
- **Low effort.** Every action takes one or two gestures so the interviewer stays focused on the
  candidate, not the tool.
- **Shared judgement.** Several interviewers see each other's shared notes on one candidate and can
  compare before a hiring decision.
- **Future summarization.** Notes carry enough structure (heading, quote, type, value, author, time,
  report version) that a later feature can hand them to an AI for a summary. The summary itself is
  out of scope.

## Scope

In scope: inline notes, stamps, highlights, overall notes, display modes, print preview, private and
shared visibility, a notes panel, persistence through a Node API to Postgres.

Out of scope, by decision:

- **Speech-to-text and microphone capture.** Audio leaving the platform is a PII and compliance
  problem for interview content. Nothing in this design set may add it.
- AI summaries of notes (data model supports them; no endpoint or UI).
- Mobile layouts. Interviewers use desktop browsers.
- Real-time collaboration. Notes refresh on load and after each save.

## Stakeholders

| Role | Interest |
|---|---|
| Interviewers | Fast capture, nothing lost, private by default |
| Hiring managers | See every shared note on one candidate in one place |
| Platform engineering | Fits the existing Node API and Postgres schema, no new infrastructure |
| Security and compliance | Server-enforced ownership and visibility, no audio, auditable changes |

## What the prototype established

The prototype was built one prompt at a time and settled these design decisions, which the later
documents treat as fixed:

- Notes anchor to **section heading plus quoted text**, never to DOM position, so they survive
  report changes. A note whose quote can no longer be found is shown as **Unplaced**, not dropped.
- A **hover rail** to the left of any block carries the four actions; stamps use hover flyouts and
  require a click on a value. The same value removes, a new value replaces, and one stamp per
  family per block per user.
- A **selection bar** appears above any text selection with four swatches, yellow first.
- Notes appear as **margin chips**, **inline callouts**, or **hidden**, cycled with the H key.
- An **overall card** above the report header holds per-person ratings and free-text notes.
- Notes are **private by default**; only the owner can edit, delete, or change sharing.

## Technical concerns

| Concern | Position |
|---|---|
| Report changes | Store heading, quote, and surrounding context; re-anchor on load; show Unplaced on failure. Store the report version each note was made against. |
| Ownership and visibility | Enforced in SQL and in the API, never only in the browser. The browser hides what it should not show, but the server never sends it. |
| Candidate PII | Notes are about a candidate and are themselves sensitive. Same retention, access, and audit rules as the report. |
| Concurrency | Last write wins per note with an `updated_at` check; conflicts are rare because each note has one owner. |
| Performance | One request loads all annotations visible to the user for one report. Typical volume is under 100 notes per report. |
| Printing | In-page print preview assembles all pages with notes inline, so the output is predictable across browsers. |
| Accessibility | Keyboard reach for the panel and display mode; rail actions have ARIA labels; color never carries meaning alone (highlights also carry an icon). |

## Risks

- **Anchoring drift.** Reports are regenerated when scoring changes. Mitigated by context text and the
  Unplaced group; measured in acceptance testing.
- **Over-sharing.** A note shared by mistake is visible to every interviewer on the candidate.
  Mitigated by private-by-default and a clear state label on every note.
- **Scope creep toward transcription.** Explicitly refused; see Scope.

## Document set

| Document | Purpose |
|---|---|
| `02-requirements.md` | Numbered functional and non-functional requirements |
| `03-technical-design.md` | Architecture, data model, API |
| `04-ui-design.md` | What the UI must do and the conventions it follows |
| `05-acceptance-testing.md` | Human smoke tests and Playwright automation |
| `prompts/` | Prompts an agent could use to implement each document |
