// Builds README.md (the Markdown version of the handout) from content.js.
const fs = require("fs");
const C = require("./content");

const RAW = "https://github.com/jeff-adkisson/ui-design-lecture/raw/main/handout";
const esc = (t) => t.replace(/\|/g, "\\|");
const cellList = (items, mark) => items.map((t) => `${mark} ${esc(t)}`).join("<br>");

const out = [];
out.push(`# ${C.title}`);
out.push("");
out.push(`*${C.subtitle}*`);
out.push("");
out.push(`**Printable versions:** [PDF](${RAW}/AI-Slop-vs-Agentic-SWE.pdf) · [Word (.docx)](${RAW}/AI-Slop-vs-Agentic-SWE.docx). Two-sided US Letter; print double-sided, flip on long edge.`);
out.push("");
out.push(`**${C.introSlop}**${C.introSlopText}**${C.introGood}**${C.introGoodText.replace("Left column is how slop gets made. Right column is how to do it properly.", "The middle column is how slop gets made. The right column is how to do it properly.")}`);
out.push("");
out.push(`| | ✕ ${C.slopHeader.replace(/\s+—\s+/, ": ").replace("AI SLOP", "AI Slop")} | ✓ ${C.goodHeader.replace(/\s+—\s+/, ": ").replace("AGENTIC SWE", "Agentic SWE")} |`);
out.push("|---|---|---|");
for (const r of [...C.rows1, ...C.rows2]) {
  out.push(`| **${r.label}** | ${cellList(r.slop, "✕")} | ${cellList(r.good, "✓")} |`);
}
out.push("");
out.push(`## ${C.loopTitle}`);
out.push("");
for (const [b, rest] of C.workflowSteps) {
  const n = b.match(/^(\d+)\.\s+(.*)$/);
  out.push(`${n[1]}. **${n[2]}**${rest}`);
}
out.push("");
out.push(`## ${C.slopSignsTitle}`);
out.push("");
for (const t of C.slopSigns) out.push(`- ✕ ${t}`);
out.push("");
out.push(`## ${C.goodHabitsTitle}`);
out.push("");
for (const t of C.goodHabits) out.push(`- ✓ ${t}`);
out.push("");
out.push(`> **${C.taglineBold.trim()}** ${C.taglineRest}`);
out.push("");
out.push("---");
out.push("");
out.push("## Files");
out.push("");
out.push("| File | What it is |");
out.push("|---|---|");
out.push("| `AI-Slop-vs-Agentic-SWE.docx` | The handout as a Word file. |");
out.push("| `AI-Slop-vs-Agentic-SWE.pdf` | A rendered copy for quick printing. |");
out.push("| `content.js` | The handout text. Edit this to change both the Word file and this page. |");
out.push("| `build.js` | Generates the `.docx` from `content.js` (needs the `docx` npm package). |");
out.push("| `build-md.js` | Generates this `README.md` from `content.js`. |");
out.push("");
out.push("Rebuild after editing `content.js`:");
out.push("");
out.push("```bash");
out.push("node build.js AI-Slop-vs-Agentic-SWE.docx && node build-md.js");
out.push("```");
out.push("");

fs.writeFileSync("README.md", out.join("\n"));
console.log("wrote README.md");
