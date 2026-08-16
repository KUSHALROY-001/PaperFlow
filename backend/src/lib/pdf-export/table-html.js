import { escapeHtml, renderTextWithMath } from "./math-html.js";
import { splitIntoTextBlocks } from "./text-blocks.js";

function tableBlockHtml(block) {
  const headerCells = block.header
    .map((cell) => `<th>${renderTextWithMath(cell)}</th>`)
    .join("");
  const bodyRows = block.rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${renderTextWithMath(cell)}</td>`).join("")}</tr>`,
    )
    .join("");

  return `<table class="q-table"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
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
    .map((block) =>
      block.type === "table"
        ? tableBlockHtml(block)
        : `<p class="question-text">${renderTextWithMath(block.content)}</p>`,
    )
    .join("");
}
