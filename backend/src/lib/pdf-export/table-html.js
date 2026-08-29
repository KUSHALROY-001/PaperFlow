import { escapeHtml, renderTextWithMath } from "./math-html.js";
import { splitIntoTextBlocks } from "./text-blocks.js";

function tableBlockHtml(block, images) {
  const colgroupHtml =
    Array.isArray(block.colWidths) &&
    block.colWidths.length === block.header.length
      ? `<colgroup>${block.colWidths.map((width) => `<col style="width: ${width};">`).join("")}</colgroup>`
      : "";
  const headerCells = block.header
    .map((cell, index) => {
      const widthStyle = block.colWidths?.[index]
        ? ` style="width: ${block.colWidths[index]};"`
        : "";
      return `<th${widthStyle}>${renderTextWithMath(cell, images)}</th>`;
    })
    .join("");
  const bodyRows = block.rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell, index) => {
            const widthStyle = block.colWidths?.[index]
              ? ` style="width: ${block.colWidths[index]};"`
              : "";
            return `<td${widthStyle}>${renderTextWithMath(cell, images)}</td>`;
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
//
// images (optional): {slotKey: absoluteUrl} - passed straight through to
// every renderTextWithMath call below (cells AND prose lines alike), so a
// ![[img:slot_key]] marker resolves identically whether it's sitting in a
// table cell or a plain paragraph - see math-html.js#renderTextWithMath.
export function renderQuestionTextHtml(text, images) {
  // Same literal-\n normalization renderTextWithMath does internally,
  // done here too (redundant-but-harmless on real newlines) so table-row
  // detection below runs against actual line breaks rather than the
  // literal two-character "\n" some OCR/paste sources produce.
  const normalized = String(text ?? "").replace(/\\n/g, "\n");

  return splitIntoTextBlocks(normalized)
    .map((block) => {
      if (block.type === "table") return tableBlockHtml(block, images);

      const linesHtml = [];
      let proseLines = [];
      const flushProse = () => {
        if (proseLines.length === 0) return;
        linesHtml.push(
          `<p class="question-text">${renderTextWithMath(proseLines.join("\n"), images) || "&nbsp;"}</p>`,
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
              `<h${level} class="rich-heading rich-heading-${level}">${renderTextWithMath(content, images)}</h${level}>`,
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
