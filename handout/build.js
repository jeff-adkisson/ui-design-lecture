// Builds "AI Slop vs. Agentic SWE" handout — two-sided US Letter, two columns.
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
  ShadingType, BorderStyle, AlignmentType, LevelFormat, PageBreak, Header, Footer,
  PageNumber, VerticalAlign, TableLayoutType,
} = require("docx");

// ---------- palette ----------
const SLOP = "B3261E";      // red
const SLOP_BG = "FBEDEC";
const GOOD = "1B6E3A";      // green
const GOOD_BG = "EAF5EE";
const INK = "1F1F1F";
const MUTED = "5F6368";
const RULE = "D0D4D9";
const LABEL_BG = "F1F3F4";

const FONT = "Calibri";
const BODY = 18;    // 9pt (half-points)
const SMALL = 16;   // 8pt

// ---------- geometry (DXA) ----------
const PAGE_W = 12240, PAGE_H = 15840;
const MARGIN = 720; // 0.5"
const CONTENT_W = PAGE_W - 2 * MARGIN; // 10800
const LABEL_W = 1700;
const COL_W = (CONTENT_W - LABEL_W) / 2; // 4650

// ---------- helpers ----------
const run = (text, opts = {}) =>
  new TextRun({ text, font: FONT, size: BODY, color: INK, ...opts });

const para = (children, opts = {}) =>
  new Paragraph({
    children: Array.isArray(children) ? children : [run(children)],
    spacing: { before: 0, after: 60, line: 252 },
    ...opts,
  });

// bullet paragraph; `text` may be a string or array of runs
const bullet = (text, ref = "bullets") =>
  new Paragraph({
    children: Array.isArray(text) ? text : [run(text)],
    numbering: { reference: ref, level: 0 },
    spacing: { before: 0, after: 30, line: 240 },
  });

const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const thin = (color = RULE) => ({ style: BorderStyle.SINGLE, size: 4, color });

const cellBorders = {
  top: thin(), bottom: thin(), left: noBorder, right: noBorder,
};

function cell(children, width, opts = {}) {
  return new TableCell({
    children,
    width: { size: width, type: WidthType.DXA },
    borders: cellBorders,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: VerticalAlign.TOP,
    ...opts,
  });
}

function headerCell(text, width, fill, color) {
  return new TableCell({
    children: [
      new Paragraph({
        children: [run(text, { bold: true, size: 22, color: "FFFFFF" })],
        spacing: { before: 0, after: 0 },
        alignment: AlignmentType.LEFT,
      }),
    ],
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill, color: "auto" },
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
    margins: { top: 70, bottom: 70, left: 100, right: 100 },
  });
}

function labelCell(text) {
  return cell(
    [new Paragraph({
      children: [run(text, { bold: true, size: SMALL, color: INK, allCaps: true })],
      spacing: { before: 0, after: 0, line: 240 },
    })],
    LABEL_W,
    { shading: { type: ShadingType.CLEAR, fill: LABEL_BG, color: "auto" } }
  );
}

// A comparison row: label | slop bullets | agentic bullets
function row(label, slopItems, goodItems) {
  return new TableRow({
    cantSplit: true,
    children: [
      labelCell(label),
      cell(slopItems.map((t) => bullet(t, "slop")), COL_W,
        { shading: { type: ShadingType.CLEAR, fill: SLOP_BG, color: "auto" } }),
      cell(goodItems.map((t) => bullet(t, "good")), COL_W,
        { shading: { type: ShadingType.CLEAR, fill: GOOD_BG, color: "auto" } }),
    ],
  });
}

function compareTable(rows) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [LABEL_W, COL_W, COL_W],
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          headerCell("", LABEL_W, MUTED),
          headerCell("AI SLOP  —  how it gets made", COL_W, SLOP),
          headerCell("AGENTIC SWE  —  how it should be made", COL_W, GOOD),
        ],
      }),
      ...rows,
    ],
  });
}

function h1(text) {
  return new Paragraph({
    children: [run(text, { bold: true, size: 40, color: INK })],
    spacing: { before: 0, after: 40 },
  });
}
function h2(text, color = INK) {
  return new Paragraph({
    children: [run(text, { bold: true, size: 24, color })],
    spacing: { before: 120, after: 60 },
    keepNext: true,
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE, space: 2 } },
  });
}
function sub(text) {
  return new Paragraph({
    children: [run(text, { size: 20, color: MUTED, italics: true })],
    spacing: { before: 0, after: 120 },
  });
}

