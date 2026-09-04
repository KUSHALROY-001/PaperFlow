import katex from "katex";

// Mirrors frontend/src/components/shared/MathText.jsx's MATH_TOKEN_RE and
// stripDelimiters EXACTLY - same delimiter set, same precedence (display
// forms before the single-$ branch, same newline exclusion on single-$ so
// a currency "$50" mid-passage can never swallow to the next $ several
// lines later), PLUS the same image-marker syntax (migration 038 -
// ![[img:slot_key]]). Duplicated rather than imported for the same reason
// latexToPdfText.js duplicates it too (see that file's header): this is
// small, stable parsing logic, and frontend/backend can't share a module
// across the bundler boundary here. Keep both in sync if the delimiter
// set (or the marker syntax) ever changes.
const MATH_TOKEN_RE =
  /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^\n$]+?\$|\\\([\s\S]+?\\\)|!\[\[img:[a-z0-9][a-z0-9-]{0,63}\]\])/g;

const IMAGE_MARKER_RE = /^!\[\[img:([a-z0-9][a-z0-9-]{0,63})\]\]$/;

function stripDelimiters(token) {
  if (token.startsWith("$$") && token.endsWith("$$")) {
    return { expr: token.slice(2, -2), displayMode: true };
  }
  if (token.startsWith(String.raw`\[`) && token.endsWith(String.raw`\]`)) {
    return { expr: token.slice(2, -2), displayMode: true };
  }
  if (token.startsWith(String.raw`\(`) && token.endsWith(String.raw`\)`)) {
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
// HTML, and every ![[img:slot_key]] marker with an <img> tag (images:
// {slotKey: absoluteUrl} - already baseUrl-prefixed by the caller, see
// render-html.js#buildDiagramAssetsMap, so this module stays baseUrl-
// agnostic exactly like its diagramHtml sibling for the default slot);
// every remaining non-math, non-image segment is HTML-escaped. Returns a
// string safe to concatenate directly into the page template. Safe on any
// string, including one with no math or images in it at all.
function renderMathText(text, images) {
  return String(text)
    .split(MATH_TOKEN_RE)
    .map((segment, index) => {
      if (!segment) return "";
      if (index % 2 === 0) {
        return escapeHtml(segment);
      }

      const imageMatch = segment.match(IMAGE_MARKER_RE);
      if (imageMatch) {
        const url = images?.[imageMatch[1]];
        if (!url) {
          // Same "labeled placeholder, not raw marker syntax or silent
          // nothing" stance as MathText.jsx's own unresolved-marker
          // branch - a downloaded PDF with a genuinely missing image
          // should say so, not show "![[img:...]]" as literal text or a
          // confusing blank gap.
          return `<span class="missing-image">Missing image</span>`;
        }
        return `<img class="inline-diagram" src="${escapeHtml(url)}" alt="" />`;
      }

      const { expr, displayMode } = stripDelimiters(segment);
      const html = renderMath(expr, displayMode);
      return displayMode ? `<span class="math-display">${html}</span>` : html;
    })
    .join("");
}

const INLINE_MARKERS = [
  { opening: "***", closing: "***", wrap: (content) => `<strong><em>${content}</em></strong>` },
  { opening: "**", closing: "**", wrap: (content) => `<strong>${content}</strong>` },
  { opening: "~~", closing: "~~", wrap: (content) => `<s>${content}</s>` },
  { opening: "<u>", closing: "</u>", wrap: (content) => `<u>${content}</u>` },
  { opening: "*", closing: "*", wrap: (content) => `<em>${content}</em>` },
];

function findItalicClosingMarker(text, start) {
  for (let index = start; index < text.length; index += 1) {
    if (text[index] !== "*") continue;
    if (text[index - 1] === "*" || text[index + 1] === "*") continue;
    return index;
  }

  return -1;
}

function findNextStyleStart(text, start) {
  const positions = INLINE_MARKERS
    .map(({ opening }) => text.indexOf(opening, start))
    .filter((position) => position !== -1);
  return positions.length ? Math.min(...positions) : -1;
}

function renderStyledText(text, images) {
  const source = String(text);
  let html = "";
  let cursor = 0;

  while (cursor < source.length) {
    const marker = INLINE_MARKERS.find(({ opening }) => source.startsWith(opening, cursor));

    if (!marker) {
      const nextStyleStart = findNextStyleStart(source, cursor + 1);
      const plainEnd = nextStyleStart === -1 ? source.length : nextStyleStart;
      html += renderMathText(source.slice(cursor, plainEnd), images);
      cursor = plainEnd;
      continue;
    }

    const contentStart = cursor + marker.opening.length;
    const closeAt = marker.opening === "*"
      ? findItalicClosingMarker(source, contentStart)
      : source.indexOf(marker.closing, contentStart);

    if (closeAt === -1) {
      html += renderMathText(marker.opening, images);
      cursor = contentStart;
      continue;
    }

    html += marker.wrap(renderStyledText(source.slice(contentStart, closeAt), images));
    cursor = closeAt + marker.closing.length;
  }

  return html;
}

// Public entry point - the server-rendered equivalent of MathText.jsx.
// It safely supports the question editor's bold, italic, underline and
// strikethrough markers in addition to KaTeX spans and ![[img:slot_key]]
// image markers, so downloaded PDFs reproduce the same rendering as the
// review UI. images (optional): {slotKey: absoluteUrl} - omit entirely for
// content that's never going to have a marker in it (there's none today,
// but nothing here requires it either; a marker with no images map just
// falls through to the same "Missing image" placeholder as one with a
// map that doesn't contain that particular slot).
export function renderTextWithMath(text, images) {
  if (!text) return "";
  // Convert literal backslash+n sequences to real newlines so an option
  // containing "\\n" (from pasted content or OCR) renders correctly
  // in the PDF rather than showing the two-character escape sequence.
  const normalized = String(text).replace(/\\n/g, "\n");
  return renderStyledText(normalized, images);
}
