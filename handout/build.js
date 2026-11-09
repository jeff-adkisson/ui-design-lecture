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
          headerCell(C.slopHeader, COL_W, SLOP),
          headerCell(C.goodHeader, COL_W, GOOD),
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

const C = require("./content");
const rows1 = C.rows1.map((r) => row(r.label, r.slop, r.good));
const rows2 = C.rows2.map((r) => row(r.label, r.slop, r.good));
const { workflowSteps, slopSigns, goodHabits } = C;

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
  title: C.title,
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
        h1(C.title),
        sub(C.subtitle),
        para([
          run(C.introSlop, { bold: true, color: SLOP }),
          run(C.introSlopText),
          run(C.introGood, { bold: true, color: GOOD }),
          run(C.introGoodText),
        ], { spacing: { before: 0, after: 140, line: 260 } }),
        compareTable(rows1),

        // ----- PAGE 2 -----
        new Paragraph({ children: [new PageBreak()] }),
        compareTable(rows2),

        h2(C.loopTitle),
        ...workflowSteps.map(([b, rest]) =>
          new Paragraph({
            children: [run(b, { bold: true, color: GOOD }), run(rest)],
            spacing: { before: 0, after: 24, line: 240 },
            indent: { left: 120 },
          })
        ),

        new Paragraph({ children: [run("")], spacing: { before: 0, after: 80 } }),
        twoCol(
          C.slopSignsTitle,
          slopSigns.map((t) => bullet(t, "slop")),
          C.goodHabitsTitle,
          goodHabits.map((t) => bullet(t, "good"))
        ),

        new Paragraph({
          spacing: { before: 80, after: 0 },
          alignment: AlignmentType.CENTER,
          children: [
            run(C.taglineBold, { bold: true, size: 22 }),
            run(C.taglineRest, { size: 22, color: MUTED }),
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
