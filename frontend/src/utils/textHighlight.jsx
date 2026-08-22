// Turns raw question/explanation text into React nodes for the
// "Formatted" view's overlay layer - see FormattedTextEditor.jsx for how
// this is used (a transparent, fully-functional <textarea> sits on top
// of this, so typing/cursor/selection are 100% native and safe; this is
// purely a decorative backdrop drawn behind it).
//
// THE ONE RULE THIS MUST NEVER BREAK: every character of the input
// appears in the output, in the same order, none added or removed -
// this only ever wraps substrings in styled <span>s, it never strips a
// delimiter or substitutes rendered output for source text (that's
// exactly what the read-only MathText.jsx/CodeText.jsx renderers do
// instead, and is NOT safe to reuse here). The overlay and the
// invisible textarea underneath it stay pixel-aligned for free, with no
// scroll/width syncing logic beyond matching CSS, ONLY because they
// always render the exact same characters - the moment this substitutes
// "**bold**" for "bold" or "$x$" for a KaTeX equation, the two layers
// go out of sync and the visible cursor position stops matching what's
// visually under it.
//
// Because of that rule, this can't show a genuinely rendered KaTeX
// equation (different length/shape from its LaTeX source) - $...$ math
// gets a distinguishing monospace/tinted treatment with its delimiters
// dimmed, not a rendered formula. Full inline-rendered math while
// actively typing is the harder problem a real editor framework (not a
// hand-rolled contentEditable) would be needed for - see the PR
// discussion this file's comment history came out of.
const MATH_TOKEN_RE =
  /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^\n$]+?\$|\\\([\s\S]+?\\\))/g;

const CODE_FENCE_RE = /(```\w*\n[\s\S]*?```)/g;

const INLINE_MARKERS = [
  { open: "***", close: "***", className: "font-bold italic" },
  { open: "**", close: "**", className: "font-bold" },
  { open: "~~", close: "~~", className: "line-through" },
  { open: "<u>", close: "</u>", className: "underline" },
  { open: "*", close: "*", className: "italic" },
];

function findClosing(text, start, open, close) {
  if (open === "*") {
    // Mirrors MathText.jsx's italic-closing rule: a "*" only closes when
    // it isn't itself part of a "**"/"***" run.
    for (let i = start; i < text.length; i += 1) {
      if (text[i] !== "*") continue;
      if (text[i - 1] === "*" || text[i + 1] === "*") continue;
      return i;
    }
    return -1;
  }
  return text.indexOf(close, start);
}

function highlightMathSegment(segment, keyPrefix) {
  if (!segment) return null;
  return segment.split(MATH_TOKEN_RE).map((chunk, index) => {
    if (!chunk) return null;
    if (index % 2 === 0) return chunk;
    return (
      <span
        key={`${keyPrefix}-math-${index}`}
        className="text-sky-600 dark:text-sky-400 font-mono"
      >
        {chunk}
      </span>
    );
  });
}

// Plain (non-math) text still needs bold/italic/underline/strikethrough
// markers highlighted - this walks it looking for the nearest marker at
// each position, exactly like MathText.jsx's renderInlineNodes does for
// the read-only render, but keeping every delimiter character in the
// output (dimmed) instead of stripping it.
function highlightInline(text, keyPrefix) {
  if (!text) return null;

  const nodes = [];
  let cursor = 0;
  let nodeIndex = 0;

  while (cursor < text.length) {
    const marker = INLINE_MARKERS.find(({ open }) =>
      text.startsWith(open, cursor),
    );

    if (!marker) {
      const nextOpen = INLINE_MARKERS.map(({ open }) =>
        text.indexOf(open, cursor + 1),
      ).filter((pos) => pos !== -1);
      const plainEnd = nextOpen.length ? Math.min(...nextOpen) : text.length;
      nodes.push(
        ...(highlightMathSegment(
          text.slice(cursor, plainEnd),
          `${keyPrefix}-plain-${nodeIndex}`,
        ) || []),
      );
      nodeIndex += 1;
      cursor = plainEnd;
      continue;
    }

    const contentStart = cursor + marker.open.length;
    const closeAt = findClosing(text, contentStart, marker.open, marker.close);

    if (closeAt === -1) {
      // Unclosed marker - keep the literal characters, don't style them
      // as if they were a complete pair (matches MathText.jsx's fallback).
      nodes.push(marker.open);
      cursor = contentStart;
      continue;
    }

    const inner = text.slice(contentStart, closeAt);
    nodes.push(
      <span key={`${keyPrefix}-marker-open-${nodeIndex}`} className="opacity-40">
        {marker.open}
      </span>,
      <span key={`${keyPrefix}-styled-${nodeIndex}`} className={marker.className}>
        {highlightInline(inner, `${keyPrefix}-nested-${nodeIndex}`)}
      </span>,
      <span key={`${keyPrefix}-marker-close-${nodeIndex}`} className="opacity-40">
        {marker.close}
      </span>,
    );
    nodeIndex += 1;
    cursor = closeAt + marker.close.length;
  }

  return nodes;
}

function highlightCodeFence(fence, keyPrefix) {
  const match = /^```(\w*)\n([\s\S]*?)```$/.exec(fence);
  if (!match) return fence;
  const [, lang, body] = match;
  return (
    <span key={keyPrefix}>
      <span className="opacity-40">{"```"}{lang}{"\n"}</span>
      <span className="font-mono text-orange-600 dark:text-orange-400">
        {body}
      </span>
      <span className="opacity-40">{"```"}</span>
    </span>
  );
}

export function buildHighlightNodes(text) {
  const str = String(text ?? "");
  if (!str) return null;

  return str.split(CODE_FENCE_RE).map((part, index) => {
    if (!part) return null;
    // split() with a single capturing group interleaves [plain, fence,
    // plain, fence, ...] - fences land on odd indices, same trick
    // MathText.jsx uses for its own token splitting.
    if (index % 2 === 1) {
      return highlightCodeFence(part, `fence-${index}`);
    }
    return highlightInline(part, `text-${index}`);
  });
}
