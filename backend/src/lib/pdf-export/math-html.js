import katex from "katex";

// Mirrors frontend/src/components/shared/MathText.jsx's MATH_TOKEN_RE and
// stripDelimiters EXACTLY - same delimiter set, same precedence (display
// forms before the single-$ branch, same newline exclusion on single-$ so
// a currency "$50" mid-passage can never swallow to the next $ several
// lines later). Duplicated rather than imported for the same reason
// latexToPdfText.js duplicates it too (see that file's header): this is
// small, stable parsing logic, and frontend/backend can't share a module
// across the bundler boundary here. Keep both in sync if the delimiter
// set ever changes.
const MATH_TOKEN_RE =
  /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^\n$]+?\$|\\\([\s\S]+?\\\))/g;

function stripDelimiters(token) {
  if (token.startsWith("$$") && token.endsWith("$$")) {
    return { expr: token.slice(2, -2), displayMode: true };
  }
  if (token.startsWith("\\[") && token.endsWith("\\]")) {
    return { expr: token.slice(2, -2), displayMode: true };
  }
  if (token.startsWith("\\(") && token.endsWith("\\)")) {
    return { expr: token.slice(2, -2), displayMode: false };
  }
  return { expr: token.slice(1, -1), displayMode: false };
}

function renderMath(expr, displayMode) {
  try {
    // Same options as MathText.jsx's katex.renderToString call - in
    // particular throwOnError: false, so a malformed expression renders
    // KaTeX's own red error markup for just that one span rather than
    // failing the whole PDF export over one bad extraction.
    return katex.renderToString(expr, {
      throwOnError: false,
      displayMode,
      strict: "ignore",
    });
  } catch {
    return escapeHtml(expr);
  }
}

// react auto-escapes plain text nodes; a server-built HTML string has no
// such safety net, so every plain (non-math) segment MUST go through
// this before being concatenated into the document. Question text is
// AI-extracted or user-edited free text, not trusted HTML - skipping this
// would let it break out of its own <p> tag or (worse) execute inside the
// headless page that's about to run katex's OWN script-free renderToString
// output anyway, so there's no legitimate reason for raw HTML to appear
// here at all.
export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Public entry point - the server-rendered equivalent of MathText.jsx.
// Finds every math span in `text` and replaces it with KaTeX's rendered
// HTML; every non-math segment is HTML-escaped. Returns a string safe to
// concatenate directly into the page template. Safe on any string,
// including one with no math in it at all.
export function renderTextWithMath(text) {
  if (!text) return "";
  // Convert literal backslash+n sequences to real newlines so an option
  // containing "\\n" (from pasted content or OCR) renders correctly
  // in the PDF rather than showing the two-character escape sequence.
  const normalized = String(text).replace(/\\n/g, "\n");
  return normalized
    .split(MATH_TOKEN_RE)
    .map((segment, index) => {
      if (!segment) return "";
      if (index % 2 === 0) {
        return escapeHtml(segment);
      }
      const { expr, displayMode } = stripDelimiters(segment);
      const html = renderMath(expr, displayMode);
      return displayMode ? `<span class="math-display">${html}</span>` : html;
    })
    .join("");
}
