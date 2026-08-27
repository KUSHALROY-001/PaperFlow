import { useMemo } from "react";
import katex from "katex";

// Recognizes the four conventional math-delimiter styles, display forms
// first so `$$...$$` is never swallowed by the single-`$` branch matching
// its own inner `$...$`. The single-`$` branch excludes newlines
// deliberately - an unpaired `$` used as a currency sign inside a longer
// passage (common in these exam questions - "costs $50") must never eat
// everything up to the next `$` several lines later; a real inline math
// span is expected to stay on one line.
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
  // Only the single-`$` form is left by elimination.
  return { expr: token.slice(1, -1), displayMode: false };
}

function renderMath(expr, displayMode) {
  try {
    // throwOnError: false means a malformed expression renders KaTeX's own
    // red error markup for just that one span instead of throwing - a bad
    // extraction shouldn't blank out the rest of an otherwise-fine
    // question, and the visible red text doubles as a signal to a
    // reviewer that this particular question needs a manual fix.
    return katex.renderToString(expr, {
      throwOnError: false,
      displayMode,
      strict: "ignore",
    });
  } catch {
    // renderToString with throwOnError:false already recovers from almost
    // everything internally; this only catches the rare case where KaTeX
    // itself throws synchronously. Falling back to the raw delimited
    // source (rather than blanking the span) keeps the text legible even
    // when it doesn't render as math.
    return expr;
  }
}

// Splitting with a single-capturing-group global regex interleaves the
// plain runs and the matches: [plain, match, plain, match, ...] - so match
// tokens always land on odd indices. That's cheaper and less error-prone
// than re-testing each token against MATH_TOKEN_RE (which carries /g state
// that's easy to get wrong across repeated .test() calls).
function renderMathNodes(text, keyPrefix) {
  if (!text) return null;
  return String(text)
    .split(MATH_TOKEN_RE)
    .map((segment, index) => {
      if (!segment) return null;
      if (index % 2 === 0) {
        return segment;
      }
      const { expr, displayMode } = stripDelimiters(segment);
      const html = renderMath(expr, displayMode);
      return (
        <span
          // eslint-disable-next-line react/no-danger
          key={`${keyPrefix}-math-${index}`}
          className={
            displayMode
              ? "block my-2 max-w-full overflow-x-auto scrollbar-hidden"
              : undefined
          }
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    });
}

const INLINE_MARKERS = [
  { opening: "***", closing: "***", Tags: ["strong", "em"] },
  { opening: "**", closing: "**", Tag: "strong" },
  { opening: "~~", closing: "~~", Tag: "s" },
  { opening: "<u>", closing: "</u>", Tag: "u" },
  { opening: "*", closing: "*", Tag: "em" },
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
  const positions = INLINE_MARKERS.map(({ opening }) =>
    text.indexOf(opening, start),
  ).filter((position) => position !== -1);
  return positions.length ? Math.min(...positions) : -1;
}

function renderInlineNodes(text, keyPrefix) {
  if (!text) return null;

  const source = String(text);
  const nodes = [];
  let cursor = 0;
  let nodeIndex = 0;

  while (cursor < source.length) {
    const marker = INLINE_MARKERS.find(({ opening }) =>
      source.startsWith(opening, cursor),
    );

    if (!marker) {
      const nextStyleStart = findNextStyleStart(source, cursor + 1);
      const plainEnd = nextStyleStart === -1 ? source.length : nextStyleStart;
      nodes.push(
        ...renderMathNodes(
          source.slice(cursor, plainEnd),
          `${keyPrefix}-plain-${nodeIndex}`,
        ),
      );
      nodeIndex += 1;
      cursor = plainEnd;
      continue;
    }

    const contentStart = cursor + marker.opening.length;
    const closeAt =
      marker.opening === "*"
        ? findItalicClosingMarker(source, contentStart)
        : source.indexOf(marker.closing, contentStart);

    if (closeAt === -1) {
      nodes.push(
        ...renderMathNodes(marker.opening, `${keyPrefix}-literal-${nodeIndex}`),
      );
      nodeIndex += 1;
      cursor = contentStart;
      continue;
    }

    const children = renderInlineNodes(
      source.slice(contentStart, closeAt),
      `${keyPrefix}-nested-${nodeIndex}`,
    );
    const styledNode = (marker.Tags || [marker.Tag]).reduceRight(
      (content, Tag) => <Tag>{content}</Tag>,
      children,
    );
    nodes.push(
      <span key={`${keyPrefix}-style-${nodeIndex}`}>{styledNode}</span>,
    );
    nodeIndex += 1;
    cursor = closeAt + marker.closing.length;
  }

  return nodes;
}

// Drop-in replacement for rendering a plain string that may contain LaTeX
// math delimited with $...$, $$...$$, \(...\) or \[...\]. Plain runs pass
// through untouched (so this is always safe to reach for, even on text
// that turns out to have no math in it at all - the common case for most
// options). Renders as an inline <span> so it composes inside whatever
// element the caller already had (a <p>, a <button>, an option <div>) -
// white-space handling (e.g. whitespace-pre-wrap on a parent) is inherited
// from that caller rather than reapplied here.
export default function MathText({ text, className }) {
  const nodes = useMemo(() => renderInlineNodes(text, "inline"), [text]);
  return <span className={className}>{nodes}</span>;
}
