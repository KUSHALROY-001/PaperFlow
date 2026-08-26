// Recognizes a GitHub-Flavored-Markdown-style table: a header row, a
// separator row (only -, :, |, and whitespace), then zero or more body
// rows, every row wrapped in leading/trailing `|`. Matches what the
// extraction prompt (worker/ai/provider.py's SYSTEM_PROMPT) now instructs
// the model to emit for a List-I/List-II or data table instead of
// flattening it into a bulleted paragraph (the bug this file exists to
// fix - see QuestionTable.jsx).
// Recognizes a GitHub-Flavored-Markdown-style table: a header row
// containing at least one `|`, immediately followed by a separator row
// (only -, :, |, and whitespace, with at least one of each). Matches what
// the extraction prompt (worker/ai/provider.py's SYSTEM_PROMPT) now
// instructs the model to emit for a List-I/List-II or data table instead
// of flattening it into a bulleted paragraph (the bug this file exists to
// fix - see QuestionTable.jsx). Deliberately does NOT require
// leading/trailing `|` on every row - real GFM doesn't require it either,
// and requiring it rejected well-formed tables the model emits without
// the outer pipes (e.g. "List-I | List-II" with no leading/trailing `|`
// at all).
function isTableRow(line) {
  return line.includes("|");
}

function isSeparatorRow(line) {
  const trimmed = line.trim();
  if (!trimmed.includes("|") || !trimmed.includes("-")) return false;
  return /^[\s|:-]+$/.test(trimmed);
}

// Splits a table row into cells on `|`, ignoring any `|` that falls inside
// a $...$ math span - a `\left| x \right|`-style absolute value is common
// enough in these questions that a naive split-on-`|` would silently
// corrupt the table around it. Doesn't need to handle $$...$$ specially:
// a display-math block spanning a table cell would already be unusual
// enough to not worry about, and single-$ toggling still degrades
// gracefully (worst case, extra/missing cells on that one malformed row).
function splitTableRow(line) {
  const cleaned = line.replace(/<!--\s*colwidths:[^>]*-->/gi, "");
  const trimmed = cleaned.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let current = "";
  let inMath = false;
  for (let i = 0; i < trimmed.length; i += 1) {
    const char = trimmed[i];
    if (char === "$") inMath = !inMath;
    if (char === "|" && !inMath) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function extractColWidths(headerLine, separatorLine) {
  const combined = `${headerLine} ${separatorLine}`;
  const match = combined.match(/<!--\s*colwidths:\s*([^>]+?)\s*-->/i);
  if (match) {
    const rawParts = match[1].split(",").map((s) => s.trim().replace("%", ""));
    const nums = rawParts.map(Number).filter((n) => Number.isFinite(n) && n > 0);
    if (nums.length > 0) {
      const total = nums.reduce((a, b) => a + b, 0);
      return nums.map((n) => `${Math.round((n / total) * 100)}%`);
    }
  }

  const sepCells = splitTableRow(separatorLine);
  const sepWidths = [];
  for (const cell of sepCells) {
    const widthMatch = cell.match(/(\d+)%/);
    if (widthMatch) {
      sepWidths.push(Number(widthMatch[1]));
    }
  }
  if (sepWidths.length === sepCells.length && sepWidths.length > 0) {
    const total = sepWidths.reduce((a, b) => a + b, 0);
    return sepWidths.map((n) => `${Math.round((n / total) * 100)}%`);
  }

  return null;
}

// Splits `text` into an ordered list of { type: "prose", content } and
// { type: "table", header, rows, colWidths } blocks.
export function splitIntoTextBlocks(text) {
  const lines = String(text ?? "").split("\n");
  const blocks = [];
  let prose = [];

  const flushProse = () => {
    if (prose.length) {
      blocks.push({ type: "prose", content: prose.join("\n") });
      prose = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const next = lines[i + 1];
    if (
      isTableRow(line.trim()) &&
      next !== undefined &&
      isSeparatorRow(next.trim())
    ) {
      flushProse();
      const colWidths = extractColWidths(line, next);
      const header = splitTableRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && isTableRow(lines[i].trim())) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: "table", header, rows, colWidths });
    } else {
      prose.push(line);
      i += 1;
    }
  }
  flushProse();

  return blocks;
}

export function updateTableColWidthsInMarkdown(
  text,
  tableIndex = 0,
  newColWidths = [],
) {
  if (!text || !newColWidths || newColWidths.length === 0) return text;

  const lines = String(text).split("\n");
  let currentTableIndex = -1;
  let i = 0;

  const formattedWidthsComment = `<!-- colwidths: ${newColWidths
    .map((w) => String(w).replace("%", "") + "%")
    .join(", ")} -->`;

  while (i < lines.length) {
    const line = lines[i];
    const next = lines[i + 1];
    if (
      isTableRow(line.trim()) &&
      next !== undefined &&
      isSeparatorRow(next.trim())
    ) {
      currentTableIndex += 1;
      if (currentTableIndex === tableIndex) {
        const cleanedHeader = line
          .replace(/<!--\s*colwidths:[^>]*-->/gi, "")
          .trim();
        lines[i] = `${cleanedHeader} ${formattedWidthsComment}`;
        return lines.join("\n");
      }
      i += 2;
      while (i < lines.length && isTableRow(lines[i].trim())) {
        i += 1;
      }
    } else {
      i += 1;
    }
  }

  return lines.join("\n");
}

