import { escapeHtml, renderTextWithMath } from "./math-html.js";
import { splitIntoTextBlocks } from "./text-blocks.js";

function tableBlockHtml(block) {
  const colgroupHtml =
    Array.isArray(block.colWidths) &&
    block.colWidths.length === block.header.length
      ? `<colgroup>${block.colWidths.map((w) => `<col style="width: ${w};">`).join("")}</colgroup>`
      : "";

  const headerCells = block.header
    .map((cell, i) => {
      const widthStyle = block.colWidths?.[i]
        ? ` style="width: ${block.colWidths[i]};"`
        : "";
      return `<th${widthStyle}>${renderTextWithMath(cell)}</th>`;
    })
    .join("");

  const bodyRows = block.rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell, i) => {
            const widthStyle = block.colWidths?.[i]
              ? ` style="width: ${block.colWidths[i]};"`
              : "";
            return `<td${widthStyle}>${renderTextWithMath(cell)}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");

  return `<table class="q-table" style="table-layout: fixed; width: 100%;">${colgroupHtml}<thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
}

// The PDF-export counterpart to QuestionContent.jsx's block rendering -
// same splitIntoTextBlocks call, same table/prose interleaving, just HTML
// strings instead of React elements. Replaces the old single
// `<p class="question-text">${renderTextWithMath(text)}</p>` render-html.js
// used to build directly, which is exactly why a List-I/List-II table
// exported as the same flattened, misaligned paragraph the screen render
// had before QuestionTable.jsx existed.
export function renderQuestionTextHtml(text) {
  // Same literal-\n normalization renderTextWithMath does internally,
  // done here too (redundant-but-harmless on real newlines) so table-row
  // detection below runs against actual line breaks rather than the
  // literal two-character "\n" some OCR/paste sources produce.
  const normalized = String(text ?? "").replace(/\\n/g, "\n");

  return splitIntoTextBlocks(normalized)
    .map((block) => {
      if (block.type === "table") return tableBlockHtml(block);

      const linesHtml = [];
      let proseLines = [];
      const flushProse = () => {
        if (proseLines.length === 0) return;
        linesHtml.push(
          `<p class="question-text">${renderTextWithMath(proseLines.join("\n")) || "&nbsp;"}</p>`,
        );
        proseLines = [];
      };

      block.content.split("\n").forEach((line) => {
          const heading = line.match(/^((?:(?:\*\*|~~|\*|<u>)*))(#{1,3})\s+/);
          if (heading) {
            flushProse();
            const level = heading[2].length;
            const content = `${heading[1]}${line.slice(heading[0].length)}`;
            linesHtml.push(
              `<h${level} class="rich-heading rich-heading-${level}">${renderTextWithMath(content)}</h${level}>`,
            );
            return;
          }

          proseLines.push(line);
        });
      flushProse();
      return linesHtml.join("");
    })
    .join("");
}
