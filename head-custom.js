// Renders fenced ```mermaid blocks on GitHub Pages, where Jekyll leaves them as code.
import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11.14.0/dist/mermaid.esm.min.mjs";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  flowchart: { useMaxWidth: false },
  themeVariables: { background: "#ffffff", primaryColor: "#ffffff", primaryTextColor: "#000000", lineColor: "#000000", textColor: "#000000" },
});

document.querySelectorAll("pre > code.language-mermaid").forEach((code) => {
  const wrap = document.createElement("div");
  wrap.className = "mermaid-wrap";
  const container = document.createElement("div");
  container.className = "mermaid";
  container.textContent = (code.textContent || "").trimEnd();
  wrap.appendChild(container);
  code.parentElement.replaceWith(wrap);
});
await mermaid.run({ querySelector: ".mermaid" });