// Two-column side-by-side block (no label column), used on page 2
function twoCol(leftTitle, leftChildren, rightTitle, rightChildren) {
  const half = CONTENT_W / 2;
  const title = (t, color) =>
    new Paragraph({
      children: [run(t, { bold: true, size: 22, color })],
      spacing: { before: 0, after: 80 },
      keepNext: true,
    });
  const c = (children, fill) =>
    new TableCell({
      children,
      width: { size: half, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill, color: "auto" },
      borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
      margins: { top: 90, bottom: 90, left: 140, right: 140 },
      verticalAlign: VerticalAlign.TOP,
    });
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [half, half],
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: [
          c([title(leftTitle, SLOP), ...leftChildren], SLOP_BG),
          c([title(rightTitle, GOOD), ...rightChildren], GOOD_BG),
        ],
      }),
    ],
  });
}

// ---------- CONTENT: page 1 ----------
const rows1 = [
  row("Starting point",
    ["A vague prompt: “build me a login page.” No requirements, no constraints, no definition of done.",
     "The human has not thought about the problem before asking the AI to solve it."],
    ["A written problem statement: who the user is, what must be true when it works, what is out of scope.",
     "The engineer owns the understanding. The agent is briefed like a new teammate, not a vending machine."]),
  row("Design",
    ["None. The first thing the model emits becomes the architecture.",
     "Data model, API shape, and error handling are discovered by accident later."],
    ["Design is discussed before code: options, trade-offs, a short architectural decision record (ADR).",
     "The agent proposes two or three approaches; the human picks and explains why. The chosen design is written down."]),
  row("Documentation",
    ["No docs, or a README that was true three versions ago. The reasoning lives in a chat log nobody can find.",
     "Agents and new hires re-derive (and re-break) decisions because nothing explains why the code looks the way it does."],
    ["Architecture and decision records live beside the code (e.g. /docs/architecture) and change in the same PR as the code.",
     "Each record captures the context, the options considered, and why one won. Agents read it before changing code; humans read it to onboard."]),
  row("Context",
    ["Model has no idea how the rest of the codebase works, so it reinvents helpers that already exist.",
     "Copy-pastes code into chat with no repo access."],
    ["Agent works inside the repo with a written project guide: conventions, build and test commands, folder layout, and the “don’ts.”",
     "Existing patterns are read first and reused."]),
  row("Iteration",
    ["One shot. Paste the output, run it, pray.",
     "When it fails, paste the stack trace and accept whatever comes back. Repeat until it stops erroring."],
    ["Small, reviewable increments. Each step has a goal, a test, and a checkpoint commit.",
     "The engineer reads every diff and asks “why?” before moving on. Rejected ideas are rejected on purpose."]),
  row("Testing",
    ["No tests, or tests generated after the fact that assert whatever the code happens to do.",
     "“It ran once on my machine” is the acceptance criterion."],
    ["Tests express the intent, often written or agreed on before implementation.",
     "The agent runs the suite itself and reports real output. Failures are fixed, never skipped or deleted.",
     "Automated app tests (Playwright and similar) let the agent exhaustively exercise most or all user paths before review, which dramatically raises initial code quality."]),
  row("Standards",
    ["Mixed naming, three styles of error handling, dead imports, commented-out code, giant files.",
     "Hallucinated APIs and dependencies that do not exist."],
    ["Linters, formatters, and type checks run on every change and are enforced in CI.",
     "Every dependency is verified against its real docs. Style is the project’s style, not the model’s."]),
  row("Code review",
    ["Nobody reads it. The author cannot explain it. “The AI wrote it” is offered as a reason, not a warning."],
    ["The human reviews every line as if a junior had written it. If you can’t explain a line, it doesn’t ship.",
     "The author must be able to defend every design choice in the PR."]),
];

// ---------- CONTENT: page 2 ----------
const rows2 = [
  row("Adversarial review",
    ["None. The same conversation that wrote the code says it looks great."],
    ["A second agent, with fresh context, is told to break it: find bugs, security holes, missing edge cases, and unclear names. Use a reviewer from a different lab than the author (Codex + Claude, Gemini + Claude): different models have different blind spots.",
     "The human triages findings: confirmed issues become fixes or tickets; false positives are dismissed with a reason."]),
  row("Code submissions",
    ["One 4,000-line commit titled “updates.” No description, no test notes, pushed straight to main.",
     "Reviewers must reverse-engineer the intent. The PR sits for days, then gets rubber-stamped."],
    ["Small PRs that state what, why, and how it was tested, plus a short video walkthrough or an auto-generated presentation of the change.",
     "Static analysis runs before a human looks: linting, formatting, and a quality gate (SonarQube-style) must pass.",
     "Reviewers focus on design and correctness, not style. Same-day answers to comments keep approval pace high."]),
  row("Security & secrets",
    ["API keys in the prompt and in the code. Input validation is whatever the model felt like.",
     "Dependencies installed because the model named them."],
    ["Secrets live in the environment, never in chat or source. Security review is an explicit step.",
     "Every new dependency is justified, pinned, and checked."]),
  row("Ownership",
    ["The human is a passenger. When it breaks in production, nobody understands it well enough to fix it."],
    ["The human is the engineer of record. The agents are force multipliers.",
     "You are accountable for everything you ship, regardless of who or what typed it."]),
];

