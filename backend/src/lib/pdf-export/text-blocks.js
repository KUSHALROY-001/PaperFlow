// Mirrors frontend/src/utils/textBlocks.js EXACTLY - same table
// detection, same math-aware `|` splitting. Duplicated rather than
// imported for the same reason math-html.js duplicates MATH_TOKEN_RE (see
// that file's header): frontend and backend are separate npm projects: no
// shared module boundary to import across. Keep both in sync if the table
// syntax ever changes.
// Recognizes a GitHub-Flavored-Markdown-style table: a header row
// containing at least one `|`, immediately followed by a separator row
// (only -, :, |, and whitespace, with at least one of each). Deliberately
// does NOT require leading/trailing `|` on every row - real GFM doesn't
// require it either, and requiring it turned out to reject well-formed
// tables the model emits without the outer pipes (e.g. "List-I | List-II"
// with no leading/trailing `|` at all).
function isTableRow(line) {
  return line.includes("|");
}

function isSeparatorRow(line) {
  const trimmed = line.trim();
  if (!trimmed.includes("|") || !trimmed.includes("-")) return false;
  return /^[\s|:-]+$/.test(trimmed);
}

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