const workflowSteps = [
  ["1. Understand", " — write the problem, constraints, and acceptance criteria. Ask the agent to restate them."],
  ["2. Design", " — have the agent propose options; choose, and record the decision where the code lives."],
  ["3. Plan", " — break the work into small steps, each with a verifiable outcome."],
  ["4. Implement", " — agent writes code and tests in the repo, one step at a time, following project standards."],
  ["5. Verify", " — run unit and automated app tests, linters, formatters, and static analysis. Read the real output, not the summary."],
  ["6. Review", " — human reads the diff line by line. Ask the agent to explain anything unclear."],
  ["7. Adversarial review", " — a separate agent with fresh context attacks the change. Triage its findings."],
  ["8. Document", " — update the architecture docs and decision records in the same PR as the code."],
  ["9. Submit", " — small PR, clear description, walkthrough video or generated presentation, green CI, human approval and merge."],
];


const slopSigns = [
  "The author cannot explain why a line exists.",
  "Comments describe what the code does, never why.",
  "Functions and files that duplicate something already in the repo.",
  "Imports, packages, or API methods that do not exist.",
  "Tests that only assert the current behavior and never fail.",
  "Catch-all error handling that swallows exceptions silently.",
  "“The AI did it” offered as an explanation.",
];

const goodHabits = [
  "Small and single-purpose: one change, one reason.",
  "Description answers what, why, and how it was tested.",
  "A short video walkthrough or auto-generated presentation.",
  "Static analysis already green: linting, formatting, quality gate.",
  "Architecture docs and decision records updated in the same PR.",
  "Adversarial review by an agent from a different lab already run; findings listed and resolved.",
  "Same-day replies to comments; fast submissions earn fast approvals.",
];


// ---------- DOCUMENT ----------
const numbering = {
  config: [
    { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 240, hanging: 180 } } } }] },
    { reference: "slop", levels: [{ level: 0, format: LevelFormat.BULLET, text: "✕", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 240, hanging: 200 } }, run: { color: SLOP, bold: true } } }] },
    { reference: "good", levels: [{ level: 0, format: LevelFormat.BULLET, text: "✓", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 240, hanging: 200 } }, run: { color: GOOD, bold: true } } }] },
  ],
};

const footer = new Footer({
  children: [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [
        run("AI Slop vs. Agentic SWE  ·  KSU  ·  ", { size: SMALL, color: MUTED }),
        new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: SMALL, color: MUTED }),
        run(" of 2", { size: SMALL, color: MUTED }),
      ],
    }),
  ],
});

const doc = new Document({
  creator: "Jeff Adkisson",
  title: "AI Slop vs. Agentic SWE",
  numbering,
  styles: {
    default: { document: { run: { font: FONT, size: BODY, color: INK } } },
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN, footer: 360 },
        },
      },
      footers: { default: footer },
      children: [
        // ----- PAGE 1 -----
        h1("AI Slop vs. Agentic Software Engineering"),
        sub("Same tools. Opposite outcomes. The difference is the human in the loop, not the model."),
        para([
          run("AI slop", { bold: true, color: SLOP }),
          run(" is code generated without understanding, design, or review, then shipped because it ran once. "),
          run("Agentic SWE", { bold: true, color: GOOD }),
          run(" is a partnership: a software engineer who owns the problem, working with one or more AI agents that draft, test, and critique inside a disciplined process. Left column is how slop gets made. Right column is how to do it properly."),
        ], { spacing: { before: 0, after: 140, line: 260 } }),
        compareTable(rows1),

        // ----- PAGE 2 -----
        new Paragraph({ children: [new PageBreak()] }),
        compareTable(rows2),

        h2("The Agentic SWE loop (one pass per small change)"),
        ...workflowSteps.map(([b, rest]) =>
          new Paragraph({
            children: [run(b, { bold: true, color: GOOD }), run(rest)],
            spacing: { before: 0, after: 24, line: 240 },
            indent: { left: 120 },
          })
        ),

        new Paragraph({ children: [run("")], spacing: { before: 0, after: 80 } }),
        twoCol(
          "How to spot slop in a code review",
          slopSigns.map((t) => bullet(t, "slop")),
          "Anatomy of a great code submission",
          goodHabits.map((t) => bullet(t, "good"))
        ),

        new Paragraph({
          spacing: { before: 80, after: 0 },
          alignment: AlignmentType.CENTER,
          children: [
            run("The model is not the engineer. You are. ", { bold: true, size: 22 }),
            run("Agents make a good engineer much faster and a careless one much more dangerous.", { size: 22, color: MUTED }),
          ],
        }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  const out = process.argv[2] || "AI-Slop-vs-Agentic-SWE.docx";
  fs.writeFileSync(out, buf);
  console.log("wrote", out);
});
